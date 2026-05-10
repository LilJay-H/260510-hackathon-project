# 学科知识整合智能体 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-agent system that parses 7 medical textbooks, extracts knowledge graphs, integrates cross-textbook knowledge, provides RAG Q&A with citations, and supports teacher dialogue to modify integration decisions.

**Architecture:** 5 Python agents (Parser, Extractor, Integrator, RAG, Chat) sharing memory via module calls, exposed through FastAPI, with React + ECharts frontend for knowledge graph visualization.

**Tech Stack:** Python 3.11 / FastAPI / PyMuPDF / pymupdf4llm / sentence-transformers (bge-small-zh) / ChromaDB / React 19 / TypeScript / Vite / shadcn/ui / Tailwind CSS / ECharts / zustand

---

## File Structure

```
hackathon/
├── .env                          # MiMo API key, config
├── .gitignore                    # Exclude textbooks, __pycache__, node_modules
├── README.md                     # Project overview
├── requirements.txt              # Python deps
├── Dockerfile                    # Multi-stage build
├── docker-compose.yml
├── docs/
│   ├── spec.md                   # Design specification (already exists)
│   ├── 开发时间线.md              # Timeline (already exists)
│   ├── Agent架构说明.md           # Architecture doc (score: 20pt)
│   ├── 需求分析.md                # Requirements doc (score: 3pt)
│   ├── 系统设计.md                # System design doc (score: 3pt)
│   └── implementation-plan.md    # This file
├── report/
│   └── 整合报告.md               # Integration report (score: 2pt)
└── src/
    ├── backend/
    │   ├── __init__.py
    │   ├── main.py               # FastAPI app, CORS, static files
    │   ├── config.py             # Settings from .env
    │   ├── models/
    │   │   ├── __init__.py
    │   │   ├── textbook.py       # TextbookInfo, Chapter
    │   │   ├── knowledge.py      # KnowledgeNode, Edge, KnowledgeGraph
    │   │   └── integration.py    # IntegrationDecision, MergedKnowledgeGraph
    │   ├── services/
    │   │   ├── __init__.py
    │   │   ├── llm_client.py     # Unified LLM interface (MiMo/OpenAI-compatible)
    │   │   ├── parser_agent.py   # PDF parsing + chapter detection
    │   │   ├── extractor_agent.py # Knowledge extraction (3-level)
    │   │   ├── integrator_agent.py # Cross-textbook merge
    │   │   ├── rag_agent.py      # Chunking + embedding + ChromaDB + RAG
    │   │   └── chat_agent.py     # Intent recognition + dispatch
    │   └── routers/
    │       ├── __init__.py
    │       ├── textbooks.py      # Upload, list, index
    │       ├── knowledge.py      # Extract, graph
    │       ├── integration.py    # Merge, decisions, override
    │       ├── rag.py            # Query, status
    │       └── chat.py           # Send, history
    └── frontend/
        ├── index.html
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── tailwind.config.js
        ├── postcss.config.js
        ├── components.json       # shadcn config
        ├── src/
        │   ├── main.tsx
        │   ├── App.tsx
        │   ├── index.css         # Tailwind base
        │   ├── lib/
        │   │   └── utils.ts      # cn() helper
        │   ├── store/
        │   │   └── useStore.ts   # zustand store
        │   ├── api/
        │   │   └── client.ts     # fetch wrapper
        │   ├── components/
        │   │   ├── ui/           # shadcn components (auto-generated)
        │   │   ├── layout/
        │   │   │   ├── Header.tsx
        │   │   │   ├── LeftPanel.tsx
        │   │   │   ├── CenterPanel.tsx
        │   │   │   ├── RightPanel.tsx
        │   │   │   └── StatusBar.tsx
        │   │   ├── textbook/
        │   │   │   ├── UploadZone.tsx
        │   │   │   └── TextbookList.tsx
        │   │   ├── graph/
        │   │   │   ├── KnowledgeGraph.tsx
        │   │   │   └── NodeDetail.tsx
        │   │   ├── integration/
        │   │   │   └── IntegrationTab.tsx
        │   │   ├── rag/
        │   │   │   └── RAGTab.tsx
        │   │   └── chat/
        │   │       └── ChatTab.tsx
        │   └── types/
        │       └── index.ts      # Shared TypeScript types
        └── public/
            └── favicon.ico
```

---

## Phase 1: Project Scaffolding (15 min)

### Task 1: Create project structure and config

**Files:**
- Create: `hackathon/.env`
- Create: `hackathon/.gitignore`
- Create: `hackathon/requirements.txt`

- [ ] **Step 1: Create .env**

```bash
cd /c/Users/kk/Desktop/hackathon
```

Create `.env`:
```
LLM_PROVIDER=mimo
LLM_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1
LLM_TEXT_MODEL=mimo-v2.5-pro
LLM_API_KEY=YOUR_KEY_HERE
EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5
CHROMA_PERSIST_DIR=./data/chroma
UPLOAD_DIR=./data/uploads
```

- [ ] **Step 2: Create .gitignore**

```
.env
__pycache__/
*.pyc
node_modules/
dist/
data/
*.pdf
.vscode/
*.egg-info/
```

- [ ] **Step 3: Create requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
python-multipart==0.0.9
pymupdf==1.24.0
pymupdf4llm==0.0.9
sentence-transformers==3.1.0
chromadb==0.5.0
python-dotenv==1.0.1
httpx==0.27.0
```

- [ ] **Step 4: Install Python dependencies**

```bash
cd /c/Users/kk/Desktop/hackathon
pip install -r requirements.txt --user
```

- [ ] **Step 5: Initialize React frontend**

```bash
cd /c/Users/kk/Desktop/hackathon/src
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install echarts echarts-for-react zustand react-markdown
npm install lucide-react
npx shadcn@latest init -d
npx shadcn@latest add button input card badge tabs scroll-area separator dialog textarea
```

- [ ] **Step 6: Configure Tailwind in vite.config.ts**

Replace `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 7: Add Tailwind import to src/index.css**

```css
@import "tailwindcss";
```

- [ ] **Step 8: Verify frontend starts**

```bash
cd /c/Users/kk/Desktop/hackathon/src/frontend
npm run dev
```

Expected: Vite dev server starts, page loads at localhost:5173

- [ ] **Step 9: Commit**

```bash
cd /c/Users/kk/Desktop/hackathon
git init
git add .
git commit -m "chore: project scaffolding with React+Vite+Tailwind and Python deps"
```

---

## Phase 2: Backend Core — LLM Client + Models (20 min)

### Task 2: LLM client and data models

**Files:**
- Create: `src/backend/__init__.py`
- Create: `src/backend/config.py`
- Create: `src/backend/services/__init__.py`
- Create: `src/backend/services/llm_client.py`
- Create: `src/backend/models/__init__.py`
- Create: `src/backend/models/textbook.py`
- Create: `src/backend/models/knowledge.py`
- Create: `src/backend/models/integration.py`

- [ ] **Step 1: Create config.py**

```python
import os
from dotenv import load_dotenv

load_dotenv()

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://token-plan-cn.xiaomimimo.com/v1")
LLM_TEXT_MODEL = os.getenv("LLM_TEXT_MODEL", "mimo-v2.5-pro")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-zh-v1.5")
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
```

- [ ] **Step 2: Create llm_client.py**

```python
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
```

- [ ] **Step 3: Create models/textbook.py**

```python
from pydantic import BaseModel

class Chapter(BaseModel):
    chapter_id: str
    title: str
    page_start: int
    page_end: int
    content: str
    char_count: int
    tables: list[str] = []

class TextbookInfo(BaseModel):
    textbook_id: str
    filename: str
    title: str
    total_pages: int
    total_chars: int
    chapters: list[Chapter]
```

- [ ] **Step 4: Create models/knowledge.py**

```python
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

class KnowledgeEdge(BaseModel):
    source: str
    target: str
    relation_type: str  # prerequisite, parallel, contains, applies_to
    description: str

class KnowledgeGraph(BaseModel):
    textbook_id: str
    nodes: list[KnowledgeNode]
    edges: list[KnowledgeEdge]
```

- [ ] **Step 5: Create models/integration.py**

```python
from pydantic import BaseModel

class IntegrationDecision(BaseModel):
    decision_id: str
    action: str  # merge, keep, remove
    affected_nodes: list[str]
    result_node: str | None = None
    reason: str
    confidence: float

class MergedKnowledgeGraph(BaseModel):
    nodes: list  # list of KnowledgeNode
    edges: list  # list of KnowledgeEdge
    decisions: list[IntegrationDecision]
    original_chars: int
    merged_chars: int
    compression_ratio: float
```

- [ ] **Step 6: Create all __init__.py files**

```bash
touch src/backend/__init__.py
touch src/backend/services/__init__.py
touch src/backend/models/__init__.py
touch src/backend/routers/__init__.py
```

- [ ] **Step 7: Commit**

```bash
git add src/backend/
git commit -m "feat: add LLM client, config, and data models"
```

---

## Phase 2b: ParserAgent (15 min)

### Task 3: PDF parsing and chapter detection

**Files:**
- Create: `src/backend/services/parser_agent.py`
- Test with a real PDF from `C:\Users\kk\Desktop\textbooks\`

- [ ] **Step 1: Create parser_agent.py**

```python
import re
import fitz  # PyMuPDF
import pymupdf4llm
from pathlib import Path
from backend.models.textbook import TextbookInfo, Chapter

CHAPTER_PATTERN = re.compile(r'^第[一二三四五六七八九十百千\d]+[章篇]')
FONT_SIZE_THRESHOLD = 9.0  # Chart annotation text is typically < 9pt
SHORT_LINE_THRESHOLD = 15  # Chart text lines are typically < 15 chars

def parse_textbook(file_path: str) -> TextbookInfo:
    path = Path(file_path)
    doc = fitz.open(file_path)
    
    # Convert to markdown page by page
    md_pages = pymupdf4llm.to_markdown(file_path, page_chunks=True)
    
    # Extract text per page for header/footer + font size filtering
    page_texts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        page_texts.append(lines)
    
    # Detect headers/footers (lines appearing on >50% of pages)
    header_footer = _detect_header_footer(page_texts, len(doc))
    
    # Build full markdown, filtering headers/footers and chart annotation text
    full_md = ""
    for i, page_md in enumerate(md_pages):
        text = page_md.get("text", "")
        lines = text.split('\n')
        filtered = []
        short_line_count = 0
        for line in lines:
            if line.strip() in header_footer:
                continue
            # Filter consecutive short lines (chart annotation text pattern)
            if len(line.strip()) < SHORT_LINE_THRESHOLD:
                short_line_count += 1
                if short_line_count > 3:
                    continue  # Skip chart annotation clusters
            else:
                short_line_count = 0
            filtered.append(line)
        full_md += '\n'.join(filtered) + '\n\n'
    
    # Split into chapters
    chapters = _split_chapters(full_md, doc)
    
    # Extract table titles
    for ch in chapters:
        ch.tables = _extract_table_titles(ch.content)
    
    total_chars = sum(ch.char_count for ch in chapters)
    
    doc.close()
    
    return TextbookInfo(
        textbook_id=f"book_{path.stem[:2]}",
        filename=path.name,
        title=path.stem,
        total_pages=len(md_pages),
        total_chars=total_chars,
        chapters=chapters,
    )

def _detect_header_footer(page_texts: list[list[str]], total_pages: int) -> set[str]:
    threshold = total_pages * 0.5
    line_counts: dict[str, int] = {}
    for lines in page_texts:
        for line in lines[:3] + lines[-3:]:
            line_counts[line] = line_counts.get(line, 0) + 1
    return {line for line, count in line_counts.items() if count >= threshold}

def _split_chapters(full_md: str, doc) -> list[Chapter]:
    chapters = []
    lines = full_md.split('\n')
    current_title = "前言"
    current_content = []
    chapter_idx = 0
    
    for line in lines:
        if CHAPTER_PATTERN.match(line.strip()):
            if current_content:
                content = '\n'.join(current_content)
                chapters.append(Chapter(
                    chapter_id=f"ch_{chapter_idx:02d}",
                    title=current_title,
                    page_start=1,
                    page_end=len(doc),
                    content=content,
                    char_count=len(content),
                ))
                chapter_idx += 1
            current_title = line.strip()
            current_content = []
        else:
            current_content.append(line)
    
    if current_content:
        content = '\n'.join(current_content)
        chapters.append(Chapter(
            chapter_id=f"ch_{chapter_idx:02d}",
            title=current_title,
            page_start=1,
            page_end=len(doc),
            content=content,
            char_count=len(content),
        ))
    
    return chapters

def _extract_table_titles(content: str) -> list[str]:
    return re.findall(r'表[\d\-\.]+\s+[^\n]+', content)
```

- [ ] **Step 2: Test with one PDF**

```python
# Quick test script
import sys
sys.stdout.reconfigure(encoding='utf-8')
from backend.services.parser_agent import parse_textbook

info = parse_textbook(r"C:\Users\kk\Desktop\textbooks\07_病理生理学.pdf")
print(f"Title: {info.title}")
print(f"Chapters: {len(info.chapters)}")
print(f"Total chars: {info.total_chars}")
for ch in info.chapters[:3]:
    print(f"  {ch.chapter_id}: {ch.title} ({ch.char_count} chars)")
```

- [ ] **Step 3: Commit**

```bash
git add src/backend/services/parser_agent.py
git commit -m "feat: ParserAgent with PDF parsing, chapter detection, header/footer filtering"
```

---

## Phase 2c: ExtractorAgent (20 min)

### Task 4: Knowledge extraction with LLM

**Files:**
- Create: `src/backend/services/extractor_agent.py`

- [ ] **Step 1: Create extractor_agent.py**

```python
import json
import re
from backend.models.textbook import TextbookInfo
from backend.models.knowledge import KnowledgeNode, KnowledgeEdge, KnowledgeGraph
from backend.services.llm_client import chat_completion

EXTRACT_SYSTEM_PROMPT = """你是一个医学知识提取专家。从给定的教材内容中提取知识点和它们之间的关系。

要求：
1. 每个知识点应是一个独立的、可被查询的知识单元
2. 知识点分类：核心概念、解剖结构、生理过程、病理变化、临床表现、诊断方法、治疗原则
3. 关系类型：prerequisite（前置依赖）、parallel（并列）、contains（包含）、applies_to（应用）
4. 每个小节提取 10-15 个知识点

输出严格 JSON 格式：
{
  "nodes": [
    {
      "name": "知识点名称",
      "definition": "简明定义（50-100字）",
      "category": "分类"
    }
  ],
  "edges": [
    {
      "source_name": "源知识点名称",
      "target_name": "目标知识点名称",
      "relation_type": "prerequisite",
      "description": "关系描述"
    }
  ]
}"""

async def extract_from_textbook(textbook: TextbookInfo) -> KnowledgeGraph:
    all_nodes: list[KnowledgeNode] = []
    all_edges: list[KnowledgeEdge] = []
    node_counter = 0
    
    for ch_idx, chapter in enumerate(textbook.chapters):
        sections = _split_into_sections(chapter.content)
        
        section_nodes_map = {}  # section_idx -> list of node names
        
        for sec_idx, section in enumerate(sections):
            if len(section.strip()) < 100:
                continue
            
            result = await _extract_from_section(
                section, textbook, chapter, sec_idx
            )
            
            sec_nodes = []
            for n in result.get("nodes", []):
                node_counter += 1
                node = KnowledgeNode(
                    id=f"{textbook.textbook_id}_n{node_counter:04d}",
                    name=n["name"],
                    definition=n["definition"],
                    category=n["category"],
                    chapter=chapter.title,
                    page=chapter.page_start,
                    textbook_id=textbook.textbook_id,
                    textbook_name=textbook.title,
                )
                all_nodes.append(node)
                sec_nodes.append(node)
            
            section_nodes_map[sec_idx] = sec_nodes
            
            for e in result.get("edges", []):
                src = _find_node_by_name(e["source_name"], sec_nodes)
                tgt = _find_node_by_name(e["target_name"], sec_nodes)
                if src and tgt:
                    all_edges.append(KnowledgeEdge(
                        source=src.id,
                        target=tgt.id,
                        relation_type=e["relation_type"],
                        description=e["description"],
                    ))
        
        # Level 2: cross-section relations (sliding window of 3)
        for sec_idx in range(1, len(section_nodes_map) - 1):
            window_nodes = []
            for w in range(max(0, sec_idx - 1), min(len(section_nodes_map), sec_idx + 2)):
                window_nodes.extend(section_nodes_map.get(w, []))
            
            if len(window_nodes) >= 4:
                cross_edges = await _extract_cross_relations(window_nodes)
                all_edges.extend(cross_edges)
    
    # Level 3: per-chapter far-distance relations
    chapter_node_groups = {}
    for node in all_nodes:
        key = node.chapter
        chapter_node_groups.setdefault(key, []).append(node)
    
    chapter_names = list(chapter_node_groups.keys())
    for i, ch_name in enumerate(chapter_names):
        for j in range(i + 1, len(chapter_names)):
            ch_a_nodes = chapter_node_groups[ch_name]
            ch_b_nodes = chapter_node_groups[chapter_names[j]]
            if ch_a_nodes and ch_b_nodes:
                far_edges = await _extract_far_relations(ch_a_nodes, ch_b_nodes)
                all_edges.extend(far_edges)
    
    return KnowledgeGraph(
        textbook_id=textbook.textbook_id,
        nodes=all_nodes,
        edges=all_edges,
    )

def _split_into_sections(content: str) -> list[str]:
    section_pattern = re.compile(r'^第[一二三四五六七八九十百千\d]+节')
    sections = []
    current = []
    for line in content.split('\n'):
        if section_pattern.match(line.strip()):
            if current:
                sections.append('\n'.join(current))
                current = []
        current.append(line)
    if current:
        sections.append('\n'.join(current))
    return sections if sections else [content]

def _find_node_by_name(name: str, nodes: list[KnowledgeNode]) -> KnowledgeNode | None:
    for n in nodes:
        if n.name == name:
            return n
    return None

async def _extract_from_section(section: str, textbook, chapter, sec_idx) -> dict:
    prompt = f"教材：{textbook.title}\n章节：{chapter.title}\n\n内容：\n{section[:2000]}"
    try:
        resp = await chat_completion([
            {"role": "system", "content": EXTRACT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ])
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"Extraction error: {e}")
    return {"nodes": [], "edges": []}

async def _extract_cross_relations(nodes: list[KnowledgeNode]) -> list[KnowledgeEdge]:
    names = [n.name for n in nodes]
    prompt = f"以下是同一章节不同小节的知识点名称：\n{json.dumps(names, ensure_ascii=False)}\n\n识别它们之间的跨节关系。"
    try:
        resp = await chat_completion([
            {"role": "system", "content": "识别知识点间的跨节关系。输出JSON：{\"edges\": [{\"source_name\": \"\", \"target_name\": \"\", \"relation_type\": \"\", \"description\": \"\"}]}"},
            {"role": "user", "content": prompt},
        ])
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            data = json.loads(json_match.group())
            edges = []
            for e in data.get("edges", []):
                src = _find_node_by_name(e["source_name"], nodes)
                tgt = _find_node_by_name(e["target_name"], nodes)
                if src and tgt:
                    edges.append(KnowledgeEdge(
                        source=src.id, target=tgt.id,
                        relation_type=e["relation_type"],
                        description=e["description"],
                    ))
            return edges
    except Exception:
        pass
    return []

async def _extract_far_relations(nodes_a: list[KnowledgeNode], nodes_b: list[KnowledgeNode]) -> list[KnowledgeEdge]:
    names_a = [n.name for n in nodes_a][:30]
    names_b = [n.name for n in nodes_b][:30]
    prompt = f"章节A知识点：{json.dumps(names_a, ensure_ascii=False)}\n章节B知识点：{json.dumps(names_b, ensure_ascii=False)}\n\n识别跨章节的远距离关系。"
    try:
        resp = await chat_completion([
            {"role": "system", "content": "识别跨章节关系。输出JSON：{\"edges\": [{\"source_name\": \"\", \"target_name\": \"\", \"relation_type\": \"\", \"description\": \"\"}]}"},
            {"role": "user", "content": prompt},
        ])
        json_match = re.search(r'\{[\s\S]*\}', resp)
        if json_match:
            data = json.loads(json_match.group())
            all_nodes = nodes_a + nodes_b
            edges = []
            for e in data.get("edges", []):
                src = _find_node_by_name(e["source_name"], all_nodes)
                tgt = _find_node_by_name(e["target_name"], all_nodes)
                if src and tgt:
                    edges.append(KnowledgeEdge(
                        source=src.id, target=tgt.id,
                        relation_type=e["relation_type"],
                        description=e["description"],
                    ))
            return edges
    except Exception:
        pass
    return []
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/services/extractor_agent.py
git commit -m "feat: ExtractorAgent with 3-level knowledge extraction"
```

---

## Phase 2d: RAGAgent (20 min)

### Task 5: RAG pipeline — chunking, embedding, ChromaDB

**Files:**
- Create: `src/backend/services/rag_agent.py`

- [ ] **Step 1: Create rag_agent.py**

```python
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
    
    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        collection.upsert(
            ids=ids[i:i+batch_size],
            documents=texts[i:i+batch_size],
            embeddings=embeddings[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
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
            "score": 1 - results["distances"][0][i],  # cosine similarity
        })
    return hits

def delete_textbook_chunks(textbook_id: str):
    collection = _get_collection()
    results = collection.get(where={"textbook_id": textbook_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/services/rag_agent.py
git commit -m "feat: RAGAgent with chunking, bge-small-zh embedding, ChromaDB storage"
```

---

## Phase 2e: IntegratorAgent (15 min)

### Task 6: Cross-textbook integration

**Files:**
- Create: `src/backend/services/integrator_agent.py`

- [ ] **Step 1: Create integrator_agent.py**

```python
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from backend.config import EMBEDDING_MODEL
from backend.models.knowledge import KnowledgeNode, KnowledgeEdge, KnowledgeGraph
from backend.models.integration import IntegrationDecision, MergedKnowledgeGraph
from backend.services.llm_client import chat_completion

_model = None
_decision_log: list[IntegrationDecision] = []

def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model

def _get_decision_log() -> list[IntegrationDecision]:
    return _decision_log

async def merge_graphs(graphs: list[KnowledgeGraph]) -> MergedKnowledgeGraph:
    global _decision_log
    _decision_log = []
    
    # Combine all nodes
    all_nodes = []
    for g in graphs:
        all_nodes.extend(g.nodes)
    
    all_edges = []
    for g in graphs:
        all_edges.extend(g.edges)
    
    # Phase 1: Embedding coarse screening
    candidates = _embedding_screening(all_nodes, threshold=0.70)
    
    # Phase 2: LLM precise judgment
    decisions = await _llm_judge(candidates, all_nodes)
    _decision_log.extend(decisions)
    
    # Apply decisions
    merged_nodes, merged_edges, removed_ids = _apply_decisions(all_nodes, all_edges, decisions)
    
    # Update edges: replace removed node IDs with kept node IDs
    id_mapping = {}
    for d in decisions:
        if d.action == "merge" and d.result_node:
            for affected_id in d.affected_nodes:
                id_mapping[affected_id] = d.result_node
    
    for edge in merged_edges:
        if edge.source in id_mapping:
            edge.source = id_mapping[edge.source]
        if edge.target in id_mapping:
            edge.target = id_mapping[edge.target]
    
    # Remove edges referencing deleted nodes
    merged_edges = [e for e in merged_edges if e.source not in removed_ids and e.target not in removed_ids]
    
    # Calculate compression
    original_chars = sum(n.definition for n in all_nodes if hasattr(n, 'definition'))
    original_total = sum(len(getattr(n, 'definition', '')) for n in all_nodes)
    merged_total = sum(len(getattr(n, 'definition', '')) for n in merged_nodes)
    ratio = merged_total / original_total if original_total > 0 else 1.0
    
    return MergedKnowledgeGraph(
        nodes=merged_nodes,
        edges=merged_edges,
        decisions=decisions,
        original_chars=original_total,
        merged_chars=merged_total,
        compression_ratio=ratio,
    )

def _embedding_screening(nodes: list[KnowledgeNode], threshold: float = 0.70) -> list[tuple[str, str, float]]:
    model = _get_model()
    
    texts = [f"{n.name} {n.definition}" for n in nodes]
    embeddings = model.encode(texts)
    
    # Normalize
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / norms
    
    # Cosine similarity matrix
    sim_matrix = embeddings @ embeddings.T
    
    candidates = []
    seen = set()
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if sim_matrix[i][j] >= threshold:
                pair = tuple(sorted([nodes[i].id, nodes[j].id]))
                if pair not in seen:
                    seen.add(pair)
                    candidates.append((nodes[i].id, nodes[j].id, float(sim_matrix[i][j])))
    
    return candidates

async def _llm_judge(candidates: list[tuple[str, str, float]], all_nodes: list[KnowledgeNode]) -> list[IntegrationDecision]:
    node_map = {n.id: n for n in all_nodes}
    decisions = []
    
    # Process in batches of 5
    batch_size = 5
    for batch_start in range(0, len(candidates), batch_size):
        batch = candidates[batch_start:batch_start + batch_size]
        
        pairs_desc = []
        for id_a, id_b, score in batch:
            n_a = node_map.get(id_a)
            n_b = node_map.get(id_b)
            if n_a and n_b:
                pairs_desc.append(
                    f"候选对: A=\"{n_a.name}\"({n_a.textbook_name}, {n_a.category}) vs B=\"{n_b.name}\"({n_b.textbook_name}, {n_b.category}), 相似度={score:.2f}\n  A定义: {n_a.definition[:100]}\n  B定义: {n_b.definition[:100]}"
                )
        
        prompt = f"""判断以下知识点候选对是否应合并：

{chr(10).join(pairs_desc)}

输出JSON格式：
{{
  "decisions": [
    {{
      "pair": ["A的name", "B的name"],
      "action": "merge/keep",
      "keep_version": "A/B",
      "reason": "理由",
      "confidence": 0.9
    }}
  ]
}}"""
        
        try:
            resp = await chat_completion([
                {"role": "system", "content": "你是医学知识整合专家。判断两个知识点是否应合并为一个。merge=合并, keep=保持独立。"},
                {"role": "user", "content": prompt},
            ])
            json_match = re.search(r'\{[\s\S]*\}', resp)
            if json_match:
                data = json.loads(json_match.group())
                for d in data.get("decisions", []):
                    id_a, id_b, _ = batch[batch_start] if batch_start < len(batch) else (None, None, 0)
                    # Find the matching candidate
                    for cand_id_a, cand_id_b, cand_score in batch:
                        n_a = node_map.get(cand_id_a)
                        n_b = node_map.get(cand_id_b)
                        if n_a and n_b and n_a.name == d["pair"][0] and n_b.name == d["pair"][1]:
                            if d["action"] == "merge":
                                keep_id = cand_id_a if d.get("keep_version") == "A" else cand_id_b
                                decisions.append(IntegrationDecision(
                                    decision_id=f"merge_{len(decisions):04d}",
                                    action="merge",
                                    affected_nodes=[cand_id_a, cand_id_b],
                                    result_node=keep_id,
                                    reason=d.get("reason", ""),
                                    confidence=d.get("confidence", 0.8),
                                ))
                            else:
                                decisions.append(IntegrationDecision(
                                    decision_id=f"keep_{len(decisions):04d}",
                                    action="keep",
                                    affected_nodes=[cand_id_a, cand_id_b],
                                    reason=d.get("reason", "保持独立"),
                                    confidence=d.get("confidence", 0.8),
                                ))
                            break
        except Exception as e:
            print(f"LLM judge error: {e}")
    
    return decisions

import re

def _apply_decisions(nodes, edges, decisions) -> tuple[list, list, set]:
    node_map = {n.id: n for n in nodes}
    removed_ids = set()
    merged_nodes = list(nodes)
    
    for d in decisions:
        if d.action == "merge":
            for node_id in d.affected_nodes:
                if node_id != d.result_node:
                    removed_ids.add(node_id)
    
    merged_nodes = [n for n in merged_nodes if n.id not in removed_ids]
    return merged_nodes, list(edges), removed_ids
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/services/integrator_agent.py
git commit -m "feat: IntegratorAgent with embedding screening + LLM judgment"
```

---

## Phase 2f: ChatAgent (10 min)

### Task 7: Intent recognition and dispatch

**Files:**
- Create: `src/backend/services/chat_agent.py`

- [ ] **Step 1: Create chat_agent.py**

```python
import re
from backend.models.integration import IntegrationDecision
from backend.services.llm_client import chat_completion
from backend.services import integrator_agent

class ChatAgent:
    def __init__(self):
        self.history: list[dict] = []
    
    async def send(self, message: str) -> str:
        self.history.append({"role": "user", "content": message})
        
        intent = self._classify_intent(message)
        
        if intent["action"] == "explain_merge":
            response = self._explain_merge(intent["node_name"])
        elif intent["action"] == "explain_remove":
            response = self._explain_remove(intent["node_name"])
        elif intent["action"] == "keep_node":
            response = self._keep_node(intent["node_name"])
        elif intent["action"] == "remove_node":
            response = self._remove_node(intent["node_name"])
        elif intent["action"] == "split_nodes":
            response = self._split_nodes(intent["node_a"], intent["node_b"])
        elif intent["action"] == "merge_nodes":
            response = self._merge_nodes(intent["node_a"], intent["node_b"])
        elif intent["action"] == "query_status":
            response = self._query_status()
        else:
            response = await self._llm_fallback(message)
        
        self.history.append({"role": "assistant", "content": response})
        return response
    
    def _classify_intent(self, message: str) -> dict:
        if "为什么" in message and ("合并" in message or "合并" in message):
            node = self._extract_node_name(message)
            return {"action": "explain_merge", "node_name": node}
        if "为什么" in message and "删除" in message:
            node = self._extract_node_name(message)
            return {"action": "explain_remove", "node_name": node}
        if "保留" in message or "恢复" in message:
            node = self._extract_node_name(message)
            return {"action": "keep_node", "node_name": node}
        if "删除" in message and "为什么" not in message:
            node = self._extract_node_name(message)
            return {"action": "remove_node", "node_name": node}
        if "分开" in message or "拆分" in message:
            nodes = self._extract_two_nodes(message)
            return {"action": "split_nodes", "node_a": nodes[0], "node_b": nodes[1]}
        if "合并" in message and "为什么" not in message:
            nodes = self._extract_two_nodes(message)
            return {"action": "merge_nodes", "node_a": nodes[0], "node_b": nodes[1]}
        if "状态" in message or "统计" in message:
            return {"action": "query_status", "node_name": ""}
        return {"action": "unknown", "node_name": ""}
    
    def _extract_node_name(self, message: str) -> str:
        # Try quoted names
        match = re.search(r'[""「](.+?)[""」]', message)
        if match:
            return match.group(1)
        # Fallback: look for "是" or "了" before potential node name
        match = re.search(r'["是了](.+?)["是了？]', message)
        if match:
            return match.group(1)
        return message
    
    def _extract_two_nodes(self, message: str) -> list[str]:
        match = re.search(r'[""「](.+?)[""」].*?[""「](.+?)[""」]', message)
        if match:
            return [match.group(1), match.group(2)]
        parts = re.split(r'和|与|跟', message)
        if len(parts) >= 2:
            return [p.strip().strip("？。！") for p in parts[:2]]
        return ["", ""]
    
    def _explain_merge(self, node_name: str) -> str:
        for d in integrator_agent._get_decision_log():
            if d.action == "merge":
                return f"关于「{node_name}」的合并决策：{d.reason}（置信度: {d.confidence:.0%}）"
        return f"未找到关于「{node_name}」的合并决策记录。"
    
    def _explain_remove(self, node_name: str) -> str:
        for d in integrator_agent._get_decision_log():
            if d.action == "remove" and node_name in str(d.affected_nodes):
                return f"关于「{node_name}」的删除决策：{d.reason}"
        return f"未找到关于「{node_name}」的删除决策记录。"
    
    def _keep_node(self, node_name: str) -> str:
        for d in integrator_agent._get_decision_log():
            if node_name in str(d.affected_nodes) and d.action in ("merge", "remove"):
                d.action = "keep"
                return f"已将「{node_name}」恢复为保留状态。图谱已更新。"
        return f"未找到需要恢复的「{node_name}」决策。"
    
    def _remove_node(self, node_name: str) -> str:
        integrator_agent._decision_log.append(IntegrationDecision(
            decision_id=f"remove_chat_{len(integrator_agent._decision_log):04d}",
            action="remove",
            affected_nodes=[node_name],
            reason=f"用户通过对话请求删除",
            confidence=1.0,
        ))
        return f"已将「{node_name}」标记为删除。图谱已更新。"
    
    def _split_nodes(self, node_a: str, node_b: str) -> str:
        for d in integrator_agent._get_decision_log():
            if d.action == "merge" and node_a in str(d.affected_nodes) and node_b in str(d.affected_nodes):
                d.action = "keep"
                return f"已将「{node_a}」和「{node_b}」拆分为两个独立知识点。图谱已更新。"
        return f"未找到「{node_a}」和「{node_b}」的合并记录，无需拆分。"
    
    def _merge_nodes(self, node_a: str, node_b: str) -> str:
        integrator_agent._decision_log.append(IntegrationDecision(
            decision_id=f"merge_chat_{len(integrator_agent._decision_log):04d}",
            action="merge",
            affected_nodes=[node_a, node_b],
            result_node=node_a,
            reason=f"用户通过对话请求合并",
            confidence=1.0,
        ))
        return f"已将「{node_a}」和「{node_b}」合并。图谱已更新。"
    
    def _query_status(self) -> str:
        log = integrator_agent._get_decision_log()
        merges = sum(1 for d in log if d.action == "merge")
        removes = sum(1 for d in log if d.action == "remove")
        keeps = sum(1 for d in log if d.action == "keep")
        return f"当前整合状态：{merges} 个合并决策，{removes} 个删除决策，{keeps} 个保留决策。"
    
    async def _llm_fallback(self, message: str) -> str:
        return await chat_completion([
            {"role": "system", "content": "你是医学知识整合助手。请简洁回答用户关于教材整合的问题。"},
            {"role": "user", "content": message},
        ])
```

- [ ] **Step 2: Commit**

```bash
git add src/backend/services/chat_agent.py
git commit -m "feat: ChatAgent with keyword intent recognition and dispatch"
```

---

## Phase 2g: FastAPI Routers (15 min)

### Task 8: API endpoints

**Files:**
- Create: `src/backend/main.py`
- Create: `src/backend/routers/textbooks.py`
- Create: `src/backend/routers/knowledge.py`
- Create: `src/backend/routers/integration.py`
- Create: `src/backend/routers/rag.py`
- Create: `src/backend/routers/chat.py`

- [ ] **Step 1: Create main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from backend.routers import textbooks, knowledge, integration, rag, chat

app = FastAPI(title="学科知识整合智能体")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(textbooks.router, prefix="/api/textbooks", tags=["textbooks"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["knowledge"])
app.include_router(integration.router, prefix="/api/integration", tags=["integration"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# Serve frontend static files
static_dir = Path(__file__).parent.parent.parent / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
```

- [ ] **Step 2: Create routers/textbooks.py**

```python
from fastapi import APIRouter, UploadFile, File
from pathlib import Path
from backend.config import UPLOAD_DIR
from backend.services.parser_agent import parse_textbook
from backend.services.rag_agent import index_textbook
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
    count = index_textbook(_textbooks[textbook_id])
    return {"indexed_chunks": count}

def get_textbooks() -> dict[str, TextbookInfo]:
    return _textbooks
```

- [ ] **Step 3: Create routers/knowledge.py**

```python
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
```

- [ ] **Step 4: Create routers/integration.py**

```python
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
```

- [ ] **Step 5: Create routers/rag.py**

```python
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
    return {"status": "ready"}
```

- [ ] **Step 6: Create routers/chat.py**

```python
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
```

- [ ] **Step 7: Test backend starts**

```bash
cd /c/Users/kk/Desktop/hackathon
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Expected: Server starts, `curl http://localhost:8000/api/health` returns `{"status":"ok"}`

- [ ] **Step 8: Commit**

```bash
git add src/backend/
git commit -m "feat: FastAPI routers for all 5 agents with full API surface"
```

---

## Phase 3: Frontend (60 min)

### Task 9: App shell and layout

**Files:**
- Create: `src/frontend/src/types/index.ts`
- Create: `src/frontend/src/api/client.ts`
- Create: `src/frontend/src/store/useStore.ts`
- Create: `src/frontend/src/App.tsx`
- Create: `src/frontend/src/components/layout/Header.tsx`
- Create: `src/frontend/src/components/layout/LeftPanel.tsx`
- Create: `src/frontend/src/components/layout/CenterPanel.tsx`
- Create: `src/frontend/src/components/layout/RightPanel.tsx`
- Create: `src/frontend/src/components/layout/StatusBar.tsx`

- [ ] **Step 1: Create types/index.ts**

```typescript
export interface Textbook {
  id: string
  title: string
  chapters: number
  total_chars: number
}

export interface KnowledgeNode {
  id: string
  name: string
  definition: string
  category: string
  chapter: string
  page: number
  textbook_id: string
  textbook_name: string
}

export interface KnowledgeEdge {
  source: string
  target: string
  relation_type: string
  description: string
}

export interface IntegrationDecision {
  decision_id: string
  action: string
  affected_nodes: string[]
  result_node: string | null
  reason: string
  confidence: number
}

export interface RAGResult {
  answer: string
  citations: { textbook: string; chapter: string; page: number; relevance_score: number }[]
  source_chunks: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
```

- [ ] **Step 2: Create api/client.ts**

```typescript
const BASE = '/api'

export async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}

export const api = {
  uploadTextbook: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/textbooks/upload`, { method: 'POST', body: form })
    return res.json()
  },
  listTextbooks: () => fetchAPI('/textbooks/list'),
  extractKnowledge: (id: string) => fetchAPI(`/knowledge/extract/${id}`, { method: 'POST' }),
  getGraph: (id: string) => fetchAPI(`/knowledge/graph/${id}`),
  getAllGraphs: () => fetchAPI('/knowledge/all'),
  mergeGraphs: () => fetchAPI('/integration/merge', { method: 'POST' }),
  getMerged: () => fetchAPI('/integration/merged'),
  getDecisions: () => fetchAPI('/integration/decisions'),
  ragQuery: (question: string) => fetchAPI('/rag/query', { method: 'POST', body: JSON.stringify({ question }) }),
  chatSend: (message: string) => fetchAPI('/chat/send', { method: 'POST', body: JSON.stringify({ message }) }),
  chatHistory: () => fetchAPI('/chat/history'),
}
```

- [ ] **Step 3: Create store/useStore.ts**

```typescript
import { create } from 'zustand'
import { Textbook, KnowledgeNode, KnowledgeEdge, IntegrationDecision, RAGResult, ChatMessage } from '../types'

interface Store {
  textbooks: Textbook[]
  setTextbooks: (t: Textbook[]) => void
  addTextbook: (t: Textbook) => void
  
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  setGraphData: (nodes: KnowledgeNode[], edges: KnowledgeEdge[]) => void
  
  decisions: IntegrationDecision[]
  setDecisions: (d: IntegrationDecision[]) => void
  
  compressionRatio: number
  setCompressionRatio: (r: number) => void
  
  selectedNode: KnowledgeNode | null
  setSelectedNode: (n: KnowledgeNode | null) => void
  
  activeTab: string
  setActiveTab: (t: string) => void
  
  ragResult: RAGResult | null
  setRAGResult: (r: RAGResult | null) => void
  
  chatMessages: ChatMessage[]
  addChatMessage: (m: ChatMessage) => void
  
  loading: Record<string, boolean>
  setLoading: (key: string, v: boolean) => void
}

export const useStore = create<Store>((set) => ({
  textbooks: [],
  setTextbooks: (textbooks) => set({ textbooks }),
  addTextbook: (t) => set((s) => ({ textbooks: [...s.textbooks, t] })),
  
  nodes: [],
  edges: [],
  setGraphData: (nodes, edges) => set({ nodes, edges }),
  
  decisions: [],
  setDecisions: (decisions) => set({ decisions }),
  
  compressionRatio: 1,
  setCompressionRatio: (compressionRatio) => set({ compressionRatio }),
  
  selectedNode: null,
  setSelectedNode: (selectedNode) => set({ selectedNode }),
  
  activeTab: 'integration',
  setActiveTab: (activeTab) => set({ activeTab }),
  
  ragResult: null,
  setRAGResult: (ragResult) => set({ ragResult }),
  
  chatMessages: [],
  addChatMessage: (m) => set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  
  loading: {},
  setLoading: (key, v) => set((s) => ({ loading: { ...s.loading, [key]: v } })),
}))
```

- [ ] **Step 4: Create App.tsx with three-column layout**

```tsx
import { Header } from './components/layout/Header'
import { LeftPanel } from './components/layout/LeftPanel'
import { CenterPanel } from './components/layout/CenterPanel'
import { RightPanel } from './components/layout/RightPanel'
import { StatusBar } from './components/layout/StatusBar'

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  )
}
```

- [ ] **Step 5: Create Header.tsx**

```tsx
import { useStore } from '../../store/useStore'

export function Header() {
  const { textbooks, nodes, edges } = useStore()
  return (
    <header className="h-12 border-b border-gray-800 flex items-center px-4 gap-6 bg-gray-900">
      <h1 className="text-sm font-bold tracking-wide">学科知识整合智能体</h1>
      <span className="text-xs text-gray-400">教材 {textbooks.length} 本</span>
      <span className="text-xs text-gray-400">节点 {nodes.length}</span>
      <span className="text-xs text-gray-400">边 {edges.length}</span>
    </header>
  )
}
```

- [ ] **Step 6: Create LeftPanel.tsx with upload + textbook list**

```tsx
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import { useCallback } from 'react'

export function LeftPanel() {
  const { textbooks, setTextbooks, addTextbook, setGraphData, setLoading, nodes, edges } = useStore()
  
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      setLoading('upload', true)
      try {
        const result = await api.uploadTextbook(file)
        addTextbook(result)
      } finally {
        setLoading('upload', false)
      }
    }
  }, [addTextbook, setLoading])
  
  const handleExtract = useCallback(async (id: string) => {
    setLoading('extract', true)
    try {
      await api.extractKnowledge(id)
      const allGraphs = await api.getAllGraphs()
      // Merge all graphs into one view
      let allNodes: any[] = []
      let allEdges: any[] = []
      for (const [tid] of Object.entries(allGraphs as Record<string, any>)) {
        const g = await api.getGraph(tid)
        if (g.nodes) allNodes = [...allNodes, ...g.nodes]
        if (g.edges) allEdges = [...allEdges, ...g.edges]
      }
      setGraphData(allNodes, allEdges)
    } finally {
      setLoading('extract', false)
    }
  }, [setGraphData, setLoading])
  
  return (
    <aside className="w-60 border-r border-gray-800 p-4 flex flex-col gap-4 bg-gray-900/50">
      <div>
        <label className="block text-xs text-gray-400 mb-2">上传教材</label>
        <input
          type="file"
          accept=".pdf"
          multiple
          onChange={handleUpload}
          className="block w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs"
        />
      </div>
      
      <div className="flex-1 overflow-auto">
        <h3 className="text-xs font-semibold text-gray-400 mb-2">教材列表</h3>
        <div className="flex flex-col gap-2">
          {textbooks.map((t) => (
            <div key={t.id} className="bg-gray-800 rounded p-2 text-xs">
              <div className="font-medium truncate">{t.title}</div>
              <div className="text-gray-500">{t.chapters} 章 | {(t.total_chars / 1000).toFixed(0)}k 字</div>
              <button
                onClick={() => handleExtract(t.id)}
                className="mt-1 text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded hover:bg-blue-600/40"
              >
                提取知识
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t border-gray-800 pt-3">
        <h3 className="text-xs font-semibold text-gray-400 mb-1">统计</h3>
        <div className="text-xs text-gray-500">节点: {nodes.length} | 边: {edges.length}</div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 7: Create CenterPanel.tsx with ECharts graph**

```tsx
import { useRef, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../../store/useStore'

const CATEGORY_COLORS: Record<string, string> = {
  '核心概念': '#3b82f6',
  '解剖结构': '#ef4444',
  '生理过程': '#22c55e',
  '病理变化': '#eab308',
  '临床表现': '#a855f7',
  '诊断方法': '#06b6d4',
  '治疗原则': '#f97316',
}

const RELATION_COLORS: Record<string, string> = {
  prerequisite: '#ef4444',
  parallel: '#6b7280',
  contains: '#3b82f6',
  applies_to: '#22c55e',
}

export function CenterPanel() {
  const { nodes, edges, setSelectedNode } = useStore()
  
  const chartNodes = nodes.slice(0, 200).map((n) => ({
    id: n.id,
    name: n.name,
    symbolSize: 20,
    category: n.category,
    itemStyle: { color: CATEGORY_COLORS[n.category] || '#6b7280' },
    ...n,
  }))
  
  const categories = [...new Set(nodes.map((n) => n.category))].map((c) => ({ name: c }))
  
  const chartEdges = edges
    .filter((e) => chartNodes.some((n) => n.id === e.source) && chartNodes.some((n) => n.id === e.target))
    .map((e) => ({
      source: e.source,
      target: e.target,
      lineStyle: { color: RELATION_COLORS[e.relation_type] || '#4b5563' },
    }))
  
  const option = {
    tooltip: { trigger: 'item' },
    legend: { data: categories.map((c) => c.name), textStyle: { color: '#9ca3af', fontSize: 10 }, bottom: 10 },
    series: [{
      type: 'graph',
      layout: 'force',
      data: chartNodes,
      links: chartEdges,
      categories,
      roam: true,
      force: { repulsion: 100, edgeLength: 80 },
      label: { show: true, fontSize: 8, color: '#e5e7eb' },
      lineStyle: { curveness: 0.1 },
    }],
  }
  
  const onChartClick = (params: any) => {
    if (params.dataType === 'node') {
      setSelectedNode(params.data)
    }
  }
  
  return (
    <div className="flex-1 relative bg-gray-950">
      {nodes.length > 0 ? (
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          onEvents={{ click: onChartClick }}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-600 text-sm">
          上传并提取教材后，知识图谱将在此显示
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Create RightPanel.tsx with tabs**

```tsx
import { useStore } from '../../store/useStore'
import { IntegrationTab } from '../integration/IntegrationTab'
import { RAGTab } from '../rag/RAGTab'
import { ChatTab } from '../chat/ChatTab'

const TABS = [
  { id: 'integration', label: '整合' },
  { id: 'rag', label: 'RAG 问答' },
  { id: 'chat', label: '对话' },
]

export function RightPanel() {
  const { activeTab, setActiveTab } = useStore()
  
  return (
    <aside className="w-96 border-l border-gray-800 flex flex-col bg-gray-900/50">
      <div className="flex border-b border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'integration' && <IntegrationTab />}
        {activeTab === 'rag' && <RAGTab />}
        {activeTab === 'chat' && <ChatTab />}
      </div>
    </aside>
  )
}
```

- [ ] **Step 9: Create StatusBar.tsx**

```tsx
import { useStore } from '../../store/useStore'

export function StatusBar() {
  const { loading, compressionRatio } = useStore()
  const anyLoading = Object.values(loading).some(Boolean)
  
  return (
    <footer className="h-7 border-t border-gray-800 flex items-center px-4 gap-4 bg-gray-900 text-xs text-gray-500">
      <span>{anyLoading ? '处理中...' : '就绪'}</span>
      <span>压缩比: {(compressionRatio * 100).toFixed(0)}%</span>
      <span className="ml-auto">学科知识整合智能体 v1.0</span>
    </footer>
  )
}
```

- [ ] **Step 10: Commit**

```bash
git add src/frontend/
git commit -m "feat: React frontend with three-column layout, ECharts graph, tabs"
```

### Task 10: Integration, RAG, Chat tabs

**Files:**
- Create: `src/frontend/src/components/integration/IntegrationTab.tsx`
- Create: `src/frontend/src/components/rag/RAGTab.tsx`
- Create: `src/frontend/src/components/chat/ChatTab.tsx`
- Create: `src/frontend/src/components/graph/NodeDetail.tsx`

- [ ] **Step 1: Create IntegrationTab.tsx**

```tsx
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'

export function IntegrationTab() {
  const { decisions, compressionRatio, setDecisions, setCompressionRatio, setGraphData, setLoading } = useStore()
  
  const handleMerge = async () => {
    setLoading('merge', true)
    try {
      const result = await api.mergeGraphs()
      setCompressionRatio(result.compression_ratio)
      const merged = await api.getMerged()
      setGraphData(merged.nodes, merged.edges)
      const decs = await api.getDecisions()
      setDecisions(decs)
    } finally {
      setLoading('merge', false)
    }
  }
  
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleMerge}
        className="bg-blue-600 text-white text-xs py-2 px-4 rounded hover:bg-blue-700"
      >
        执行跨教材整合
      </button>
      
      <div className="text-xs text-gray-400">
        压缩比: <span className="text-white font-mono">{(compressionRatio * 100).toFixed(1)}%</span>
        （目标 ≤ 30%）
      </div>
      
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-gray-400">整合决策 ({decisions.length})</h3>
        {decisions.map((d) => (
          <div key={d.decision_id} className="bg-gray-800 rounded p-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                d.action === 'merge' ? 'bg-yellow-600/20 text-yellow-400' :
                d.action === 'remove' ? 'bg-red-600/20 text-red-400' :
                'bg-green-600/20 text-green-400'
              }`}>
                {d.action}
              </span>
              <span className="text-gray-500">{d.decision_id}</span>
              <span className="ml-auto text-gray-600">{(d.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-gray-400 mt-1">{d.reason}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RAGTab.tsx**

```tsx
import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'
import ReactMarkdown from 'react-markdown'

export function RAGTab() {
  const { ragResult, setRAGResult } = useStore()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleQuery = async () => {
    if (!question.trim()) return
    setLoading(true)
    try {
      const result = await api.ragQuery(question)
      setRAGResult(result)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="输入医学问题..."
          className="flex-1 bg-gray-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 outline-none"
        />
        <button
          onClick={handleQuery}
          disabled={loading}
          className="bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : '查询'}
        </button>
      </div>
      
      {ragResult && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-800 rounded p-3 text-xs text-gray-200 leading-relaxed">
            <ReactMarkdown>{ragResult.answer}</ReactMarkdown>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">引用来源</h4>
            {ragResult.citations.map((c, i) => (
              <div key={i} className="text-xs text-gray-500 mb-1">
                [{c.textbook}, {c.chapter}, 第{c.page}页] 相关度: {(c.relevance_score * 100).toFixed(0)}%
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ChatTab.tsx**

```tsx
import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { api } from '../../api/client'

export function ChatTab() {
  const { chatMessages, addChatMessage } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [chatMessages])
  
  const handleSend = async () => {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    addChatMessage({ role: 'user', content: msg })
    
    setLoading(true)
    try {
      const result = await api.chatSend(msg)
      addChatMessage({ role: 'assistant', content: result.response })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-auto flex flex-col gap-2 mb-3">
        {chatMessages.length === 0 && (
          <div className="text-xs text-gray-600 text-center mt-8">
            试试：「为什么把A和B合并了？」「保留X」「把X和Y分开」
          </div>
        )}
        {chatMessages.map((m, i) => (
          <div key={i} className={`text-xs p-2 rounded max-w-[90%] ${
            m.role === 'user'
              ? 'bg-blue-600/20 text-blue-200 self-end'
              : 'bg-gray-800 text-gray-200 self-start'
          }`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-600 self-start">思考中...</div>}
      </div>
      
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="对话修改整合方案..."
          className="flex-1 bg-gray-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 border border-gray-700 focus:border-blue-500 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create NodeDetail.tsx (sidebar drawer for clicked node)**

```tsx
import { useStore } from '../../store/useStore'

export function NodeDetail() {
  const { selectedNode, setSelectedNode } = useStore()
  
  if (!selectedNode) return null
  
  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-gray-900 border-l border-gray-700 p-4 z-10 overflow-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold">{selectedNode.name}</h3>
        <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white text-xs">关闭</button>
      </div>
      <div className="space-y-2 text-xs">
        <div><span className="text-gray-500">分类:</span> {selectedNode.category}</div>
        <div><span className="text-gray-500">教材:</span> {selectedNode.textbook_name}</div>
        <div><span className="text-gray-500">章节:</span> {selectedNode.chapter}</div>
        <div><span className="text-gray-500">页码:</span> {selectedNode.page}</div>
        <div className="mt-3">
          <span className="text-gray-500">定义:</span>
          <p className="text-gray-300 mt-1 leading-relaxed">{selectedNode.definition}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update CenterPanel to include NodeDetail**

Add import and render NodeDetail inside CenterPanel:
```tsx
import { NodeDetail } from './NodeDetail'
// Inside the return, wrap with relative and add <NodeDetail />
```

- [ ] **Step 6: Test frontend builds**

```bash
cd /c/Users/kk/Desktop/hackathon/src/frontend
npm run build
```

Expected: Build succeeds, dist/ created

- [ ] **Step 7: Commit**

```bash
git add src/frontend/
git commit -m "feat: Integration, RAG, Chat tabs with full interaction flow"
```

---

## Phase 4: Documentation (40 min)

### Task 11: Write architecture and requirements docs

**Files:**
- Create: `docs/Agent架构说明.md`
- Create: `docs/需求分析.md`
- Create: `docs/系统设计.md`
- Create: `report/整合报告.md`
- Create: `README.md`

- [ ] **Step 1: Create Agent架构说明.md** (score: 20pt — highest value doc)

Content must cover:
1. 总览：5 Agent 共享内存架构 + 为什么选这个架构
2. 每个 Agent 的职责、输入输出、核心算法
3. Agent 间数据流图（ASCII）
4. 三级知识提取策略详解
5. 两阶段对齐算法详解
6. ChatAgent 作为控制平面的设计
7. 设计取舍（为什么不用 Gradio、为什么不用消息队列等）
8. 创新点（三级递进、ChatAgent 控制流、增量 RAG 同步）

- [ ] **Step 2: Create 需求分析.md** (score: 3pt)

Content: 子问题分解、知识点粒度定义、重复判定标准、压缩比目标

- [ ] **Step 3: Create 系统设计.md** (score: 3pt)

Content: 架构图、数据流、API 设计、技术选型理由

- [ ] **Step 4: Create 整合报告.md** (score: 2pt)

Template (fill with real data after running on 7 textbooks):
```markdown
# 整合报告

## 概览
- 教材数量: 7 本
- 原始总字数: X 字
- 整合后总字数: Y 字
- 压缩比: Z%

## 每本教材统计
| 教材 | 章节 | 节点 | 边 | 原始字数 |
|---|---|---|---|---|

## 整合决策摘要
- 合并: N 个
- 删除: M 个
- 保留: K 个

## 典型合并案例
...
```

- [ ] **Step 5: Create README.md** (score: 3pt)

```markdown
# 学科知识整合智能体

AI 全栈极速黑客松参赛项目。对 7 本医学教材进行知识整合：自动解析、构建知识图谱、跨教材去重提纯、RAG 精准问答、支持对话修改整合方案。

## 快速开始

### 环境要求
- Python 3.11+
- Node.js 20+

### 安装
```bash
pip install -r requirements.txt
cd src/frontend && npm install
```

### 配置
复制 `.env.example` 为 `.env`，填入 MiMo API key。

### 运行
```bash
# 后端
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 前端（开发模式）
cd src/frontend && npm run dev
```

### Docker
```bash
docker-compose up --build
```

## 架构
多 Agent 共享内存架构，5 个 Agent：Parser、Extractor、Integrator、RAG、Chat。
详见 `docs/Agent架构说明.md`。
```

- [ ] **Step 6: Commit**

```bash
git add docs/ report/ README.md
git commit -m "docs: architecture, requirements, system design, integration report, README"
```

---

## Phase 5: Deployment (15 min)

### Task 12: Docker + push

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20 AS builder
WORKDIR /app
COPY src/frontend/ .
RUN npm install && npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/backend/ ./backend/
COPY --from=builder /app/dist ./frontend/dist
RUN mkdir -p data/uploads data/chroma
EXPOSE 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "7860:7860"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
```

- [ ] **Step 3: Git push**

```bash
git add Dockerfile docker-compose.yml
git commit -m "deploy: Dockerfile and docker-compose for ModelScope deployment"
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

---

## Phase 6: Verification (15 min)

### Task 13: End-to-end test

- [ ] **Step 1: Start backend**

```bash
cd /c/Users/kk/Desktop/hackathon
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

- [ ] **Step 2: Start frontend dev server**

```bash
cd /c/Users/kk/Desktop/hackathon/src/frontend
npm run dev
```

- [ ] **Step 3: Upload 1 textbook via UI, verify parsing**

Open localhost:5173, upload a PDF, check textbook list shows it.

- [ ] **Step 4: Extract knowledge, verify graph displays**

Click "提取知识", check nodes appear in ECharts.

- [ ] **Step 5: Execute integration, verify decisions**

Click "执行跨教材整合", check decisions list.

- [ ] **Step 6: RAG query, verify citation**

Type a medical question, check answer with citations.

- [ ] **Step 7: Chat, verify intent recognition**

Type "为什么合并了X", check explanation.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: final verification pass"
git push
```
