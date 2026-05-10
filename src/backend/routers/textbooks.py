from fastapi import APIRouter, UploadFile, File
from pathlib import Path
from backend.config import UPLOAD_DIR
from backend.services.parser_agent import parse_textbook
from backend.services.rag_agent import index_textbook as rag_index
from backend.models.textbook import TextbookInfo

router = APIRouter()
_textbooks: dict[str, TextbookInfo] = {}


@router.post("/upload")
async def upload_textbook(file: UploadFile = File(...)):
    upload_dir = Path(UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename
    with open(file_path, "wb") as f:
        f.write(await file.read())

    textbook = parse_textbook(str(file_path))
    _textbooks[textbook.textbook_id] = textbook

    return {
        "id": textbook.textbook_id,
        "title": textbook.title,
        "chapters": len(textbook.chapters),
        "total_chars": textbook.total_chars,
    }


@router.get("/list")
async def list_textbooks():
    return [
        {"id": t.textbook_id, "title": t.title, "chapters": len(t.chapters), "total_chars": t.total_chars}
        for t in _textbooks.values()
    ]


@router.get("/{textbook_id}")
async def get_textbook(textbook_id: str):
    if textbook_id in _textbooks:
        t = _textbooks[textbook_id]
        return {"id": t.textbook_id, "title": t.title, "chapters": len(t.chapters), "total_chars": t.total_chars}
    return {"error": "not found"}


@router.post("/{textbook_id}/index")
async def index_textbook_endpoint(textbook_id: str):
    if textbook_id not in _textbooks:
        return {"error": "textbook not found"}
    count = rag_index(_textbooks[textbook_id])
    return {"indexed_chunks": count}


def get_textbooks() -> dict[str, TextbookInfo]:
    return _textbooks
