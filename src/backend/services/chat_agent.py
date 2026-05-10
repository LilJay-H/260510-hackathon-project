import re
from backend.models.integration import IntegrationDecision
from backend.services.llm_client import chat_completion
from backend.services import integrator_agent


class ChatAgent:
    def __init__(self):
        self.history: list[dict] = []

    async def send(self, message: str) -> str:
        self.history.append({"role": "user", "content": message})

        intent = self._classify_intent(message)

        if intent["action"] == "explain_merge":
            response = self._explain_merge(intent["node_name"])
        elif intent["action"] == "explain_remove":
            response = self._explain_remove(intent["node_name"])
        elif intent["action"] == "keep_node":
            response = self._keep_node(intent["node_name"])
        elif intent["action"] == "remove_node":
            response = self._remove_node(intent["node_name"])
        elif intent["action"] == "split_nodes":
            response = self._split_nodes(intent["node_a"], intent["node_b"])
        elif intent["action"] == "merge_nodes":
            response = self._merge_nodes(intent["node_a"], intent["node_b"])
        elif intent["action"] == "query_status":
            response = self._query_status()
        else:
            response = await self._llm_fallback(message)

        self.history.append({"role": "assistant", "content": response})
        return response

    def _classify_intent(self, message: str) -> dict:
        if "为什么" in message and ("合并" in message or "合并" in message):
            node = self._extract_node_name(message)
            return {"action": "explain_merge", "node_name": node}
        if "为什么" in message and "删除" in message:
            node = self._extract_node_name(message)
            return {"action": "explain_remove", "node_name": node}
        if "保留" in message or "恢复" in message:
            node = self._extract_node_name(message)
            return {"action": "keep_node", "node_name": node}
        if "删除" in message and "为什么" not in message:
            node = self._extract_node_name(message)
            return {"action": "remove_node", "node_name": node}
        if "分开" in message or "拆分" in message:
            nodes = self._extract_two_nodes(message)
            return {"action": "split_nodes", "node_a": nodes[0], "node_b": nodes[1]}
        if "合并" in message and "为什么" not in message:
            nodes = self._extract_two_nodes(message)
            return {"action": "merge_nodes", "node_a": nodes[0], "node_b": nodes[1]}
        if "状态" in message or "统计" in message:
            return {"action": "query_status", "node_name": ""}
        return {"action": "unknown", "node_name": ""}

    def _extract_node_name(self, message: str) -> str:
        match = re.search(r'["“「](.+?)["”」]', message)
        if match:
            return match.group(1)
        match = re.search(r'["是了](.+?)["是了？]', message)
        if match:
            return match.group(1)
        return message

    def _extract_two_nodes(self, message: str) -> list[str]:
        match = re.search(r'["“「](.+?)["”」].*?["“「](.+?)["”」]', message)
        if match:
            return [match.group(1), match.group(2)]
        parts = re.split(r'和|与|跟', message)
        if len(parts) >= 2:
            return [p.strip().strip("？。！") for p in parts[:2]]
        return ["", ""]

    def _explain_merge(self, node_name: str) -> str:
        for d in integrator_agent._get_decision_log():
            if d.action == "merge":
                return f"关于「{node_name}」的合并决策：{d.reason}（置信度: {d.confidence:.0%}）"
        return f"未找到关于「{node_name}」的合并决策记录。"

    def _explain_remove(self, node_name: str) -> str:
        for d in integrator_agent._get_decision_log():
            if d.action == "remove" and node_name in str(d.affected_nodes):
                return f"关于「{node_name}」的删除决策：{d.reason}"
        return f"未找到关于「{node_name}」的删除决策记录。"

    def _keep_node(self, node_name: str) -> str:
        for d in integrator_agent._get_decision_log():
            if node_name in str(d.affected_nodes) and d.action in ("merge", "remove"):
                d.action = "keep"
                return f"已将「{node_name}」恢复为保留状态。图谱已更新。"
        return f"未找到需要恢复的「{node_name}」决策。"

    def _remove_node(self, node_name: str) -> str:
        integrator_agent._decision_log.append(IntegrationDecision(
            decision_id=f"remove_chat_{len(integrator_agent._decision_log):04d}",
            action="remove",
            affected_nodes=[node_name],
            reason="用户通过对话请求删除",
            confidence=1.0,
        ))
        return f"已将「{node_name}」标记为删除。图谱已更新。"

    def _split_nodes(self, node_a: str, node_b: str) -> str:
        for d in integrator_agent._get_decision_log():
            if d.action == "merge" and node_a in str(d.affected_nodes) and node_b in str(d.affected_nodes):
                d.action = "keep"
                return f"已将「{node_a}」和「{node_b}」拆分为两个独立知识点。图谱已更新。"
        return f"未找到「{node_a}」和「{node_b}」的合并记录，无需拆分。"

    def _merge_nodes(self, node_a: str, node_b: str) -> str:
        integrator_agent._decision_log.append(IntegrationDecision(
            decision_id=f"merge_chat_{len(integrator_agent._decision_log):04d}",
            action="merge",
            affected_nodes=[node_a, node_b],
            result_node=node_a,
            reason="用户通过对话请求合并",
            confidence=1.0,
        ))
        return f"已将「{node_a}」和「{node_b}」合并。图谱已更新。"

    def _query_status(self) -> str:
        log = integrator_agent._get_decision_log()
        merges = sum(1 for d in log if d.action == "merge")
        removes = sum(1 for d in log if d.action == "remove")
        keeps = sum(1 for d in log if d.action == "keep")
        return f"当前整合状态：{merges} 个合并决策，{removes} 个删除决策，{keeps} 个保留决策。"

    async def _llm_fallback(self, message: str) -> str:
        return await chat_completion([
            {"role": "system", "content": "你是医学知识整合助手。请简洁回答用户关于教材整合的问题。"},
            {"role": "user", "content": message},
        ])
