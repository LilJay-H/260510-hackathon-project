import httpx
from backend.config import LLM_BASE_URL, LLM_TEXT_MODEL, LLM_API_KEY


async def chat_completion(messages: list[dict], temperature: float = 0.3) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{LLM_BASE_URL}/chat/completions",
            headers={"Authorization": f"Bearer {LLM_API_KEY}"},
            json={
                "model": LLM_TEXT_MODEL,
                "messages": messages,
                "temperature": temperature,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
