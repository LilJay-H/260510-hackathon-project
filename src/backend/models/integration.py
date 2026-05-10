from pydantic import BaseModel


class IntegrationDecision(BaseModel):
    decision_id: str
    action: str  # merge, keep, remove
    affected_nodes: list[str]
    result_node: str | None = None
    reason: str
    confidence: float


class MergedKnowledgeGraph(BaseModel):
    nodes: list  # list of KnowledgeNode
    edges: list  # list of KnowledgeEdge
    decisions: list[IntegrationDecision]
    original_chars: int
    merged_chars: int
    compression_ratio: float
