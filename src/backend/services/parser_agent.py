import re
import fitz  # PyMuPDF
import pymupdf4llm
from pathlib import Path
from backend.models.textbook import TextbookInfo, Chapter

SHORT_LINE_THRESHOLD = 15
# Patterns that indicate TOC/index/bibliography sections
JUNK_PATTERNS = re.compile(
    r'(目\s*录|推荐\s*阅读|中英文名词对照|索引|参考文献|附录|图片列表|表格列表|'
    r'\.{3,}|\.{5,}|End of picture text)'
)
# Chapter heading: 第X章 or 第X篇
CHAPTER_RE = re.compile(r'^(#{1,3}\s+)?第[一二三四五六七八九十百千\d]+[章篇]')
# Section heading: 第X节
SECTION_RE = re.compile(r'^(#{1,3}\s+)?第[一二三四五六七八九十百千\d]+[节]')
# Markdown heading
MD_HEADING_RE = re.compile(r'^(#{1,6})\s+(.+)')


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

    # Remove TOC, bibliography, index
    full_md = _remove_toc_and_index(full_md)

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


def _remove_toc_and_index(md: str) -> str:
    """Remove TOC (lines with dot leaders) and bibliography/index sections."""
    lines = md.split('\n')
    result = []
    skip = False

    for line in lines:
        stripped = line.strip()

        # Detect TOC start (line with lots of dots = page number leaders)
        if re.search(r'\.{5,}', stripped) or re.search(r'\.\s+\d+\s*$', stripped):
            skip = True
            continue

        # Detect section headers for junk
        if JUNK_PATTERNS.search(stripped) and len(stripped) < 30:
            skip = True
            continue

        # End of picture text marker
        if 'End of picture text' in stripped:
            continue

        # If we were skipping, check if we hit a real chapter heading
        if skip:
            if CHAPTER_RE.match(stripped) or (MD_HEADING_RE.match(stripped) and not JUNK_PATTERNS.search(stripped)):
                skip = False
            else:
                continue

        result.append(line)

    return '\n'.join(result)


def _split_chapters(full_md: str, doc) -> list[Chapter]:
    """Split into chapters using heading detection."""
    lines = full_md.split('\n')

    # Find chapter-level headings (第X章 pattern)
    chapter_starts = []  # (line_idx, title)
    for i, line in enumerate(lines):
        stripped = line.strip()
        if CHAPTER_RE.match(stripped):
            # Clean up the title: remove markdown heading markers and page numbers
            title = re.sub(r'^#{1,3}\s+', '', stripped)
            title = re.sub(r'\s*\d+$', '', title).strip()  # Remove trailing page number
            chapter_starts.append((i, title))

    if not chapter_starts:
        # Fallback: one big chapter
        content = full_md.strip()
        return [Chapter(
            chapter_id="ch_00",
            title="全文",
            page_start=1,
            page_end=len(doc),
            content=content,
            char_count=len(content),
        )]

    # Build raw segments from each chapter heading
    raw_segments = []
    for idx, (start_line, title) in enumerate(chapter_starts):
        end_line = chapter_starts[idx + 1][0] if idx + 1 < len(chapter_starts) else len(lines)
        content = '\n'.join(lines[start_line:end_line]).strip()
        raw_segments.append((title, content))

    # Merge consecutive segments with the same title
    # (pymupdf4llm outputs the chapter title as a running header on every page)
    def _norm_title(t: str) -> str:
        """Normalize title for comparison: remove extra spaces."""
        return re.sub(r'\s+', '', t)

    merged_segments = []
    for title, content in raw_segments:
        norm = _norm_title(title)
        if merged_segments and _norm_title(merged_segments[-1][0]) == norm:
            prev_title, prev_content = merged_segments[-1]
            merged_segments[-1] = (prev_title, prev_content + '\n\n' + content)
        else:
            merged_segments.append((title, content))

    chapters = []
    for idx, (title, content) in enumerate(merged_segments):
        if len(content) < 200 and chapters:
            chapters[-1].content += '\n\n' + content
            chapters[-1].char_count = len(chapters[-1].content)
            continue

        chapters.append(Chapter(
            chapter_id=f"ch_{idx:02d}",
            title=title,
            page_start=1,
            page_end=len(doc),
            content=content,
            char_count=len(content),
        ))

    return chapters


def _extract_table_titles(content: str) -> list[str]:
    return re.findall(r'表[\d\-\.]+\s+[^\n]+', content)
