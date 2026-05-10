import asyncio
import json
import re
from backend.models.textbook import TextbookInfo
from backend.models.knowledge import KnowledgeNode, KnowledgeEdge, KnowledgeGraph
from backend.services.llm_client import chat_completion

EXTRACT_SYSTEM_PROMPT = """你是一个医学知识提取专家。从给定的教材内容中提取知识点和它们之间的关系。

要求：
1. 每个知识点应是一个独立的、可被查询的知识单元
2. 知识点分类：核心概念、解剖结构、生理过程、病理变化、临床表现、诊断方法、治疗原则
3. 关系类型：prerequisite（前置依赖）、parallel（并列）、contains（包含）、applies_to（应用）
4. 每个小节提取 10-15 个知识点
5. 每个节点必须包含 confidence 字段（0-1 之间的浮点数），表示你对该知识点提取准确性的置信度

示例：
输入文本："炎症是具有血管系统的活体组织对损伤因子所发生的防御性反应。炎症的基本病理变化包括变质、渗出和增生。"
输出：
{
  "nodes": [
    {"name": "炎症", "definition": "具有血管系统的活体组织对损伤因子所发生的防御性反应", "category": "核心概念", "confidence": 0.95},
    {"name": "变质", "definition": "炎症局部组织细胞的变性和坏死", "category": "病理变化", "confidence": 0.9},
    {"name": "渗出", "definition": "炎症局部血管内的液体和细胞成分通过血管壁进入组织间隙", "category": "病理变化", "confidence": 0.9},
    {"name": "增生", "definition": "炎症局部细胞的增殖", "category": "病理变化", "confidence": 0.85}
  ],
  "edges": [
    {"source_name": "炎症", "target_name": "变质", "relation_type": "contains", "description": "炎症包含变质这一基本病理变化"}
  ]
}

输出严格 JSON 格式：
{
  "nodes": [
    {"name": "知识点名称", "definition": "简明定义（50-100字）", "category": "分类", "confidence": 0.9}
  ],
  "edges": [
    {"source_name": "源知识点名称", "target_name": "目标知识点名称", "relation_type": "prerequisite", "description": "关系描述"}
  ]
}"""


async def extract_from_textbook(textbook: TextbookInfo) -> KnowledgeGraph:
    all_nodes: list[KnowledgeNode] = []
    all_edges: list[KnowledgeEdge] = []

    # Level 1: parallel extraction per section within each chapter
    for ch_idx, chapter in enumerate(textbook.chapters):
        sections = _split_into_sections(chapter.content)
        valid_sections = [(i, s) for i, s in enumerate(sections) if len(s.strip()) >= 100]

        # All sections in this chapter extracted concurrently
        tasks = [_extract_from_section(s, textbook, chapter) for _, s in valid_sections]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        section_nodes_map: dict[int, list[KnowledgeNode]] = {}
        for (sec_idx, _), result in zip(valid_sections, results):
            if isinstance(result, Exception):
                continue
            sec_nodes = []
            for n in result.get("nodes", []):
                node = KnowledgeNode(
                    id=f"{textbook.textbook_id}_n{len(all_nodes) + 1:04d}",
                    name=n["name"],
                    definition=n["definition"],
                    category=n["category"],
                    chapter=chapter.title,
                    page=chapter.page_start,
                    textbook_id=textbook.textbook_id,
                    textbook_name=textbook.title,
                    confidence=float(n.get("confidence", 0.8)),
                )
                all_nodes.append(node)
                sec_nodes.append(node)
            section_nodes_map[sec_idx] = sec_nodes

            for e in result.get("edges", []):
                src = _find_node_by_name(e["source_name"], sec_nodes)
                tgt = _find_node_by_name(e["target_name"], sec_nodes)
                if src and tgt:
                    all_edges.append(KnowledgeEdge(
                        source=src.id, target=tgt.id,
                        relation_type=e["relation_type"],
                        description=e["description"],
                    ))

        # Level 2: cross-section relations (sliding window of 3)
        for sec_idx in range(1, len(section_nodes_map) - 1):
            window_nodes = []
            for w in range(max(0, sec_idx - 1), min(len(section_nodes_map), sec_idx + 2)):
                window_nodes.extend(section_nodes_map.get(w, []))

            if len(window_nodes) >= 4:
                cross_edges = await _extract_cross_relations(window_nodes)
                all_edges.extend(cross_edges)

    # Level 3: per-chapter far-distance relations
    # Each chapter compares its nodes against ALL other chapters' nodes in one call
    chapter_node_groups: dict[str, list[KnowledgeNode]] = {}
    for node in all_nodes:
        chapter_node_groups.setdefault(node.chapter, []).append(node)

    all_chapter_names = list(chapter_node_groups.keys())
    for ch_name in all_chapter_names:
        ch_nodes = chapter_node_groups[ch_name]
        other_nodes = [n for n in all_nodes if n.chapter != ch_name]
        if ch_nodes and other_nodes:
            far_edges = await _extract_far_relations(ch_nodes, other_nodes)
            all_edges.extend(far_edges)

    return KnowledgeGraph(
        textbook_id=textbook.textbook_id,
        nodes=all_nodes,
        edges=all_edges,
    )


def _split_into_sections(content: str) -> list[str]:
    section_pattern = re.compile(r'^第[一二三四五六七八九十百千\d]+节')
    sections = []
    current = []
    for line in content.split('\n'):
        if section_pattern.match(line.strip()):
            if current:
                sections.append('\n'.join(current))
                current = []
        current.append(line)
    if current:
        sections.append('\n'.join(current))
    return sections if sections else [content]


def _find_node_by_name(name: str, nodes: list[KnowledgeNode]) -> KnowledgeNode | None:
    for n in nodes:
        if n.name == name:
            return n
    return None


async def _extract_from_section(section: str, textbook, chapter) -> dict:
    prompt = f"教材：{textbook.title}\n章节：{chapter.title}\n\n内容：\n{section[:2000]}"
    try:
        resp = await chat_completion([
            {"role": "system", "content": EXTRACT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ])
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Extraction error: {e}")
    return {"nodes": [], "edges": []}


async def _extract_cross_relations(nodes: list[KnowledgeNode]) -> list[KnowledgeEdge]:
    names = [n.name for n in nodes]
    prompt = f"以下是同一章节不同小节的知识点名称：\n{json.dumps(names, ensure_ascii=False)}\n\n识别它们之间的跨节关系。"
    try:
        resp = await chat_completion([
            {"role": "system", "content": "识别知识点间的跨节关系。输出JSON：{\"edges\": [{\"source_name\": \"\", \"target_name\": \"\", \"relation_type\": \"\", \"description\": \"\"}]}"},
            {"role": "user", "content": prompt},
        ])
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            data = json.loads(json_match.group())
            edges = []
            for e in data.get("edges", []):
                src = _find_node_by_name(e["source_name"], nodes)
                tgt = _find_node_by_name(e["target_name"], nodes)
                if src and tgt:
                    edges.append(KnowledgeEdge(
                        source=src.id, target=tgt.id,
                        relation_type=e["relation_type"],
                        description=e["description"],
                    ))
            return edges
    except Exception:
        pass
    return []


async def _extract_far_relations(nodes_a: list[KnowledgeNode], nodes_b: list[KnowledgeNode]) -> list[KnowledgeEdge]:
    names_a = [n.name for n in nodes_a][:30]
    names_b = [n.name for n in nodes_b][:30]
    prompt = f"章节A知识点：{json.dumps(names_a, ensure_ascii=False)}\n章节B知识点：{json.dumps(names_b, ensure_ascii=False)}\n\n识别跨章节的远距离关系。"
    try:
        resp = await chat_completion([
            {"role": "system", "content": "识别跨章节关系。输出JSON：{\"edges\": [{\"source_name\": \"\", \"target_name\": \"\", \"relation_type\": \"\", \"description\": \"\"}]}"},
            {"role": "user", "content": prompt},
        ])
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            data = json.loads(json_match.group())
            all_nodes = nodes_a + nodes_b
            edges = []
            for e in data.get("edges", []):
                src = _find_node_by_name(e["source_name"], all_nodes)
                tgt = _find_node_by_name(e["target_name"], all_nodes)
                if src and tgt:
                    edges.append(KnowledgeEdge(
                        source=src.id, target=tgt.id,
                        relation_type=e["relation_type"],
                        description=e["description"],
                    ))
            return edges
    except Exception:
        pass
    return []
