import chromadb
from sentence_transformers import SentenceTransformer
from backend.config import EMBEDDING_MODEL, CHROMA_PERSIST_DIR
from backend.models.textbook import TextbookInfo

_model = None
_client = None
_collection = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        _collection = _client.get_or_create_collection(
            name="textbook_chunks",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def chunk_textbook(textbook: TextbookInfo, chunk_size: int = 600, overlap: int = 80) -> list[dict]:
    chunks = []
    for ch in textbook.chapters:
        content = ch.content
        start = 0
        chunk_idx = 0
        while start < len(content):
            end = start + chunk_size
            chunk_text = content[start:end]
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    "textbook_id": textbook.textbook_id,
                    "textbook_name": textbook.title,
                    "chapter_id": ch.chapter_id,
                    "chapter_title": ch.title,
                    "page": ch.page_start,
                    "chunk_index": chunk_idx,
                },
            })
            start += chunk_size - overlap
            chunk_idx += 1
    return chunks


def index_textbook(textbook: TextbookInfo) -> int:
    chunks = chunk_textbook(textbook)
    model = _get_model()
    collection = _get_collection()

    texts = [c["text"] for c in chunks]
    embeddings = model.encode(texts).tolist()

    ids = [f"{textbook.textbook_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [c["metadata"] for c in chunks]

    batch_size = 100
    for i in range(0, len(ids), batch_size):
        collection.upsert(
            ids=ids[i:i + batch_size],
            documents=texts[i:i + batch_size],
            embeddings=embeddings[i:i + batch_size],
            metadatas=metadatas[i:i + batch_size],
        )

    return len(chunks)


def query_rag(question: str, top_k: int = 5) -> list[dict]:
    model = _get_model()
    collection = _get_collection()

    q_embedding = model.encode([question]).tolist()
    results = collection.query(
        query_embeddings=q_embedding,
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    hits = []
    for i in range(len(results["ids"][0])):
        hits.append({
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "score": 1 - results["distances"][0][i],
        })
    return hits


def delete_textbook_chunks(textbook_id: str):
    collection = _get_collection()
    results = collection.get(where={"textbook_id": textbook_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
