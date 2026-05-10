import chromadb
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
from backend.config import EMBEDDING_MODEL, CHROMA_PERSIST_DIR
from backend.models.textbook import TextbookInfo

_model = None
_client = None
_collection = None
_bm25_index = None
_bm25_corpus = None
_bm25_metadatas = None


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


def _build_bm25_index(texts: list[str], metadatas: list[dict]):
    global _bm25_index, _bm25_corpus, _bm25_metadatas
    tokenized = [list(t) for t in texts]  # char-level tokenization for Chinese
    _bm25_index = BM25Okapi(tokenized)
    _bm25_corpus = texts
    _bm25_metadatas = metadatas


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

    # Build BM25 index from all indexed chunks
    all_docs = collection.get(include=["documents", "metadatas"])
    if all_docs["documents"]:
        _build_bm25_index(all_docs["documents"], all_docs["metadatas"])

    return len(chunks)


def _rrf_fusion(vector_results: list[dict], bm25_results: list[dict], top_k: int = 5) -> list[dict]:
    """Reciprocal Rank Fusion to merge vector and BM25 results."""
    scores: dict[str, float] = {}
    doc_map: dict[str, dict] = {}

    k = 60  # RRF constant
    for rank, hit in enumerate(vector_results):
        key = hit["text"][:100]
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        doc_map[key] = hit

    for rank, hit in enumerate(bm25_results):
        key = hit["text"][:100]
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        if key not in doc_map:
            doc_map[key] = hit

    sorted_keys = sorted(scores.keys(), key=lambda k: scores[k], reverse=True)
    return [doc_map[k] for k in sorted_keys[:top_k]]


def query_rag(question: str, top_k: int = 5) -> list[dict]:
    model = _get_model()
    collection = _get_collection()

    # Vector search
    q_embedding = model.encode([question]).tolist()
    vec_results = collection.query(
        query_embeddings=q_embedding,
        n_results=top_k * 2,
        include=["documents", "metadatas", "distances"],
    )

    vector_hits = []
    for i in range(len(vec_results["ids"][0])):
        vector_hits.append({
            "text": vec_results["documents"][0][i],
            "metadata": vec_results["metadatas"][0][i],
            "score": 1 - vec_results["distances"][0][i],
        })

    # BM25 search
    bm25_hits = []
    if _bm25_index and _bm25_corpus:
        tokenized_query = list(question)
        bm25_scores = _bm25_index.get_scores(tokenized_query)
        top_indices = bm25_scores.argsort()[::-1][:top_k * 2]
        for idx in top_indices:
            bm25_hits.append({
                "text": _bm25_corpus[idx],
                "metadata": _bm25_metadatas[idx],
                "score": float(bm25_scores[idx]),
            })

    # Fuse with RRF
    if bm25_hits:
        return _rrf_fusion(vector_hits, bm25_hits, top_k)
    return vector_hits[:top_k]


def delete_textbook_chunks(textbook_id: str):
    collection = _get_collection()
    results = collection.get(where={"textbook_id": textbook_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
