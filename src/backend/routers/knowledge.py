from fastapi import APIRouter
from backend.models.knowledge import KnowledgeGraph
from backend.services.extractor_agent import extract_from_textbook
from backend.routers.textbooks import get_textbooks

router = APIRouter()
_graphs: dict[str, KnowledgeGraph] = {}


@router.post("/extract/{textbook_id}")
async def extract(textbook_id: str):
    textbooks = get_textbooks()
    if textbook_id not in textbooks:
        return {"error": "textbook not found"}

    graph = await extract_from_textbook(textbooks[textbook_id])
    _graphs[textbook_id] = graph

    return {
        "textbook_id": textbook_id,
        "nodes": len(graph.nodes),
        "edges": len(graph.edges),
    }


@router.get("/graph/{textbook_id}")
async def get_graph(textbook_id: str):
    if textbook_id in _graphs:
        g = _graphs[textbook_id]
        return {"nodes": [n.model_dump() for n in g.nodes], "edges": [e.model_dump() for e in g.edges]}
    return {"error": "graph not found"}


@router.get("/all")
async def get_all_graphs():
    result = {}
    for tid, g in _graphs.items():
        result[tid] = {"nodes": len(g.nodes), "edges": len(g.edges)}
    return result


def get_graphs() -> dict[str, KnowledgeGraph]:
    return _graphs
