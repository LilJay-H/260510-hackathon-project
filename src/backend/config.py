import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.xiaomi.com/v1")
LLM_TEXT_MODEL = os.getenv("LLM_TEXT_MODEL", "MiMo-2.5-Pro")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
