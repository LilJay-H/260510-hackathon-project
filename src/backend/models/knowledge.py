from pydantic import BaseModel


class KnowledgeNode(BaseModel):
    id: str
    name: str
    definition: str
    category: str
    chapter: str
    page: int
    textbook_id: str
    textbook_name: str
    chunk_id: str = ""
    confidence: float = 0.8


class KnowledgeEdge(BaseModel):
    source: str
    target: str
    relation_type: str  # prerequisite, parallel, contains, applies_to
    description: str


class KnowledgeGraph(BaseModel):
    textbook_id: str
    nodes: list[KnowledgeNode]
    edges: list[KnowledgeEdge]
