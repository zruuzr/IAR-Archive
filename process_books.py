"""
books_indexer.py
Automated book indexing with multi-provider AI (Gemini + Groq fallback).
Uses anydoc for high-quality Markdown extraction (PDF, DOCX, XLSX, ...),
with pypdf as a fallback for edge cases.
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

import anydoc
from google import genai
from google.genai import types
from pypdf import PdfReader

# Groq اختياري — لا يوقف السكربت إذا لم يكن متاحاً
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False
    Groq = None  # type: ignore

LOG = logging.getLogger("books_indexer")

# ---------- مسارات وإعدادات ----------
JSON_PATH = Path("books.json")
PDF_DIR = Path("pdf")

# ---------- Gemini ----------
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
MAX_RETRIES = 5
RETRY_BACKOFF_SECONDS = (15, 30, 60, 120, 240)

# ---------- Groq ----------
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_MAX_RETRIES = 3
GROQ_RETRY_BACKOFF = (5, 15, 30)

# ---------- حدود المعالجة ----------
MAX_UPLOAD_SIZE_MB = int(os.environ.get("MAX_UPLOAD_SIZE_MB", "50"))
SAMPLE_TEXT_MAX_CHARS = 25_000
MEANINGFUL_TEXT_MIN_CHARS = 150
PDF_MAX_FILE_SIZE_MB = 500

# الامتدادات المدعومة من anydoc
SUPPORTED_DOC_EXTENSIONS = (
    ".pdf",
    ".doc", ".docx", ".docm",
    ".ppt", ".pps", ".pot", ".pptx", ".pptm", ".ppsx", ".ppsm",
    ".xls", ".xlsx", ".xlsm", ".xlsb",
    ".odt", ".ods", ".odp",
    ".rtf", ".epub", ".csv",
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
    """يُرفع عندما يفشل كل المزوّدين المتاحين."""
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
    # مصدر البيانات (للتشخيص)
    _ai_provider: str = field(default="", repr=False)

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


# ============================================================
# ZIP
# ============================================================

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
        ext = Path(member).suffix.lower()
        if ext not in SUPPORTED_DOC_EXTENSIONS:
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


# ============================================================
# استخراج النص — anydoc أولاً، ثم pypdf كاحتياط
# ============================================================

def extract_with_anydoc(file_path: Path) -> tuple[str, int, bool]:
    """يستخرج النص من أي مستند عبر anydoc. يعيد (markdown, pages, needs_ocr)."""
    try:
        markdown = anydoc.to_markdown(str(file_path))
        page_count = max(1, markdown.count("\n---") + 1) if markdown else 0
        return markdown, page_count, False

    except anydoc.NeedsOcrError as e:
        pages = getattr(e, "pages", []) or []
        page_count = getattr(e, "page_count", 0) or 0
        LOG.info(
            "anydoc: scanned PDF detected (%d pages need OCR) — %s",
            len(pages), file_path.name,
        )
        return "", page_count, True

    except anydoc.EncryptedError:
        LOG.warning("anydoc: encrypted file — %s", file_path.name)
        return "", 0, False

    except anydoc.UnsupportedError as e:
        LOG.warning("anydoc: unsupported format — %s (%s)", file_path.name, e)
        return "", 0, False

    except anydoc.MalformedError as e:
        LOG.warning("anydoc: malformed document — %s (%s)", file_path.name, e)
        return "", 0, False

    except anydoc.ResourceLimitError as e:
        LOG.warning("anydoc: resource limit exceeded — %s (%s)", file_path.name, e)
        return "", 0, False

    except anydoc.MissingPartError as e:
        LOG.warning("anydoc: missing required part — %s (%s)", file_path.name, e)
        return "", 0, False

    except anydoc.ConvertError as e:
        LOG.warning("anydoc: conversion failed — %s (%s)", file_path.name, e)
        return "", 0, False

    except OSError as e:
        LOG.warning("anydoc: cannot read file — %s (%s)", file_path.name, e)
        return "", 0, False


def extract_with_pypdf(file_path: Path) -> tuple[str, int]:
    """احتياط: استخراج النص من PDF باستخدام pypdf."""
    try:
        reader = PdfReader(str(file_path))
        total = len(reader.pages)
        if total == 0:
            return "", 0

        indices: set[int] = set(range(min(5, total)))
        indices.update(range(max(0, total - 3), total))

        scan_keywords = (
            "المؤلف", "author", "الناشر", "publisher",
            "ISBN", "الطبعة", "edition", "الفصل", "chapter",
        )
        if total > 15:
            for i in range(5, min(total, 20)):
                with suppress(Exception):
                    txt = (reader.pages[i].extract_text() or "").lower()
                    if any(k.lower() in txt for k in scan_keywords):
                        indices.add(i)
                        if len(indices) >= 30:
                            break

        parts: list[str] = []
        for i in sorted(indices):
            with suppress(Exception):
                page_text = reader.pages[i].extract_text()
                if page_text and len(page_text.strip()) > 20:
                    parts.append(f"\n--- Page {i + 1} ---\n{page_text}")

        return "\n".join(parts).strip(), total

    except Exception as e:
        LOG.warning("pypdf fallback failed — %s (%s)", file_path.name, e)
        return "", 0


def extract_document_text(file_path: Path) -> tuple[str, int, bool]:
    """anydoc أولاً، ثم pypdf كاحتياط لـ PDF فقط."""
    text, pages, needs_ocr = extract_with_anydoc(file_path)
    if text or needs_ocr:
        return text, pages, needs_ocr

    if file_path.suffix.lower() == ".pdf":
        LOG.info("anydoc returned empty — falling back to pypdf for %s", file_path.name)
        text, pages = extract_with_pypdf(file_path)
        if text:
            return text, pages, False

    return "", pages, False


def has_meaningful_text(text: str, min_chars: int = MEANINGFUL_TEXT_MIN_CHARS) -> bool:
    if not text or len(text.strip()) < min_chars:
        return False
    stripped = re.sub(r"\s+", "", text)
    if not stripped:
        return False
    meaningful = re.findall(r"[A-Za-z0-9\u0600-\u06FF]", text)
    return (len(meaningful) / len(stripped)) >= 0.25


# ============================================================
# JSON parsing
# ============================================================

def extract_json_object(raw_text: str) -> dict[str, Any]:
    if not raw_text:
        raise ValueError("Empty response from AI.")
    text = raw_text.strip()
    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = text[len(fence):]
            break
    if text.endswith("```"):
        text = text[:-3]

    first, last = text.find("{"), text.rfind("}")
    if first == -1 or last <= first:
        raise ValueError("No valid JSON object in AI response.")
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


# ============================================================
# Gemini
# ============================================================

def _gemini_is_retryable(error: Exception) -> bool:
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
            if not _gemini_is_retryable(e):
                raise

            if attempt == MAX_RETRIES:
                break

            delay = RETRY_BACKOFF_SECONDS[min(attempt - 1, len(RETRY_BACKOFF_SECONDS) - 1)]
            LOG.warning("Gemini attempt %d/%d failed: %s — retrying in %ds",
                        attempt, MAX_RETRIES, str(e)[:120], delay)
            time.sleep(delay)

    raise ApiUnavailableError(
        f"Gemini unavailable after {MAX_RETRIES} attempts"
    ) from last_error


# ============================================================
# Groq (fallback)
# ============================================================

def _groq_is_retryable(error: Exception) -> bool:
    msg = str(error).upper()
    if "429" in msg or "RATE_LIMIT" in msg or "TOO_MANY" in msg:
        return True
    if "503" in msg or "UNAVAILABLE" in msg or "TIMEOUT" in msg:
        return True
    return isinstance(error, (ConnectionError, TimeoutError))


def call_groq(client: "Groq", prompt: str, sample_text: str) -> str:
    """
    يستدعي Groq بـ JSON mode.
    ملاحظة: Groq لا يدعم رفع ملفات PDF — يعمل فقط مع النص المستخرج.
    """
    if not client:
        raise ApiUnavailableError("Groq client not initialized")

    user_content = f"{prompt}\n\nExtracted Content (Markdown):\n{sample_text[:SAMPLE_TEXT_MAX_CHARS]}"

    last_error: Exception | None = None
    for attempt in range(1, GROQ_MAX_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a professional book indexer. "
                            "Output ONLY a single valid JSON object. "
                            "No explanations, no markdown fences, no extra text."
                        ),
                    },
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=4096,
            )
            if response and response.choices:
                content = response.choices[0].message.content
                if content:
                    return content
            raise ValueError("Empty response from Groq")

        except Exception as e:
            last_error = e
            if not _groq_is_retryable(e):
                raise

            if attempt == GROQ_MAX_RETRIES:
                break

            delay = GROQ_RETRY_BACKOFF[min(attempt - 1, len(GROQ_RETRY_BACKOFF) - 1)]
            LOG.warning("Groq attempt %d/%d failed: %s — retrying in %ds",
                        attempt, GROQ_MAX_RETRIES, str(e)[:120], delay)
            time.sleep(delay)

    raise ApiUnavailableError(
        f"Groq unavailable after {GROQ_MAX_RETRIES} attempts"
    ) from last_error


# ============================================================
# بناء الحمولة
# ============================================================

def build_payload(file_name: str, sample_text: str,
                  uploaded_file: Any | None = None) -> Any:
    hint = f"\n\nملاحظة: اسم الملف الأصلي هو: {file_name}"
    prompt = JSON_SCHEMA_PROMPT + hint
    if uploaded_file:
        return [uploaded_file, prompt]
    return f"{prompt}\n\nExtracted Markdown:\n{sample_text[:SAMPLE_TEXT_MAX_CHARS]}"


# ============================================================
# التخزين
# ============================================================

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


# ============================================================
# معالجة كتاب واحد
# ============================================================

def process_one_book(
    gemini_client: genai.Client,
    groq_client: "Groq | None",
    file_path: Path,
    existing_ids: Iterable[int],
) -> Book | None:
    """
    يعالج ملف مستند واحد.

    الاستراتيجية:
    1. extract text via anydoc (with pypdf fallback)
    2. إذا كان PDF ممسوحاً: Gemini فقط (يحتاج file upload)
    3. إذا كان النص متاحاً:
       - جرّب Gemini أولاً
       - عند الفشل: جرّب Groq
    """
    name = file_path.name
    LOG.info("Processing: %s", name)

    file_size_mb = file_path.stat().st_size / (1024 * 1024)
    file_size_str = f"{file_size_mb:.2f} MB"
    next_id = max(existing_ids, default=0) + 1
    file_ext = file_path.suffix.upper().lstrip(".")

    if file_size_mb > PDF_MAX_FILE_SIZE_MB:
        LOG.warning(
            "SKIPPED — file exceeds size limit (%.1f MB > %d MB): %s",
            file_size_mb, PDF_MAX_FILE_SIZE_MB, name,
        )
        return None

    # ---- استخراج النص ----
    sample_text, pages_count, needs_ocr = extract_document_text(file_path)
    has_text = has_meaningful_text(sample_text)
    can_upload = file_size_mb <= MAX_UPLOAD_SIZE_MB

    # ---- المسار 1: PDF ممسوح ضوئياً → Gemini فقط ----
    if needs_ocr:
        if not can_upload:
            LOG.warning(
                "SKIPPED — scanned PDF exceeds upload limit "
                "(%.1f MB > %d MB): %s",
                file_size_mb, MAX_UPLOAD_SIZE_MB, name,
            )
            return None
        LOG.info("Scanned PDF — Gemini only (file upload required)")
        return _process_with_gemini_only(
            gemini_client, file_path, name, next_id,
            pages_count, file_size_str, file_ext,
        )

    # ---- المسار 2: نص متاح → Gemini ثم Groq ----
    if has_text:
        LOG.info("Using anydoc-extracted Markdown (%d chars, %d pages)",
                 len(sample_text), pages_count)

        # محاولة Gemini
        try:
            data = _call_and_parse_gemini(
                gemini_client, build_payload(name, sample_text),
            )
            if is_generic_response(data):
                raise ValueError("Gemini returned generic response")

            return _make_book(data, next_id, pages_count, file_size_str,
                              file_ext, file_path, provider="gemini")

        except (ApiUnavailableError, ValueError) as e:
            LOG.warning("Gemini failed for %s: %s", name, str(e)[:150])

            # احتياط: Groq
            if not groq_client:
                LOG.error("Gemini failed and Groq unavailable — skipping %s", name)
                return None

            try:
                LOG.info("Falling back to Groq for %s", name)
                raw = call_groq(groq_client, JSON_SCHEMA_PROMPT +
                                f"\n\nملاحظة: اسم الملف الأصلي هو: {name}",
                                sample_text)
                data = extract_json_object(raw)

                if is_generic_response(data):
                    LOG.warning("Groq returned generic response for %s", name)
                    return None

                return _make_book(data, next_id, pages_count, file_size_str,
                                  file_ext, file_path, provider="groq")

            except ApiUnavailableError as groq_err:
                LOG.error("Both providers failed for %s: %s", name, groq_err)
                return None
            except Exception:
                LOG.exception("Groq unexpected error for %s", name)
                return None

    # ---- المسار 3: لا نص، جرّب رفع الملف إلى Gemini ----
    if can_upload:
        LOG.info("No extractable text — uploading full file (%.1f MB)", file_size_mb)
        return _process_with_gemini_only(
            gemini_client, file_path, name, next_id,
            pages_count, file_size_str, file_ext,
        )

    LOG.warning(
        "SKIPPED — no extractable text and file exceeds upload limit "
        "(%.1f MB > %d MB): %s",
        file_size_mb, MAX_UPLOAD_SIZE_MB, name,
    )
    return None


def _make_book(
    data: dict[str, Any],
    next_id: int,
    pages_count: int,
    file_size_str: str,
    file_ext: str,
    file_path: Path,
    provider: str,
) -> Book:
    """ينشئ كائن Book من بيانات AI."""
    book = Book.from_gemini(
        data,
        id=next_id,
        pages=str(pages_count) if pages_count else str(data.get("pages") or ""),
        file_size=file_size_str,
        file_type=file_ext,
        file_path=str(file_path).replace(os.sep, "/"),
        cover_image=f"covers/{next_id}.png",
    )
    book._ai_provider = provider
    LOG.info("Successfully processed via %s: %s", provider, book.title)
    return book


def _call_and_parse_gemini(client: genai.Client, payload: Any) -> dict[str, Any]:
    return extract_json_object(call_gemini(client, payload))


def _process_with_gemini_only(
    client: genai.Client,
    file_path: Path,
    name: str,
    next_id: int,
    pages_count: int,
    file_size_str: str,
    file_ext: str,
) -> Book | None:
    """مسار خاص بـ PDF الممسوح ضوئياً — Gemini فقط مع file upload."""
    uploaded_file = None
    temp_path: Path | None = None

    try:
        temp_path, uploaded_file = _upload_pdf(client, file_path)
        data = _call_and_parse_gemini(client, build_payload(name, "", uploaded_file))

        if is_generic_response(data):
            LOG.warning("Gemini could not identify book: %s", name)
            return None

        return _make_book(data, next_id, pages_count, file_size_str,
                          file_ext, file_path, provider="gemini")

    except ApiUnavailableError:
        LOG.error("Gemini unavailable for scanned PDF: %s", name)
        return None
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


# ============================================================
# نقطة الدخول
# ============================================================

def main() -> None:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # ---------- Gemini ----------
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        raise SystemExit("GEMINI_API_KEY environment variable is missing.")
    gemini_client = genai.Client(api_key=gemini_key)
    LOG.info("Primary AI: Gemini (%s)", MODEL_NAME)

    # ---------- Groq (اختياري) ----------
    groq_client = None
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key and GROQ_AVAILABLE and Groq is not None:
        try:
            groq_client = Groq(api_key=groq_key)
            LOG.info("Fallback AI: Groq (%s)", GROQ_MODEL)
        except Exception as e:
            LOG.warning("Failed to init Groq: %s — continuing with Gemini only", e)
    elif groq_key and not GROQ_AVAILABLE:
        LOG.warning("GROQ_API_KEY set but groq package not installed — install it via requirements.txt")
    else:
        LOG.info("Fallback AI: disabled (GROQ_API_KEY not set)")

    LOG.info("Extractor: anydoc (with pypdf fallback)")

    extract_zip_archives(PDF_DIR)

    books = load_books(JSON_PATH)
    processed_paths = {os.path.normpath(b.get("file_path", "")) for b in books}

    if not PDF_DIR.is_dir():
        LOG.info("PDF directory not found; nothing to do.")
        return

    all_files: list[Path] = []
    for ext in SUPPORTED_DOC_EXTENSIONS:
        all_files.extend(PDF_DIR.glob(f"*{ext}"))
    all_files = sorted(set(all_files))

    LOG.info("Found %d document(s) to process.", len(all_files))

    halted = False
    skipped: list[str] = []

    for doc_path in all_files:
        if halted:
            break
        if os.path.normpath(str(doc_path)) in processed_paths:
            continue

        try:
            book = process_one_book(
                gemini_client, groq_client, doc_path,
                [b.get("id", 0) for b in books],
            )
            if book:
                # لا نحفظ _ai_provider في books.json — نزيله
                book_dict = asdict(book)
                book_dict.pop("_ai_provider", None)
                books.append(book_dict)
                processed_paths.add(os.path.normpath(str(doc_path)))
                save_books(JSON_PATH, books)
                LOG.info("Added: %s (via %s)", book.title, book._ai_provider)
            else:
                skipped.append(doc_path.name)
        except ApiUnavailableError as e:
            LOG.error("All AI providers unavailable; halting. Progress saved. (%s)", e)
            halted = True
        except Exception:
            LOG.exception("Unhandled error for %s", doc_path.name)

    if not halted:
        LOG.info("Processing completed successfully.")
        if skipped:
            LOG.warning("=" * 60)
            LOG.warning(
                "SKIPPED %d file(s) — no entries added to books.json:", len(skipped)
            )
            for n in skipped:
                LOG.warning("  • %s", n)
            LOG.warning("=" * 60)
            LOG.warning(
                "Review these files in pdf/. They will be retried on the next run."
            )


if __name__ == "__main__":
    main()
