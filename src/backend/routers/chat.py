from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.chat_agent import ChatAgent

router = APIRouter()
_agent = ChatAgent()


class ChatRequest(BaseModel):
    message: str


@router.post("/send")
async def chat_send(req: ChatRequest):
    response = await _agent.send(req.message)
    return {"response": response, "history": _agent.history}


@router.get("/history")
async def chat_history():
    return {"history": _agent.history}
