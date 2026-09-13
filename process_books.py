"""
books_indexer.py
Automated PDF book indexing with Gemini 3.6 Flash.
"""
from __future__ import annotations

import json
import logging
import os
import re
import shutil
import tempfile
import time
import zipfile
from contextlib import suppress
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Iterable

from google import genai
from google.genai import types
from pypdf import PdfReader

LOG = logging.getLogger("books_indexer")

JSON_PATH = Path("books.json")
PDF_DIR = Path("pdf")
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
MAX_UPLOAD_SIZE_MB = int(os.environ.get("MAX_UPLOAD_SIZE_MB", "50"))
MAX_RETRIES = 5
RETRY_BACKOFF_SECONDS = (15, 30, 60, 120, 240)

SAMPLE_TEXT_MAX_CHARS = 25_000
MEANINGFUL_TEXT_MIN_CHARS = 150
PDF_SAMPLE_MAX_PAGES = 30
PDF_MAX_FILE_SIZE_MB = 500
PDF_SCAN_KEYWORDS = (
    "المؤلف", "author", "الناشر", "publisher",
    "ISBN", "الطبعة", "edition", "الفصل", "chapter",
)

BANNED_TITLES = frozenset({
    "غير معروف", "unknown", "unspecified", "وثيقة نصية",
    "نص غير محدد", "نص مجزأ", "fragment", "unknown document", "غير محدد",
})

JSON_SCHEMA_PROMPT = """
أنت مفهرس كتب محترف. مهمتك استخراج بيانات الكتاب الحقيقية بدقة من المحتوى المرفق.

أعد كائن JSON واحد فقط بالهيكل التالي حرفياً وبدون أي تغيير:

{
  "title": "العنوان الحقيقي بالعربية",
  "title_en": "العنوان بالإنجليزية",
  "author": "اسم المؤلف بالعربية أو اتركه فارغاً إذا تعذر إيجاده تماماً",
  "author_en": "اسم المؤلف بالإنجليزية",
  "category": "التصنيف بالعربية",
  "category_en": "التصنيف بالإنجليزية",
  "type": "نوع الكتاب بالعربية",
  "type_en": "نوع الكتاب بالإنجليزية",
  "description": "وصف شامل بالعربية",
  "description_en": "وصف شامل بالإنجليزية",
  "publisher": "الناشر بالعربية",
  "publisher_en": "الناشر بالإنجليزية",
  "year": "سنة النشر",
  "isbn": "الرقم الدولي المعياري أو نص فارغ",
  "keywords": ["كلمة1", "كلمة2"],
  "keywords_en": ["Word1", "Word2"],
  "key_points": ["نقطة1", "نقطة2"],
  "key_points_en": ["Point1", "Point2"],
  "target_audience": "الجمهور المستهدف بالعربية",
  "target_audience_en": "الجمهور المستهدف بالإنجليزية"
}

قواعد صارمة جداً:
1. ابحث بدقة عن اسم المؤلف والناشر في صفحات الغلاف أو صفحة الحقوق والملكية الفكرية.
2. تأكد من أن keywords و key_points هي دائماً مصفوفات (Arrays) وليست نصوصاً.
3. لا تكتب أبداً في العنوان "وثيقة نصية" أو "نص مجزأ" أو "غير محدد".
4. أعد فقط كائن JSON واحد بدون أي نص إضافي.
"""


class ApiUnavailableError(RuntimeError):
    pass


@dataclass
class Book:
    id: int
    title: str = ""
    title_en: str = ""
    author: str = ""
    author_en: str = ""
    category: str = "غير مصنف"
    category_en: str = "Uncategorized"
    type: str = "كتاب"
    type_en: str = "Book"
    description: str = ""
    description_en: str = ""
    publisher: str = ""
    publisher_en: str = ""
    year: str = ""
    isbn: str = ""
    keywords: list[str] = field(default_factory=list)
    keywords_en: list[str] = field(default_factory=list)
    key_points: list[str] = field(default_factory=list)
    key_points_en: list[str] = field(default_factory=list)
    target_audience: str = ""
    target_audience_en: str = ""
    pages: str = ""
    file_size: str = ""
    file_type: str = "PDF"
    file_path: str = ""
    cover_image: str = ""

    @classmethod
    def from_gemini(cls, data: dict[str, Any], **overrides: Any) -> "Book":
        return cls(
            id=overrides.pop("id"),
            title=str(data.get("title") or ""),
            title_en=str(data.get("title_en") or ""),
            author=str(data.get("author") or ""),
            author_en=str(data.get("author_en") or ""),
            category=str(data.get("category") or "غير مصنف"),
            category_en=str(data.get("category_en") or "Uncategorized"),
            type=str(data.get("type") or "كتاب"),
            type_en=str(data.get("type_en") or "Book"),
            description=str(data.get("description") or ""),
            description_en=str(data.get("description_en") or ""),
            publisher=str(data.get("publisher") or ""),
            publisher_en=str(data.get("publisher_en") or ""),
            year=str(data.get("year") or ""),
            isbn=str(data.get("isbn") or ""),
            keywords=safe_list(data.get("keywords")),
            keywords_en=safe_list(data.get("keywords_en")),
            key_points=safe_list(data.get("key_points")),
            key_points_en=safe_list(data.get("key_points_en")),
            target_audience=str(data.get("target_audience") or ""),
            target_audience_en=str(data.get("target_audience_en") or ""),
            **overrides,
        )


def safe_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value if v is not None and str(v).strip()]
    if value in (None, ""):
        return []
    return [str(value)]


def decode_zip_name(name: str) -> str:
    with suppress(UnicodeEncodeError, UnicodeDecodeError):
        return name.encode("cp437").decode("utf-8")
    return name


def is_safe_zip_member(member: str) -> bool:
    if not member or member.endswith("/"):
        return False
    if ".." in member.split("/") or "\\" in member:
        return False
    return True


def extract_zip_archives(pdf_dir: Path) -> None:
    if not pdf_dir.is_dir():
        return

    for zip_path in sorted(pdf_dir.glob("*.zip")):
        LOG.info("Extracting ZIP archive: %s", zip_path.name)
        try:
            with zipfile.ZipFile(zip_path) as zf:
                _extract_zip_members(zf, pdf_dir)
            zip_path.unlink()
            LOG.info("Removed ZIP archive: %s", zip_path.name)
        except zipfile.BadZipFile:
            LOG.warning("Invalid ZIP file: %s", zip_path.name)
        except OSError as e:
            LOG.error("Error extracting %s: %s", zip_path.name, e)


def _extract_zip_members(zf: zipfile.ZipFile, target_dir: Path) -> None:
    for raw_member in zf.namelist():
        member = decode_zip_name(raw_member)
        if not member.lower().endswith(".pdf"):
            continue
        if not is_safe_zip_member(member):
            LOG.warning("Skipped unsafe path: %s", member)
            continue

        target = _unique_path(target_dir / Path(member).name)
        try:
            with zf.open(raw_member) as src, target.open("wb") as dst:
                shutil.copyfileobj(src, dst)
            LOG.info("Extracted: %s", target.name)
        except OSError as e:
            LOG.error("Failed to extract %s: %s", member, e)


def _unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem, suffix, parent = path.stem, path.suffix, path.parent
    counter = 1
    while (candidate := parent / f"{stem}_{counter}{suffix}").exists():
        counter += 1
    return candidate


def read_pdf(file_path: Path) -> tuple[PdfReader | None, int]:
    try:
        reader = PdfReader(str(file_path))
        return reader, len(reader.pages)
    except Exception as e:
        LOG.warning("Cannot open PDF %s: %s", file_path.name, e)
        return None, 0


def smart_extract_text(reader: PdfReader, max_pages: int = PDF_SAMPLE_MAX_PAGES) -> str:
    total = len(reader.pages)
    if total == 0:
        return ""

    indices: set[int] = set(range(min(5, total)))
    indices.update(range(max(0, total - 3), total))

    if total > 15:
        for i in range(5, min(total, 20)):
            with suppress(Exception):
                txt = (reader.pages[i].extract_text() or "").lower()
                if any(k.lower() in txt for k in PDF_SCAN_KEYWORDS):
                    indices.add(i)
                    if len(indices) >= max_pages:
                        break

    parts: list[str] = []
    for i in sorted(indices):
        with suppress(Exception):
            page_text = reader.pages[i].extract_text()
            if page_text and len(page_text.strip()) > 20:
                parts.append(f"\n--- Page {i + 1} ---\n{page_text}")
    return "\n".join(parts).strip()


def has_meaningful_text(text: str, min_chars: int = MEANINGFUL_TEXT_MIN_CHARS) -> bool:
    if not text or len(text.strip()) < min_chars:
        return False
    stripped = re.sub(r"\s+", "", text)
    if not stripped:
        return False
    meaningful = re.findall(r"[A-Za-z0-9\u0600-\u06FF]", text)
    return (len(meaningful) / len(stripped)) >= 0.25


def extract_json_object(raw_text: str) -> dict[str, Any]:
    if not raw_text:
        raise ValueError("Empty response from Gemini.")
    text = raw_text.strip()
    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = text[len(fence):]
            break
    if text.endswith("```"):
        text = text[:-3]

    first, last = text.find("{"), text.rfind("}")
    if first == -1 or last <= first:
        raise ValueError("No valid JSON object in Gemini response.")
    return json.loads(text[first:last + 1])


def is_generic_response(data: dict[str, Any]) -> bool:
    if not isinstance(data, dict):
        return True
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    if len(title) < 2 or len(description) < 10:
        return True
    combined = f"{title} {description}".lower()
    return any(bad in combined for bad in BANNED_TITLES)


def _is_retryable(error: Exception) -> bool:
    msg = str(error).upper()
    if any(re.search(rf"\b{code}\b", msg) for code in ("429", "500", "502", "503", "504")):
        return True
    if any(kw in msg for kw in ("UNAVAILABLE", "RESOURCE_EXHAUSTED",
                                "DEADLINE_EXCEEDED", "TIMEOUT", "CONNECTION")):
        return True
    return isinstance(error, (ConnectionError, TimeoutError))


def call_gemini(client: genai.Client, payload: Any) -> str:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=payload,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
            if response and response.text:
                return response.text
            raise ValueError("Empty response from Gemini")

        except Exception as e:
            last_error = e
            if not _is_retryable(e):
                raise

            if attempt == MAX_RETRIES:
                break

            delay = RETRY_BACKOFF_SECONDS[min(attempt - 1, len(RETRY_BACKOFF_SECONDS) - 1)]
            LOG.warning("Attempt %d/%d failed: %s — retrying in %ds",
                        attempt, MAX_RETRIES, str(e)[:120], delay)
            time.sleep(delay)

    raise ApiUnavailableError(f"API unavailable after {MAX_RETRIES} attempts") from last_error


def build_payload(file_name: str, sample_text: str,
                  uploaded_file: Any | None = None) -> Any:
    hint = f"\n\nملاحظة: اسم الملف الأصلي هو: {file_name}"
    prompt = JSON_SCHEMA_PROMPT + hint
    if uploaded_file:
        return [uploaded_file, prompt]
    return f"{prompt}\n\nExtracted Text:\n{sample_text[:SAMPLE_TEXT_MAX_CHARS]}"


def build_fallback_book(file_name: str, next_id: int, file_path: Path,
                        file_size: str, pages: str) -> Book:
    title = Path(file_name).stem.replace("_", " ").replace("-", " ").strip()
    return Book(
        id=next_id,
        title=title,
        category="غير مصنف",
        category_en="Uncategorized",
        type="كتاب",
        type_en="Book",
        description=f"كتاب بعنوان '{title}'. لم تتمكن أداة التحليل من قراءة محتواه بالكامل.",
        description_en=f"A book titled '{title}'. Content could not be fully analyzed.",
        keywords=[title],
        key_points=["يتطلب مراجعة يدوية لاستكمال البيانات."],
        key_points_en=["Manual review required."],
        pages=pages,
        file_size=file_size,
        file_path=str(file_path).replace(os.sep, "/"),
        cover_image=f"covers/{next_id}.png",
    )


def load_books(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError) as e:
        LOG.error("Cannot read %s: %s", path, e)
        return []


def save_books(path: Path, books: list[dict[str, Any]]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(books, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def process_one_book(client: genai.Client, file_path: Path,
                     existing_ids: Iterable[int]) -> Book | None:
    name = file_path.name
    LOG.info("Processing: %s", name)

    reader, pages_count = read_pdf(file_path)
    file_size_mb = file_path.stat().st_size / (1024 * 1024)
    file_size_str = f"{file_size_mb:.2f} MB"
    next_id = max(existing_ids, default=0) + 1

    if file_size_mb > PDF_MAX_FILE_SIZE_MB:
        LOG.warning("File too large (%.1f MB); using fallback", file_size_mb)
        return build_fallback_book(name, next_id, file_path, file_size_str, str(pages_count))

    sample_text = smart_extract_text(reader) if reader else ""
    has_text = has_meaningful_text(sample_text)
    can_upload = file_size_mb <= MAX_UPLOAD_SIZE_MB

    uploaded_file = None
    temp_path: Path | None = None

    try:
        if has_text:
            LOG.info("Using local extracted text")
            payload = build_payload(name, sample_text)
        elif can_upload:
            LOG.info("Uploading full PDF (%.1f MB)", file_size_mb)
            temp_path, uploaded_file = _upload_pdf(client, file_path)
            payload = build_payload(name, "", uploaded_file)
        else:
            LOG.warning("Large file without usable text; skipping API")
            return build_fallback_book(name, next_id, file_path, file_size_str, str(pages_count))

        data = _call_and_parse(client, payload)
        if is_generic_response(data) and not has_text and can_upload:
            LOG.info("Generic response; retrying with uploaded file")
            if not uploaded_file:
                temp_path, uploaded_file = _upload_pdf(client, file_path)
            data = _call_and_parse(client, build_payload(name, "", uploaded_file))

        if is_generic_response(data):
            LOG.warning("Gemini could not identify book; using fallback")
            return build_fallback_book(name, next_id, file_path, file_size_str, str(pages_count))

        return Book.from_gemini(
            data,
            id=next_id,
            pages=str(pages_count) if pages_count else str(data.get("pages") or ""),
            file_size=file_size_str,
            file_path=str(file_path).replace(os.sep, "/"),
            cover_image=f"covers/{next_id}.png",
        )

    finally:
        if uploaded_file:
            with suppress(Exception):
                client.files.delete(name=uploaded_file.name)
        if temp_path and temp_path.exists():
            with suppress(OSError):
                temp_path.unlink()


def _upload_pdf(client: genai.Client, file_path: Path) -> tuple[Path, Any]:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        temp_path = Path(tmp.name)
    shutil.copyfile(file_path, temp_path)
    return temp_path, client.files.upload(file=str(temp_path))


def _call_and_parse(client: genai.Client, payload: Any) -> dict[str, Any]:
    return extract_json_object(call_gemini(client, payload))


def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY environment variable is missing.")
    client = genai.Client(api_key=api_key)
    LOG.info("Provider: Gemini (%s)", MODEL_NAME)

    extract_zip_archives(PDF_DIR)

    books = load_books(JSON_PATH)
    processed_paths = {os.path.normpath(b.get("file_path", "")) for b in books}

    if not PDF_DIR.is_dir():
        LOG.info("PDF directory not found; nothing to do.")
        return

    halted = False
    for pdf_path in sorted(PDF_DIR.glob("*.pdf")):
        if halted:
            break
        if os.path.normpath(str(pdf_path)) in processed_paths:
            continue

        try:
            book = process_one_book(client, pdf_path, [b.get("id", 0) for b in books])
            if book:
                books.append(asdict(book))
                processed_paths.add(os.path.normpath(str(pdf_path)))
                save_books(JSON_PATH, books)
                LOG.info("Added: %s", book.title)
        except ApiUnavailableError as e:
            LOG.error("API unavailable; halting. Progress saved. (%s)", e)
            halted = True
        except Exception:
            LOG.exception("Unhandled error for %s", pdf_path.name)

    if not halted:
        LOG.info("Processing completed successfully.")


if __name__ == "__main__":
    main()
