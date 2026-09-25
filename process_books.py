"""
IAR Archive — automated book indexing.

Pipeline:
    document
        ↓
    anydoc / pypdf extraction
        ↓
    Gemini structured extraction
        ↓
    Groq JSON fallback
        ↓
    local validation / normalization
        ↓
    books.json

Design goals:
- Safe and repeatable processing.
- Gemini first, Groq fallback.
- Structured JSON from Gemini.
- SHA-256 tracking for future re-processing decisions.
- Safe ZIP extraction.
- Atomic books.json writes.
- No secrets written to generated JSON.
"""

from __future__ import annotations

import hashlib
import json
import logging
import mimetypes
import os
import re
import shutil
import tempfile
import time
import zipfile

from contextlib import suppress
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import anydoc
from google import genai
from google.genai import types
from pypdf import PdfReader

try:
    from groq import Groq
except ImportError:
    Groq = None


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

JSON_PATH = Path("books.json")
PDF_DIR = Path("pdf")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

GEMINI_RETRIES = 5
GROQ_RETRIES = 3

MAX_UPLOAD_SIZE_MB = 50
MAX_PDF_SIZE_MB = 500
MAX_SAMPLE_CHARS = 25_000
MIN_MEANINGFUL_TEXT = 150
MAX_BOOKS = 10_000

SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".docm",
    ".ppt",
    ".pps",
    ".pot",
    ".pptx",
    ".pptm",
    ".ppsx",
    ".ppsm",
    ".xls",
    ".xlsx",
    ".xlsm",
    ".xlsb",
    ".odt",
    ".ods",
    ".odp",
    ".rtf",
    ".epub",
    ".csv",
}

SUPPORTED_DOCUMENT_EXTENSIONS = SUPPORTED_EXTENSIONS - {
    ".zip",
}

GENERIC_BANNED_TITLES = {
    "",
    "unknown",
    "untitled",
    "book",
    "document",
    "ملف",
    "كتاب",
    "مستند",
    "غير معروف",
    "بدون عنوان",
}

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("iar-archive")


# ---------------------------------------------------------------------------
# AI schema
# ---------------------------------------------------------------------------

AI_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
        },
        "title_en": {
            "type": "string",
        },
        "author": {
            "type": "string",
        },
        "category": {
            "type": "string",
        },
        "type": {
            "type": "string",
        },
        "description": {
            "type": "string",
        },
        "publisher": {
            "type": "string",
        },
        "year": {
            "type": "integer",
        },
        "isbn": {
            "type": "string",
        },
        "keywords": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "key_points": {
            "type": "array",
            "items": {
                "type": "string",
            },
        },
        "target_audience": {
            "type": "string",
        },
    },
    "required": [
        "title",
        "title_en",
        "author",
        "category",
        "type",
        "description",
        "publisher",
        "year",
        "isbn",
        "keywords",
        "key_points",
        "target_audience",
    ],
}


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

AI_PROMPT = """
You are an expert bibliographic metadata extraction system for
IAR Archive — the Iraqi Administrative Reference Repository.

Your task is to extract factual metadata from the provided document.

Rules:
1. Do not invent information.
2. Prefer the title printed on the cover/title page.
3. Prefer the actual author/editor/organization stated in the document.
4. Identify the publisher only when it is explicitly supported.
5. Extract the publication year when supported.
6. Extract ISBN only when explicitly available.
7. Categorize the document according to its actual administrative,
   management, legal, accounting, educational, organizational,
   cybersecurity, public-policy, or related subject matter.
8. Write a concise factual description suitable for a reference archive.
9. key_points must contain useful concepts actually present in the text.
10. keywords should be concise subject terms.
11. target_audience should identify the most relevant readers.
12. title_en may be empty when an English title is not supported.
13. year must be 0 when the publication year cannot be reliably determined.
14. Never fabricate authors, publishers, ISBNs, dates, or concepts.
15. Return JSON only according to the supplied schema.

The output is for a public reference repository, so factual accuracy
is more important than filling every field.
""".strip()


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Book:
    id: int
    title: str
    title_en: str = ""
    author: str = ""
    author_en: str = ""
    category: str = ""
    category_en: str = ""
    description: str = ""
    description_en: str = ""
    publisher: str = ""
    publisher_en: str = ""
    type: str = ""
    type_en: str = ""
    target_audience: str = ""
    target_audience_en: str = ""
    year: int = 0
    pages: int = 0
    file_size: str = ""
    isbn: str = ""
    keywords: list[str] = field(default_factory=list)
    keywords_en: list[str] = field(default_factory=list)
    key_points: list[str] = field(default_factory=list)
    key_points_en: list[str] = field(default_factory=list)
    featured: bool = False
    badge_text: str = ""
    badge_text_en: str = ""
    file_path: str = ""
    file_name: str = ""
    cover_image: str = ""
    source_sha256: str = ""

    _ai_provider: str = field(
        default="",
        repr=False,
        compare=False,
    )

    def to_json_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data.pop("_ai_provider", None)
        return data


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def normalize_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_list(value: Any, limit: int = 50) -> list[str]:
    if not isinstance(value, list):
        return []

    result: list[str] = []

    for item in value[:limit]:
        value_string = normalize_string(item)

        if value_string:
            result.append(value_string)

    return result


def safe_int(value: Any) -> int:
    if value in (None, "", False):
        return 0

    try:
        number = int(value)
    except (TypeError, ValueError):
        return 0

    return number if number >= 0 else 0


def format_file_size(size_bytes: int) -> str:
    if size_bytes <= 0:
        return "0 B"

    units = ("B", "KB", "MB", "GB")
    size = float(size_bytes)

    for unit in units:
        if size < 1024 or unit == units[-1]:
            if unit == "B":
                return f"{int(size)} {unit}"
            return f"{size:.1f} {unit}"

        size /= 1024

    return f"{size:.1f} GB"


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as file:
        while True:
            chunk = file.read(chunk_size)

            if not chunk:
                break

            digest.update(chunk)

    return digest.hexdigest()


def safe_filename(path: Path) -> str:
    name = path.name.strip()

    name = re.sub(
        r"[^\w\-.()\[\]{} ]+",
        "_",
        name,
        flags=re.UNICODE,
    )

    return name or "document"


def atomic_write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = path.with_suffix(path.suffix + ".tmp")

    payload = json.dumps(
        data,
        ensure_ascii=False,
        indent=2,
    )

    temp_path.write_text(
        payload + "\n",
        encoding="utf-8",
    )

    temp_path.replace(path)


def load_books() -> list[dict[str, Any]]:
    if not JSON_PATH.exists():
        return []

    try:
        raw = json.loads(
            JSON_PATH.read_text(encoding="utf-8")
        )
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Invalid JSON in {JSON_PATH}: {exc}"
        ) from exc

    if not isinstance(raw, list):
        raise RuntimeError(
            f"{JSON_PATH} must contain a top-level array."
        )

    return raw


def save_books(books: list[dict[str, Any]]) -> None:
    if len(books) > MAX_BOOKS:
        raise RuntimeError(
            f"Refusing to save more than {MAX_BOOKS} books."
        )

    atomic_write_json(
        JSON_PATH,
        books,
    )


def next_book_id(books: list[dict[str, Any]]) -> int:
    ids: list[int] = []

    for item in books:
        try:
            value = int(item.get("id"))
        except (TypeError, ValueError):
            continue

        if value >= 0:
            ids.append(value)

    return max(ids, default=0) + 1


def extension_for(path: Path) -> str:
    return path.suffix.lower()


def is_supported_document(path: Path) -> bool:
    return (
        path.is_file()
        and extension_for(path) in SUPPORTED_DOCUMENT_EXTENSIONS
    )


# ---------------------------------------------------------------------------
# ZIP handling
# ---------------------------------------------------------------------------

def decode_zip_name(name: str) -> str:
    """
    Best-effort conversion for legacy ZIP filenames.
    UTF-8 names remain untouched.
    """
    try:
        encoded = name.encode("cp437")
        decoded = encoded.decode("utf-8")
        return decoded
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name


def is_safe_archive_member(name: str) -> bool:
    normalized = name.replace("\\", "/")

    if normalized.startswith("/"):
        return False

    parts = Path(normalized).parts

    if any(part in ("", ".", "..") for part in parts):
        return False

    if ":" in parts[0]:
        return False

    return True


def extract_zips() -> list[Path]:
    extracted: list[Path] = []

    if not PDF_DIR.exists():
        return extracted

    zip_files = sorted(
        [
            path
            for path in PDF_DIR.iterdir()
            if path.is_file()
            and path.suffix.lower() == ".zip"
        ]
    )

    for archive in zip_files:
        logger.info("Extracting ZIP: %s", archive)

        with zipfile.ZipFile(archive, "r") as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue

                raw_name = decode_zip_name(member.filename)

                if not is_safe_archive_member(raw_name):
                    logger.warning(
                        "Skipping unsafe ZIP member: %s",
                        member.filename,
                    )
                    continue

                suffix = Path(raw_name).suffix.lower()

                if suffix not in SUPPORTED_DOCUMENT_EXTENSIONS:
                    continue

                target_name = safe_filename(Path(raw_name))

                destination = PDF_DIR / target_name

                counter = 1
                while destination.exists():
                    destination = (
                        PDF_DIR
                        / f"{destination.stem}-{counter}{destination.suffix}"
                    )
                    counter += 1

                with zf.open(member, "r") as source, destination.open(
                    "wb"
                ) as target:
                    shutil.copyfileobj(
                        source,
                        target,
                        length=1024 * 1024,
                    )

                extracted.append(destination)

        with suppress(OSError):
            archive.unlink()

    return extracted


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def extract_with_anydoc(path: Path) -> str:
    try:
        text = anydoc.to_markdown(str(path))
    except anydoc.NeedsOcrError:
        raise
    except anydoc.ConvertError as exc:
        logger.warning(
            "anydoc could not fully convert %s: %s",
            path,
            exc,
        )
        return ""
    except OSError as exc:
        logger.warning(
            "I/O error while converting %s: %s",
            path,
            exc,
        )
        return ""

    return normalize_string(text)


def extract_pdf_with_pypdf(path: Path) -> tuple[str, int]:
    try:
        reader = PdfReader(
            str(path),
            strict=False,
        )

        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                logger.warning(
                    "Encrypted PDF could not be opened: %s",
                    path,
                )
                return "", len(reader.pages)

        pages = len(reader.pages)

        text_parts: list[str] = []

        scan_indices: list[int] = []

        for index in range(min(pages, 20)):
            scan_indices.append(index)

        for index in range(max(20, pages - 5), pages):
            if 0 <= index < pages:
                scan_indices.append(index)

        seen: set[int] = set()

        for index in scan_indices:
            if index in seen:
                continue

            seen.add(index)

            with suppress(Exception):
                page_text = reader.pages[index].extract_text() or ""

                if page_text.strip():
                    text_parts.append(page_text)

        text = "\n\n".join(text_parts)

        return normalize_string(text), pages

    except Exception as exc:
        logger.warning(
            "pypdf extraction failed for %s: %s",
            path,
            exc,
        )
        return "", 0


def extract_document_text(path: Path) -> tuple[str, int, bool]:
    """
    Returns:
        text
        page_count
        requires_ocr
    """

    page_count = 0

    if extension_for(path) == ".pdf":
        pdf_text, page_count = extract_pdf_with_pypdf(path)

        try:
            markdown = extract_with_anydoc(path)

            if len(markdown) >= len(pdf_text):
                pdf_text = markdown

        except anydoc.NeedsOcrError:
            return pdf_text, page_count, True

        return pdf_text, page_count, False

    try:
        markdown = extract_with_anydoc(path)

        return markdown, 0, False

    except anydoc.NeedsOcrError:
        return "", 0, True


# ---------------------------------------------------------------------------
# AI helpers
# ---------------------------------------------------------------------------

def extract_json_object(value: str) -> dict[str, Any]:
    text = normalize_string(value)

    if not text:
        raise ValueError("AI response is empty.")

    fenced = re.search(
        r"```(?:json)?\s*(\{.*\})\s*```",
        text,
        flags=re.DOTALL | re.IGNORECASE,
    )

    if fenced:
        text = fenced.group(1).strip()

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")

        if start < 0 or end <= start:
            raise ValueError("No JSON object found in AI response.")

        parsed = json.loads(text[start : end + 1])

    if not isinstance(parsed, dict):
        raise ValueError(
            "AI response JSON must be an object."
        )

    return parsed


def build_prompt(text: str) -> str:
    sample = text[:MAX_SAMPLE_CHARS]

    return (
        f"{AI_PROMPT}\n\n"
        "DOCUMENT CONTENT:\n"
        "-----------------\n"
        f"{sample}\n"
        "-----------------\n"
    )


def retry_sleep(attempt: int) -> None:
    delay = 15 * (2 ** (attempt - 1))

    time.sleep(delay)


def make_gemini_client() -> Any | None:
    if not GEMINI_API_KEY:
        return None

    return genai.Client(
        api_key=GEMINI_API_KEY
    )


def call_gemini_text(
    client: Any,
    text: str,
) -> dict[str, Any]:
    prompt = build_prompt(text)

    last_error: Exception | None = None

    for attempt in range(1, GEMINI_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AI_RESPONSE_SCHEMA,
                ),
            )

            return extract_json_object(
                response.text or ""
            )

        except Exception as exc:
            last_error = exc

            logger.warning(
                "Gemini text attempt %s/%s failed: %s",
                attempt,
                GEMINI_RETRIES,
                exc,
            )

            if attempt < GEMINI_RETRIES:
                retry_sleep(attempt)

    raise RuntimeError(
        "Gemini text extraction failed."
    ) from last_error


def call_gemini_file(
    client: Any,
    path: Path,
) -> dict[str, Any]:
    if path.stat().st_size > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise RuntimeError(
            f"Gemini upload skipped because {path.name} exceeds "
            f"{MAX_UPLOAD_SIZE_MB} MB."
        )

    last_error: Exception | None = None

    for attempt in range(1, GEMINI_RETRIES + 1):
        uploaded = None

        try:
            uploaded = client.files.upload(
                file=str(path)
            )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    AI_PROMPT,
                    uploaded,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AI_RESPONSE_SCHEMA,
                ),
            )

            result = extract_json_object(
                response.text or ""
            )

            with suppress(Exception):
                client.files.delete(
                    name=uploaded.name
                )

            return result

        except Exception as exc:
            last_error = exc

            logger.warning(
                "Gemini file attempt %s/%s failed: %s",
                attempt,
                GEMINI_RETRIES,
                exc,
            )

            if uploaded is not None:
                with suppress(Exception):
                    client.files.delete(
                        name=uploaded.name
                    )

            if attempt < GEMINI_RETRIES:
                retry_sleep(attempt)

    raise RuntimeError(
        f"Gemini file extraction failed for {path.name}."
    ) from last_error


def make_groq_client() -> Any | None:
    if not GROQ_API_KEY or Groq is None:
        return None

    return Groq(
        api_key=GROQ_API_KEY
    )


def call_groq(
    client: Any,
    text: str,
) -> dict[str, Any]:
    prompt = build_prompt(text)

    last_error: Exception | None = None

    for attempt in range(1, GROQ_RETRIES + 1):
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": AI_PROMPT,
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0,
                response_format={
                    "type": "json_object"
                },
            )

            content = (
                response.choices[0].message.content
                if response.choices
                else ""
            )

            return extract_json_object(
                content or ""
            )

        except Exception as exc:
            last_error = exc

            logger.warning(
                "Groq attempt %s/%s failed: %s",
                attempt,
                GROQ_RETRIES,
                exc,
            )

            if attempt < GROQ_RETRIES:
                time.sleep(5 * attempt)

    raise RuntimeError(
        "Groq extraction failed."
    ) from last_error


# ---------------------------------------------------------------------------
# Metadata normalization
# ---------------------------------------------------------------------------

def clean_title(value: Any) -> str:
    title = normalize_string(value)

    if title.lower() in GENERIC_BANNED_TITLES:
        return ""

    return title


def normalized_ai_data(
    data: dict[str, Any],
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "title": clean_title(data.get("title")),
        "title_en": normalize_string(data.get("title_en")),
        "author": normalize_string(data.get("author")),
        "category": normalize_string(data.get("category")),
        "type": normalize_string(data.get("type")),
        "description": normalize_string(data.get("description")),
        "publisher": normalize_string(data.get("publisher")),
        "year": safe_int(data.get("year")),
        "isbn": normalize_string(data.get("isbn")),
        "keywords": normalize_list(data.get("keywords")),
        "key_points": normalize_list(data.get("key_points"), 30),
        "target_audience": normalize_string(
            data.get("target_audience")
        ),
    }

    return result


def _make_book(
    *,
    book_id: int,
    source: Path,
    metadata: dict[str, Any],
    pages: int,
    provider: str,
) -> Book:
    source_hash = sha256_file(source)

    relative_path = source.as_posix()

    if not relative_path.startswith("pdf/"):
        relative_path = (
            Path("pdf")
            / source.name
        ).as_posix()

    return Book(
        id=book_id,
        title=metadata["title"],
        title_en=metadata["title_en"],
        author=metadata["author"],
        category=metadata["category"],
        description=metadata["description"],
        publisher=metadata["publisher"],
        type=metadata["type"],
        target_audience=metadata["target_audience"],
        year=metadata["year"],
        pages=pages,
        file_size=format_file_size(source.stat().st_size),
        isbn=metadata["isbn"],
        keywords=metadata["keywords"],
        key_points=metadata["key_points"],
        file_path=relative_path,
        file_name=source.name,
        cover_image=f"covers/{book_id}.png",
        source_sha256=source_hash,
        _ai_provider=provider,
    )


def validate_metadata(
    metadata: dict[str, Any],
    source: Path,
) -> None:
    if not metadata.get("title"):
        raise ValueError(
            f"AI did not return a usable title for {source.name}."
        )

    if not metadata.get("description"):
        raise ValueError(
            f"AI did not return a usable description for {source.name}."
        )

    if not metadata.get("category"):
        raise ValueError(
            f"AI did not return a category for {source.name}."
        )

    if metadata.get("year", 0):
        year = metadata["year"]

        if year < 1000 or year > 2100:
            raise ValueError(
                f"Suspicious publication year {year} for {source.name}."
            )


# ---------------------------------------------------------------------------
# Book processing
# ---------------------------------------------------------------------------

def process_one_book(
    source: Path,
    book_id: int,
) -> Book | None:
    logger.info(
        "Processing: %s",
        source,
    )

    if not source.is_file():
        return None

    size_mb = source.stat().st_size / (1024 * 1024)

    if size_mb > MAX_PDF_SIZE_MB:
        logger.warning(
            "Skipping %s: file size %.1f MB exceeds the "
            "%s MB local safety limit.",
            source,
            size_mb,
            MAX_PDF_SIZE_MB,
        )
        return None

    text, pages, needs_ocr = extract_document_text(
        source
    )

    metadata: dict[str, Any] | None = None
    provider = ""

    gemini_client = make_gemini_client()
    groq_client = make_groq_client()

    if needs_ocr:
        logger.info(
            "Document requires OCR: %s",
            source.name,
        )

        if gemini_client is not None:
            try:
                metadata = call_gemini_file(
                    gemini_client,
                    source,
                )
                provider = "gemini-file"
            except Exception as exc:
                logger.error(
                    "Gemini file extraction failed for %s: %s",
                    source.name,
                    exc,
                )

        if metadata is None:
            logger.warning(
                "No OCR-capable fallback available for %s.",
                source.name,
            )

            return None

    elif len(text) >= MIN_MEANINGFUL_TEXT:
        if gemini_client is not None:
            try:
                metadata = call_gemini_text(
                    gemini_client,
                    text,
                )
                provider = "gemini-text"
            except Exception as exc:
                logger.warning(
                    "Gemini text extraction failed for %s: %s",
                    source.name,
                    exc,
                )

        if metadata is None and groq_client is not None:
            try:
                metadata = call_groq(
                    groq_client,
                    text,
                )
                provider = "groq"
            except Exception as exc:
                logger.error(
                    "Groq extraction failed for %s: %s",
                    source.name,
                    exc,
                )

    else:
        logger.warning(
            "Insufficient local text extracted from %s.",
            source.name,
        )

        if gemini_client is not None:
            if size_mb <= MAX_UPLOAD_SIZE_MB:
                try:
                    metadata = call_gemini_file(
                        gemini_client,
                        source,
                    )
                    provider = "gemini-file"
                except Exception as exc:
                    logger.error(
                        "Gemini file extraction failed for %s: %s",
                        source.name,
                        exc,
                    )
            else:
                logger.warning(
                    "Gemini file upload unavailable because %s "
                    "exceeds %s MB.",
                    source.name,
                    MAX_UPLOAD_SIZE_MB,
                )

    if metadata is None:
        logger.error(
            "All available AI extraction providers failed for %s.",
            source.name,
        )
        return None

    metadata = normalized_ai_data(metadata)

    validate_metadata(
        metadata,
        source,
    )

    return _make_book(
        book_id=book_id,
        source=source,
        metadata=metadata,
        pages=pages,
        provider=provider,
    )


# ---------------------------------------------------------------------------
# Existing-book matching
# ---------------------------------------------------------------------------

def existing_book_map(
    books: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    """
    Returns:
        by_path
        by_hash
    """

    by_path: dict[str, dict[str, Any]] = {}
    by_hash: dict[str, dict[str, Any]] = {}

    for book in books:
        path = normalize_string(
            book.get("file_path")
        )

        source_hash = normalize_string(
            book.get("source_sha256")
        )

        if path:
            by_path[path] = book

        if source_hash:
            by_hash[source_hash] = book

    return by_path, by_hash


def should_skip_existing(
    source: Path,
    by_path: dict[str, dict[str, Any]],
    by_hash: dict[str, dict[str, Any]],
) -> bool:
    relative_path = source.as_posix()

    existing = by_path.get(relative_path)

    if existing is None:
        return False

    existing_hash = normalize_string(
        existing.get("source_sha256")
    )

    if existing_hash:
        current_hash = sha256_file(source)

        return (
            current_hash.lower()
            == existing_hash.lower()
        )

    # Backward compatibility:
    # old books.json entries did not have a SHA.
    # Preserve their current behavior and do not force
    # a complete re-indexing of the archive.
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not PDF_DIR.exists():
        PDF_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

    if not GEMINI_API_KEY and not GROQ_API_KEY:
        raise RuntimeError(
            "No AI provider is configured. "
            "Set GEMINI_API_KEY and/or GROQ_API_KEY."
        )

    books = load_books()

    if len(books) > MAX_BOOKS:
        raise RuntimeError(
            f"{JSON_PATH} contains more than {MAX_BOOKS} records."
        )

    logger.info(
        "Existing catalog records: %s",
        len(books),
    )

    extracted = extract_zips()

    if extracted:
        logger.info(
            "Extracted %s supported documents from ZIP archives.",
            len(extracted),
        )

    by_path, by_hash = existing_book_map(
        books
    )

    candidates = sorted(
        path
        for path in PDF_DIR.rglob("*")
        if is_supported_document(path)
    )

    logger.info(
        "Supported documents found: %s",
        len(candidates),
    )

    next_id = next_book_id(books)

    processed_any = False
    successful = 0
    skipped = 0

    for source in candidates:
        relative = source.as_posix()

        if should_skip_existing(
            source,
            by_path,
            by_hash,
        ):
            skipped += 1

            logger.info(
                "Skipping already processed file: %s",
                relative,
            )
            continue

        try:
            book = process_one_book(
                source,
                next_id,
            )
        except Exception as exc:
            logger.exception(
                "Unhandled processing error for %s: %s",
                source,
                exc,
            )
            continue

        if book is None:
            continue

        record = book.to_json_dict()

        books.append(record)

        by_path[book.file_path] = record
        by_hash[book.source_sha256] = record

        next_id += 1
        successful += 1
        processed_any = True

        save_books(books)

        logger.info(
            "Saved book #%s from %s using %s.",
            book.id,
            source.name,
            book._ai_provider,
        )

    if not processed_any:
        logger.info(
            "No new books were indexed. "
            "Skipped existing: %s.",
            skipped,
        )
    else:
        logger.info(
            "Indexing complete. Successful: %s | Skipped: %s | Total: %s",
            successful,
            skipped,
            len(books),
        )

    if not books:
        raise RuntimeError(
            "books.json contains no books after processing."
        )


if __name__ == "__main__":
    main()
