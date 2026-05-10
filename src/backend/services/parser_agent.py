import re
import fitz  # PyMuPDF
import pymupdf4llm
from pathlib import Path
from backend.models.textbook import TextbookInfo, Chapter

CHAPTER_PATTERN = re.compile(r'^第[一二三四五六七八九十百千\d]+[章篇]')
SHORT_LINE_THRESHOLD = 15


def parse_textbook(file_path: str) -> TextbookInfo:
    path = Path(file_path)
    doc = fitz.open(file_path)

    md_pages = pymupdf4llm.to_markdown(file_path, page_chunks=True)

    page_texts = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        page_texts.append(lines)

    header_footer = _detect_header_footer(page_texts, len(doc))

    full_md = ""
    for i, page_md in enumerate(md_pages):
        text = page_md.get("text", "")
        lines = text.split('\n')
        filtered = []
        short_line_count = 0
        for line in lines:
            if line.strip() in header_footer:
                continue
            if len(line.strip()) < SHORT_LINE_THRESHOLD:
                short_line_count += 1
                if short_line_count > 3:
                    continue
            else:
                short_line_count = 0
            filtered.append(line)
        full_md += '\n'.join(filtered) + '\n\n'

    chapters = _split_chapters(full_md, doc)

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
