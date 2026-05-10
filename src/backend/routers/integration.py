from fastapi import APIRouter
from backend.services.integrator_agent import merge_graphs
from backend.routers.knowledge import get_graphs

router = APIRouter()
_merged_graph = None


@router.post("/merge")
async def merge():
    global _merged_graph
    graphs = list(get_graphs().values())
    if not graphs:
        return {"error": "no graphs to merge"}

    _merged_graph = await merge_graphs(graphs)

    return {
        "nodes": len(_merged_graph.nodes),
        "edges": len(_merged_graph.edges),
        "decisions": len(_merged_graph.decisions),
        "compression_ratio": _merged_graph.compression_ratio,
    }


@router.get("/merged")
async def get_merged():
    if _merged_graph:
        return {
            "nodes": [n.model_dump() for n in _merged_graph.nodes],
            "edges": [e.model_dump() for e in _merged_graph.edges],
            "compression_ratio": _merged_graph.compression_ratio,
        }
    return {"error": "no merged graph"}


@router.get("/decisions")
async def get_decisions():
    if _merged_graph:
        return [d.model_dump() for d in _merged_graph.decisions]
    return []


@router.post("/override")
async def override_decision(decision_id: str, action: str):
    if _merged_graph:
        for d in _merged_graph.decisions:
            if d.decision_id == decision_id:
                d.action = action
                return {"status": "updated", "decision_id": decision_id, "new_action": action}
    return {"error": "decision not found"}
