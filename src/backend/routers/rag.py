from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.rag_agent import query_rag
from backend.services.llm_client import chat_completion

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
async def rag_query(req: QueryRequest):
    hits = query_rag(req.question, top_k=5)

    if not hits:
        return {"answer": "当前知识库中未找到相关信息。", "citations": [], "source_chunks": []}

    context = "\n\n".join([h["text"] for h in hits])
    citations = [
        {
            "textbook": h["metadata"].get("textbook_name", ""),
            "chapter": h["metadata"].get("chapter_title", ""),
            "page": h["metadata"].get("page", 0),
            "relevance_score": round(h["score"], 3),
        }
        for h in hits
    ]

    answer = await chat_completion([
        {"role": "system", "content": "你是医学知识问答助手。基于提供的上下文回答问题，每个回答附带来源引用。找不到答案时说'当前知识库中未找到相关信息'。"},
        {"role": "user", "content": f"上下文：\n{context}\n\n问题：{req.question}"},
    ])

    return {
        "answer": answer,
        "citations": citations,
        "source_chunks": [h["text"][:200] for h in hits],
    }


@router.get("/status")
async def rag_status():
    from backend.services.rag_agent import _get_collection, _bm25_index
    try:
        collection = _get_collection()
        count = collection.count()
    except Exception:
        count = 0
    return {
        "status": "ready",
        "indexed_chunks": count,
        "bm25_ready": _bm25_index is not None,
    }
