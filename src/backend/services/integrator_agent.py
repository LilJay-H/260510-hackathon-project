import json
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from backend.config import EMBEDDING_MODEL
from backend.models.knowledge import KnowledgeNode, KnowledgeEdge, KnowledgeGraph
from backend.models.integration import IntegrationDecision, MergedKnowledgeGraph
from backend.services.llm_client import chat_completion

_model = None
_decision_log: list[IntegrationDecision] = []


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _get_decision_log() -> list[IntegrationDecision]:
    return _decision_log


async def merge_graphs(graphs: list[KnowledgeGraph]) -> MergedKnowledgeGraph:
    global _decision_log
    _decision_log = []

    all_nodes = []
    for g in graphs:
        all_nodes.extend(g.nodes)

    all_edges = []
    for g in graphs:
        all_edges.extend(g.edges)

    candidates = _embedding_screening(all_nodes, threshold=0.70)
    decisions = await _llm_judge(candidates, all_nodes)
    _decision_log.extend(decisions)

    merged_nodes, merged_edges, removed_ids = _apply_decisions(all_nodes, all_edges, decisions)

    id_mapping = {}
    for d in decisions:
        if d.action == "merge" and d.result_node:
            for affected_id in d.affected_nodes:
                id_mapping[affected_id] = d.result_node

    for edge in merged_edges:
        if edge.source in id_mapping:
            edge.source = id_mapping[edge.source]
        if edge.target in id_mapping:
            edge.target = id_mapping[edge.target]

    merged_edges = [e for e in merged_edges if e.source not in removed_ids and e.target not in removed_ids]

    original_total = sum(len(getattr(n, 'definition', '')) for n in all_nodes)
    merged_total = sum(len(getattr(n, 'definition', '')) for n in merged_nodes)
    ratio = merged_total / original_total if original_total > 0 else 1.0

    return MergedKnowledgeGraph(
        nodes=merged_nodes,
        edges=merged_edges,
        decisions=decisions,
        original_chars=original_total,
        merged_chars=merged_total,
        compression_ratio=ratio,
    )


def _embedding_screening(nodes: list[KnowledgeNode], threshold: float = 0.70) -> list[tuple[str, str, float]]:
    model = _get_model()

    texts = [f"{n.name} {n.definition}" for n in nodes]
    embeddings = model.encode(texts)

    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / norms

    sim_matrix = embeddings @ embeddings.T

    candidates = []
    seen = set()
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if sim_matrix[i][j] >= threshold:
                pair = tuple(sorted([nodes[i].id, nodes[j].id]))
                if pair not in seen:
                    seen.add(pair)
                    candidates.append((nodes[i].id, nodes[j].id, float(sim_matrix[i][j])))

    return candidates


async def _llm_judge(candidates: list[tuple[str, str, float]], all_nodes: list[KnowledgeNode]) -> list[IntegrationDecision]:
    node_map = {n.id: n for n in all_nodes}
    decisions = []

    batch_size = 5
    for batch_start in range(0, len(candidates), batch_size):
        batch = candidates[batch_start:batch_start + batch_size]

        pairs_desc = []
        for id_a, id_b, score in batch:
            n_a = node_map.get(id_a)
            n_b = node_map.get(id_b)
            if n_a and n_b:
                pairs_desc.append(
                    f"候选对: A=\"{n_a.name}\"({n_a.textbook_name}, {n_a.category}) vs B=\"{n_b.name}\"({n_b.textbook_name}, {n_b.category}), 相似度={score:.2f}\n  A定义: {n_a.definition[:100]}\n  B定义: {n_b.definition[:100]}"
                )

        if not pairs_desc:
            continue

        prompt = f"""判断以下知识点候选对是否应合并：

{chr(10).join(pairs_desc)}

输出JSON格式：
{{
  "decisions": [
    {{
      "pair": ["A的name", "B的name"],
      "action": "merge/keep",
      "keep_version": "A/B",
      "reason": "理由",
      "confidence": 0.9
    }}
  ]
}}"""

        try:
            resp = await chat_completion([
                {"role": "system", "content": "你是医学知识整合专家。判断两个知识点是否应合并为一个。merge=合并, keep=保持独立。"},
                {"role": "user", "content": prompt},
            ])
            json_match = re.search(r'\{[\s\S]*\}', resp)
            if json_match:
                data = json.loads(json_match.group())
                for d in data.get("decisions", []):
                    for cand_id_a, cand_id_b, _ in batch:
                        n_a = node_map.get(cand_id_a)
                        n_b = node_map.get(cand_id_b)
                        if n_a and n_b and n_a.name == d["pair"][0] and n_b.name == d["pair"][1]:
                            if d["action"] == "merge":
                                keep_id = cand_id_a if d.get("keep_version") == "A" else cand_id_b
                                decisions.append(IntegrationDecision(
                                    decision_id=f"merge_{len(decisions):04d}",
                                    action="merge",
                                    affected_nodes=[cand_id_a, cand_id_b],
                                    result_node=keep_id,
                                    reason=d.get("reason", ""),
                                    confidence=d.get("confidence", 0.8),
                                ))
                            else:
                                decisions.append(IntegrationDecision(
                                    decision_id=f"keep_{len(decisions):04d}",
                                    action="keep",
                                    affected_nodes=[cand_id_a, cand_id_b],
                                    reason=d.get("reason", "保持独立"),
                                    confidence=d.get("confidence", 0.8),
                                ))
                            break
        except Exception as e:
            print(f"LLM judge error: {e}")

    return decisions


def _apply_decisions(nodes, edges, decisions) -> tuple[list, list, set]:
    removed_ids = set()
    for d in decisions:
        if d.action == "merge":
            for node_id in d.affected_nodes:
                if node_id != d.result_node:
                    removed_ids.add(node_id)

    merged_nodes = [n for n in nodes if n.id not in removed_ids]
    return merged_nodes, list(edges), removed_ids
