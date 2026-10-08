"""
IAR Archive — automated book indexing.

Pipeline:
    document
        ↓
    anydoc / pypdf
        ↓
    Gemini 3.8 Flash structured extraction
        ↓
    Groq JSON fallback
        ↓
    metadata normalization
        ↓
    books.json

Hardening:
- Safe Unicode filenames during Gemini upload.
- Gemini structured JSON output (legacy response_schema path,
  with optional Interactions API preview).
- Gemini file-ACTIVE polling before use.
- Automatic Function Calling disabled.
- Groq JSON fallback (with validation-aware fallback).
- SHA-256 source tracking (computed once per file).
- Duplicate protection by path AND content hash.
- Safe ZIP extraction (Zip-bomb / traversal / reserved-name guards).
- Atomic books.json writes.
- No API secrets written to generated data.
- Size limits and output-length limits.
- Optional provider imports (anydoc / pypdf / genai / groq).
- Jittered, error-aware retries.
- Automatic PDF trimming for oversized uploads to Gemini
  (first N + last M pages) so large scanned books can still
  be processed via multimodal file analysis.

Compatibility (October 2026):
- google-genai >= 2.28.0  (Python >= 3.10)
- groq >= 1.7.0
- pypdf >= 5.0.0
- Default Gemini model: gemini-3.8-flash
- Default Groq model:   llama-4-scout-17b-16e-instruct
"""

from __future__ import annotations

import hashlib
import json
import logging
import mimetypes
import os
import random
import re
import shutil
import tempfile
import time
import zipfile

from contextlib import suppress
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable

# ------------------------------------------------------------------
# Optional provider imports (script must run with any subset).
# ------------------------------------------------------------------

try:
    import anydoc
except ImportError:
    anydoc = None  # type: ignore[assignment]

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None  # type: ignore[assignment]
    types = None  # type: ignore[assignment]

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    PdfReader = None  # type: ignore[assignment]
    PdfWriter = None  # type: ignore[assignment]

try:
    from groq import Groq
except ImportError:
    Groq = None  # type: ignore[assignment]


# ============================================================
# Configuration
# ============================================================

JSON_PATH = Path("books.json")
PDF_DIR = Path("pdf")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()

# Updated for October 2026: Gemini 3.8 Flash is the current GA model.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

# llama-3.3-70b-versatile was deprecated on 2026-08-16.
# llama-4-scout-17b-16e-instruct is the current recommended default.
GROQ_MODEL = os.getenv(
    "GROQ_MODEL", "llama-4-scout-17b-16e-instruct"
)

GEMINI_RETRIES = 5
GROQ_RETRIES = 3

GEMINI_FILE_ACTIVE_TIMEOUT = 300
GEMINI_FILE_POLL_INTERVAL = 2.0

MAX_UPLOAD_SIZE_MB = 50
MAX_DOCUMENT_SIZE_MB = 500
MAX_SAMPLE_CHARS = 25_000
MIN_MEANINGFUL_TEXT = 150
MAX_BOOKS = 10_000

# ------------------------------------------------------------
# Gemini large-PDF trimming (October 2026).
#
# When a PDF exceeds MAX_UPLOAD_SIZE_MB, a trimmed copy is
# generated containing only the first N and last M pages. This
# covers cover, title page, TOC, introduction, conclusion,
# index, bibliography, and back cover — usually enough for
# accurate metadata extraction.
# ------------------------------------------------------------

GEMINI_TRIM_ENABLED = (
    os.getenv("GEMINI_TRIM_ENABLED", "true").lower() == "true"
)

GEMINI_TRIM_FIRST_PAGES = int(
    os.getenv("GEMINI_TRIM_FIRST_PAGES", "25")
)

GEMINI_TRIM_LAST_PAGES = int(
    os.getenv("GEMINI_TRIM_LAST_PAGES", "10")
)

# Output-length clamps (defense against verbose / runaway AI output).
MAX_TITLE_CHARS = 500
MAX_AUTHOR_CHARS = 300
MAX_CATEGORY_CHARS = 200
MAX_TYPE_CHARS = 200
MAX_DESCRIPTION_CHARS = 5_000
MAX_PUBLISHER_CHARS = 300
MAX_ISBN_CHARS = 40
MAX_KEYWORD_CHARS = 100
MAX_KEY_POINT_CHARS = 500
MAX_TARGET_AUDIENCE_CHARS = 500

# ZIP hardening.
MAX_ZIP_TOTAL_SIZE_MB = 2_048
MAX_ZIP_MEMBER_COUNT = 5_000
MAX_ZIP_COMPRESSION_RATIO = 100

# Filename hardening.
MAX_FILENAME_LENGTH = 200
WINDOWS_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5",
    "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5",
    "LPT6", "LPT7", "LPT8", "LPT9",
}

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

SUPPORTED_DOCUMENT_EXTENSIONS = frozenset(SUPPORTED_EXTENSIONS)

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

GENERIC_BANNED_TITLES_LOWER = {
    item.lower() for item in GENERIC_BANNED_TITLES
}

RETRYABLE_STATUS_CODES = {408, 409, 425, 429, 500, 502, 503, 504}

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("iar-archive")


# ============================================================
# Gemini response schema
# ============================================================

AI_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "title": {"type": "STRING"},
        "title_en": {"type": "STRING"},
        "author": {"type": "STRING"},
        "category": {"type": "STRING"},
        "type": {"type": "STRING"},
        "description": {"type": "STRING"},
        "publisher": {"type": "STRING"},
        "year": {"type": "INTEGER"},
        "isbn": {"type": "STRING"},
        "keywords": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
        },
        "key_points": {
            "type": "ARRAY",
            "items": {"type": "STRING"},
        },
        "target_audience": {"type": "STRING"},
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


# ============================================================
# AI prompt
# ============================================================

AI_PROMPT = """
You are an expert bibliographic metadata extraction system for
IAR Archive — the Iraqi Administrative Reference Repository.

Extract factual metadata from the supplied document.

Rules:
1. Do not invent information.
2. Prefer the title printed on the cover or title page.
3. Prefer the actual author, editor, organization, or issuing body.
4. Identify the publisher only when supported by the document.
5. Extract publication year only when supported.
6. Extract ISBN only when explicitly available.
7. Categorize according to the actual subject matter.
8. Write a concise factual description.
9. key_points must contain useful concepts actually present.
10. keywords must be concise subject terms.
11. target_audience should identify relevant readers.
12. title_en may be empty when unsupported.
13. year must be 0 when unknown.
14. Never fabricate facts.
15. Return JSON only according to the supplied schema.

Factual accuracy is more important than filling every field.
""".strip()


# ============================================================
# Data model
# ============================================================

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


# ============================================================
# Generic helpers
# ============================================================

def truncate(value: str, limit: int) -> str:
    if limit <= 0:
        return ""
    if len(value) <= limit:
        return value
    return value[:limit].rstrip()


def normalize_string(
    value: Any,
    limit: int | None = None,
) -> str:
    if value is None:
        return ""

    text = str(value).strip()

    if limit is not None:
        text = truncate(text, limit)

    return text


def normalize_list(
    value: Any,
    limit: int = 50,
    item_limit: int | None = None,
) -> list[str]:

    if not isinstance(value, list):
        return []

    result: list[str] = []

    for item in value[:limit]:
        text = normalize_string(item, item_limit)
        if text:
            result.append(text)

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


def sha256_file(
    path: Path,
    chunk_size: int = 1024 * 1024,
) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as file:
        while True:
            chunk = file.read(chunk_size)
            if not chunk:
                break
            digest.update(chunk)

    return digest.hexdigest()


def atomic_write_json(
    path: Path,
    data: Any,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = path.with_suffix(path.suffix + ".tmp")

    payload = (
        json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    )

    temp_path.write_text(payload, encoding="utf-8")
    temp_path.replace(path)


def load_books() -> list[dict[str, Any]]:
    if not JSON_PATH.exists():
        return []

    try:
        data = json.loads(
            JSON_PATH.read_text(encoding="utf-8")
        )
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Invalid JSON in {JSON_PATH}: {exc}"
        ) from exc

    if not isinstance(data, list):
        raise RuntimeError(
            f"{JSON_PATH} must contain a top-level JSON array."
        )

    return data


def save_books(books: list[dict[str, Any]]) -> None:
    if len(books) > MAX_BOOKS:
        raise RuntimeError(
            f"Refusing to save more than {MAX_BOOKS} books."
        )

    atomic_write_json(JSON_PATH, books)


def next_book_id(books: list[dict[str, Any]]) -> int:
    ids: list[int] = []

    for book in books:
        try:
            value = int(book.get("id"))
        except (TypeError, ValueError):
            continue

        if value >= 0:
            ids.append(value)

    return max(ids, default=0) + 1


def is_supported_document(path: Path) -> bool:
    return (
        path.is_file()
        and path.suffix.lower() in SUPPORTED_DOCUMENT_EXTENSIONS
    )


def compute_relative_path(source: Path) -> str:
    """
    Return a stable, POSIX-style path rooted at ``pdf/``.

    Handles the case where PDF_DIR is absolute or the file lives
    outside the expected directory.
    """
    try:
        rel = source.relative_to(PDF_DIR)
    except ValueError:
        if source.is_absolute():
            return (Path("pdf") / source.name).as_posix()
        return source.as_posix()

    return (Path("pdf") / rel).as_posix()


# ============================================================
# Retry utilities
# ============================================================

def is_retryable_error(exc: Exception) -> bool:
    """
    Decide whether an exception is worth retrying.

    Non-retryable examples:
        - JSON schema validation errors (400)
        - Authentication errors (401/403)
        - Invalid argument errors
    """
    if isinstance(exc, (TimeoutError, ConnectionError)):
        return True

    # Some SDKs expose a numeric status code.
    for attr in ("status_code", "code", "http_status"):
        value = getattr(exc, attr, None)
        if isinstance(value, int):
            if value in RETRYABLE_STATUS_CODES:
                return True
            # Any other explicit HTTP status: do not retry.
            if 400 <= value < 600:
                return False

    # Fallback: scan the message for recognisable retryable hints.
    message = str(exc).lower()
    retryable_markers = (
        "rate limit",
        "quota",
        "timeout",
        "temporarily",
        "unavailable",
        "connection reset",
        "429",
        "500",
        "502",
        "503",
        "504",
    )

    return any(marker in message for marker in retryable_markers)


def retry_sleep(attempt: int, base: float = 15.0) -> None:
    delay = base * (2 ** (attempt - 1))
    delay += random.uniform(0, 5)  # jitter

    logger.info("Waiting %.1f seconds before retry.", delay)
    time.sleep(delay)


# ============================================================
# ZIP handling
# ============================================================

def decode_zip_name(name: str) -> str:
    try:
        encoded = name.encode("cp437")
        return encoded.decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name


def is_safe_archive_member(name: str) -> bool:
    normalized = name.replace("\\", "/")

    if normalized.startswith("/"):
        return False

    parts = Path(normalized).parts

    if any(part in ("", ".", "..") for part in parts):
        return False

    if parts and ":" in parts[0]:
        return False

    return True


def safe_filename(path: Path) -> str:
    name = path.name.strip()

    # Strip control / non-printable characters.
    name = "".join(ch for ch in name if ch.isprintable())

    # Replace risky characters while keeping Unicode letters.
    name = re.sub(
        r"[^\w\-.()\[\]{} ]+",
        "_",
        name,
        flags=re.UNICODE,
    )

    # Windows does not allow trailing dots/spaces.
    name = name.strip(" .")

    if not name:
        return "document"

    parsed = Path(name)
    stem = parsed.stem
    suffix = parsed.suffix

    # Windows reserved device names.
    if stem.upper() in WINDOWS_RESERVED_NAMES:
        stem = f"_{stem}"

    # Enforce a maximum length while keeping the extension.
    max_stem_len = MAX_FILENAME_LENGTH - len(suffix)
    if max_stem_len < 1:
        max_stem_len = 1
    if len(stem) > max_stem_len:
        stem = stem[:max_stem_len]

    return f"{stem}{suffix}"


def extract_zips() -> list[Path]:
    extracted: list[Path] = []

    if not PDF_DIR.exists():
        return extracted

    zip_files = sorted(
        path
        for path in PDF_DIR.iterdir()
        if path.is_file() and path.suffix.lower() == ".zip"
    )

    for archive in zip_files:

        logger.info("Extracting ZIP: %s", archive)

        total_uncompressed = 0
        total_extracted_files = 0

        try:
            with zipfile.ZipFile(archive, "r") as zf:

                infos = zf.infolist()

                if len(infos) > MAX_ZIP_MEMBER_COUNT:
                    logger.error(
                        "Refusing to extract %s: "
                        "%s members exceed limit %s.",
                        archive,
                        len(infos),
                        MAX_ZIP_MEMBER_COUNT,
                    )
                    continue

                for member in infos:

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

                    # Zip-bomb guards.
                    member_size = member.file_size
                    compressed = member.compress_size or 1

                    ratio = member_size / compressed
                    if ratio > MAX_ZIP_COMPRESSION_RATIO:
                        logger.warning(
                            "Skipping ZIP member with "
                            "suspicious ratio %.1f: %s",
                            ratio,
                            member.filename,
                        )
                        continue

                    total_uncompressed += member_size

                    if total_uncompressed > (
                        MAX_ZIP_TOTAL_SIZE_MB * 1024 * 1024
                    ):
                        logger.error(
                            "ZIP %s exceeds uncompressed "
                            "size budget; stopping.",
                            archive,
                        )
                        break

                    total_extracted_files += 1

                    target_name = safe_filename(Path(raw_name))
                    destination = PDF_DIR / target_name

                    counter = 1
                    while destination.exists():
                        destination = PDF_DIR / (
                            f"{destination.stem}-"
                            f"{counter}"
                            f"{destination.suffix}"
                        )
                        counter += 1

                    with zf.open(member, "r") as source, \
                            destination.open("wb") as target:

                        shutil.copyfileobj(
                            source, target, length=1024 * 1024
                        )

                    extracted.append(destination)

        except zipfile.BadZipFile as exc:
            logger.error(
                "Invalid ZIP archive %s: %s", archive, exc
            )
            continue

        except OSError as exc:
            logger.error(
                "Could not extract %s: %s", archive, exc
            )
            continue

        logger.info(
            "Extracted %s file(s) from %s.",
            total_extracted_files,
            archive,
        )

        with suppress(OSError):
            archive.unlink()

    return extracted


# ============================================================
# Local extraction
# ============================================================

def extract_with_anydoc(path: Path) -> str:
    if anydoc is None:
        return ""

    try:
        text = anydoc.to_markdown(str(path))
    except Exception as exc:
        logger.warning(
            "anydoc extraction failed for %s: %s", path, exc
        )
        return ""

    return normalize_string(text)


def extract_pdf_with_pypdf(
    path: Path,
) -> tuple[str, int]:
    if PdfReader is None:
        return "", 0

    try:
        reader = PdfReader(str(path), strict=False)

        if reader.is_encrypted:
            with suppress(Exception):
                reader.decrypt("")

        pages = len(reader.pages)
        text_parts: list[str] = []
        indices: list[int] = []

        for index in range(min(pages, 20)):
            indices.append(index)

        for index in range(max(20, pages - 5), pages):
            if 0 <= index < pages:
                indices.append(index)

        seen: set[int] = set()

        for index in indices:
            if index in seen:
                continue
            seen.add(index)

            with suppress(Exception):
                page_text = (
                    reader.pages[index].extract_text() or ""
                )
                if page_text.strip():
                    text_parts.append(page_text)

        return normalize_string("\n\n".join(text_parts)), pages

    except Exception as exc:
        logger.warning(
            "pypdf extraction failed for %s: %s", path, exc
        )
        return "", 0


def extract_document_text(
    path: Path,
) -> tuple[str, int, bool]:
    """
    Returns:
        text,
        page_count,
        needs_file_analysis
    """
    page_count = 0

    if path.suffix.lower() == ".pdf":

        pdf_text, page_count = extract_pdf_with_pypdf(path)
        anydoc_text = extract_with_anydoc(path)

        if len(anydoc_text) > len(pdf_text):
            pdf_text = anydoc_text

        needs_file_analysis = (
            len(pdf_text) < MIN_MEANINGFUL_TEXT
        )

        return pdf_text, page_count, needs_file_analysis

    text = extract_with_anydoc(path)

    return text, 0, len(text) < MIN_MEANINGFUL_TEXT


# ============================================================
# PDF trimming (for oversized Gemini uploads)
# ============================================================

def create_trimmed_pdf(
    source: Path,
    source_hash: str,
    first_pages: int = GEMINI_TRIM_FIRST_PAGES,
    last_pages: int = GEMINI_TRIM_LAST_PAGES,
) -> Path | None:
    """
    Create a trimmed PDF containing only the first N and last M
    pages of *source*.

    Returns the path to a temporary PDF file on success, or
    ``None`` if trimming is not possible (non-PDF input, read
    failure, or the document already has few enough pages).

    The caller is responsible for deleting the returned file.
    """
    if PdfReader is None or PdfWriter is None:
        logger.warning(
            "PDF trimming unavailable: pypdf PdfWriter not "
            "installed."
        )
        return None

    if source.suffix.lower() != ".pdf":
        return None

    if first_pages < 1 and last_pages < 1:
        logger.warning(
            "Trimming requested with zero pages; aborting."
        )
        return None

    try:
        reader = PdfReader(str(source), strict=False)

        if reader.is_encrypted:
            with suppress(Exception):
                reader.decrypt("")

        total = len(reader.pages)

        if total <= (first_pages + last_pages):
            logger.warning(
                "PDF %s has only %s pages; trimming would not "
                "reduce size meaningfully.",
                source.name,
                total,
            )
            return None

        writer = PdfWriter()

        # First N pages (cover, title, TOC, intro).
        for index in range(min(first_pages, total)):
            try:
                writer.add_page(reader.pages[index])
            except Exception as exc:
                logger.warning(
                    "Skipping page %s during trim: %s",
                    index,
                    exc,
                )

        # Last M pages (index, bibliography, back cover).
        start_last = max(first_pages, total - last_pages)
        for index in range(start_last, total):
            try:
                writer.add_page(reader.pages[index])
            except Exception as exc:
                logger.warning(
                    "Skipping page %s during trim: %s",
                    index,
                    exc,
                )

        if len(writer.pages) == 0:
            logger.error(
                "Trimming produced an empty PDF for %s.",
                source.name,
            )
            return None

        temp_file = tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=f"iar_trimmed_{source_hash[:12]}_",
            suffix=".pdf",
            delete=False,
        )
        temp_path = Path(temp_file.name)
        temp_file.close()

        with temp_path.open("wb") as handle:
            writer.write(handle)

        logger.info(
            "Created trimmed PDF for %s: %s pages → %s pages.",
            source.name,
            total,
            len(writer.pages),
        )

        return temp_path

    except Exception as exc:
        logger.warning(
            "PDF trimming failed for %s: %s", source, exc
        )

        # Best-effort cleanup of any partially created file.
        return None


# ============================================================
# AI helpers
# ============================================================

def extract_json_object(value: str) -> dict[str, Any]:
    text = normalize_string(value)

    if not text:
        raise ValueError("AI response is empty.")

    # Strip optional Markdown fences.
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
        # Balance-aware extraction: find the outermost object.
        start = text.find("{")
        if start < 0:
            raise ValueError(
                "No JSON object found in AI response."
            )

        depth = 0
        end = -1
        in_string = False
        escape = False

        for i in range(start, len(text)):
            ch = text[i]

            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
                continue

            if ch == '"':
                in_string = True
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break

        if end <= start:
            raise ValueError(
                "No balanced JSON object found "
                "in AI response."
            )

        parsed = json.loads(text[start : end + 1])

    if not isinstance(parsed, dict):
        raise ValueError("AI response must be a JSON object.")

    return parsed


def build_document_block(text: str) -> str:
    return (
        "DOCUMENT CONTENT:\n"
        "-----------------\n"
        f"{text[:MAX_SAMPLE_CHARS]}\n"
        "-----------------\n"
    )


def build_prompt(text: str) -> str:
    return f"{AI_PROMPT}\n\n{build_document_block(text)}"


# ============================================================
# Gemini
# ============================================================

def make_gemini_client() -> Any | None:
    if not GEMINI_API_KEY or genai is None:
        return None

    return genai.Client(api_key=GEMINI_API_KEY)


def gemini_config() -> Any:
    """
    Build the classic GenerateContentConfig.

    The legacy response_schema path is still supported by the
    google-genai SDK as of October 2026. The Interactions API
    (client.interactions.create) is available as a preview and
    is opt-in via ``GEMINI_USE_INTERACTIONS_API``.
    """
    return types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=AI_RESPONSE_SCHEMA,
        automatic_function_calling=(
            types.AutomaticFunctionCallingConfig(disable=True)
        ),
    )


# Opt-in flag for the new Interactions API (preview, October 2026).
USE_GEMINI_INTERACTIONS_API = (
    os.getenv("GEMINI_USE_INTERACTIONS_API", "false").lower()
    == "true"
)


def call_gemini_text(
    client: Any,
    text: str,
) -> dict[str, Any]:
    """
    Extract metadata from plain text using Gemini.

    Uses the classic generate_content path by default. If
    USE_GEMINI_INTERACTIONS_API is set, uses the new
    client.interactions.create() preview endpoint.
    """
    prompt = build_prompt(text)

    last_error: Exception | None = None

    for attempt in range(1, GEMINI_RETRIES + 1):

        try:
            if (
                USE_GEMINI_INTERACTIONS_API
                and hasattr(client, "interactions")
            ):
                # New Interactions API (preview, October 2026).
                interaction = client.interactions.create(
                    model=GEMINI_MODEL,
                    input=prompt,
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": AI_RESPONSE_SCHEMA,
                    },
                )
                output = getattr(
                    interaction, "output_text", ""
                ) or ""
                return extract_json_object(output)

            # Classic generate_content path (still supported).
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=gemini_config(),
            )

            return extract_json_object(response.text or "")

        except Exception as exc:
            last_error = exc

            logger.warning(
                "Gemini text attempt %s/%s failed: %s",
                attempt,
                GEMINI_RETRIES,
                exc,
            )

            if attempt >= GEMINI_RETRIES:
                break

            if not is_retryable_error(exc):
                logger.warning(
                    "Gemini text error not retryable; "
                    "aborting retries."
                )
                break

            retry_sleep(attempt)

    raise RuntimeError(
        "Gemini text extraction failed."
    ) from last_error


def wait_for_file_active(
    client: Any,
    uploaded: Any,
    timeout: int = GEMINI_FILE_ACTIVE_TIMEOUT,
    poll_interval: float = GEMINI_FILE_POLL_INTERVAL,
) -> Any:
    """
    Poll the uploaded file until Gemini reports it is ACTIVE.

    The Gemini File API returns the resource in PROCESSING state
    immediately after upload; generate_content will fail if the
    file is not yet ACTIVE. This is still required as of
    October 2026 (including with the Interactions API for any
    referenced file).
    """
    start = time.time()
    current = uploaded

    while True:
        state = getattr(current, "state", None)
        state_name = getattr(state, "name", None)

        # Some SDK versions may not expose a state; assume ready.
        if state_name is None:
            return current

        if state_name == "ACTIVE":
            return current

        if state_name == "FAILED":
            raise RuntimeError(
                "Gemini file processing entered FAILED state."
            )

        if time.time() - start > timeout:
            raise TimeoutError(
                f"Gemini file did not become ACTIVE within "
                f"{timeout} seconds."
            )

        time.sleep(poll_interval)

        with suppress(Exception):
            current = client.files.get(name=current.name)


def create_ascii_temp_copy(
    source: Path,
    source_hash: str,
) -> Path:
    """
    Create a temporary ASCII-only copy of *source*.

    The original file is never renamed. The copy is required
    because Gemini rejects uploads whose display name contains
    certain non-ASCII characters.
    """
    suffix = source.suffix.lower()
    descriptor = source_hash[:12]

    temp_file = tempfile.NamedTemporaryFile(
        mode="wb",
        prefix=f"iar_upload_{descriptor}_",
        suffix=suffix,
        delete=False,
    )

    temp_path = Path(temp_file.name)
    temp_file.close()

    try:
        shutil.copyfile(source, temp_path)
    except Exception:
        with suppress(OSError):
            temp_path.unlink()
        raise

    return temp_path


def gemini_mime_type(source: Path) -> str:
    mime_type, _ = mimetypes.guess_type(source.name)

    if mime_type:
        return mime_type

    known_types = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": (
            "application/vnd.openxmlformats-"
            "officedocument.wordprocessingml.document"
        ),
        ".docm": (
            "application/vnd.ms-word.document.macroEnabled.12"
        ),
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": (
            "application/vnd.openxmlformats-"
            "officedocument.presentationml.presentation"
        ),
        ".pptm": (
            "application/vnd.ms-powerpoint.presentation.macroEnabled.12"
        ),
        ".xls": "application/vnd.ms-excel",
        ".xlsx": (
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),
        ".xlsm": (
            "application/vnd.ms-excel.sheet.macroEnabled.12"
        ),
        ".csv": "text/csv",
        ".rtf": "application/rtf",
        ".epub": "application/epub+zip",
        ".odt": (
            "application/vnd.oasis.opendocument.text"
        ),
        ".ods": (
            "application/vnd.oasis.opendocument.spreadsheet"
        ),
        ".odp": (
            "application/vnd.oasis.opendocument.presentation"
        ),
    }

    return known_types.get(
        source.suffix.lower(), "application/octet-stream"
    )


def call_gemini_file(
    client: Any,
    source: Path,
    source_hash: str,
) -> dict[str, Any]:
    """
    Upload a document to Gemini and extract metadata.

    If the source exceeds MAX_UPLOAD_SIZE_MB and is a PDF,
    a trimmed copy (first N + last M pages) is uploaded instead.
    """

    trimmed_path: Path | None = None
    upload_source: Path = source
    effective_hash: str = source_hash

    try:
        # --------------------------------------------------------
        # Handle oversized files.
        # --------------------------------------------------------

        size = source.stat().st_size
        size_limit = MAX_UPLOAD_SIZE_MB * 1024 * 1024

        if size > size_limit:

            if not GEMINI_TRIM_ENABLED:
                raise RuntimeError(
                    f"{source.name} exceeds "
                    f"{MAX_UPLOAD_SIZE_MB} MB and trimming "
                    f"is disabled."
                )

            if source.suffix.lower() != ".pdf":
                raise RuntimeError(
                    f"{source.name} exceeds "
                    f"{MAX_UPLOAD_SIZE_MB} MB and cannot be "
                    f"trimmed (not a PDF)."
                )

            logger.info(
                "File %s is %.1f MB; trimming to first %s + "
                "last %s pages.",
                source.name,
                size / (1024 * 1024),
                GEMINI_TRIM_FIRST_PAGES,
                GEMINI_TRIM_LAST_PAGES,
            )

            trimmed_path = create_trimmed_pdf(
                source, source_hash
            )

            if trimmed_path is None:
                raise RuntimeError(
                    f"Could not trim {source.name}; PDF may "
                    f"have too few pages or be unreadable."
                )

            trimmed_size = trimmed_path.stat().st_size

            if trimmed_size > size_limit:
                raise RuntimeError(
                    f"Trimmed PDF still exceeds "
                    f"{MAX_UPLOAD_SIZE_MB} MB "
                    f"({trimmed_size / (1024 * 1024):.1f} MB). "
                    f"Try reducing GEMINI_TRIM_FIRST_PAGES / "
                    f"GEMINI_TRIM_LAST_PAGES."
                )

            upload_source = trimmed_path
            effective_hash = sha256_file(trimmed_path)

            logger.info(
                "Trimmed copy ready: %.1f MB → %.1f MB.",
                size / (1024 * 1024),
                trimmed_size / (1024 * 1024),
            )

        # --------------------------------------------------------
        # Upload and extract.
        # --------------------------------------------------------

        mime_type = gemini_mime_type(upload_source)

        last_error: Exception | None = None

        for attempt in range(1, GEMINI_RETRIES + 1):

            uploaded = None
            ascii_temp_path: Path | None = None

            try:
                ascii_temp_path = create_ascii_temp_copy(
                    upload_source, effective_hash
                )

                ascii_display_name = (
                    f"iar_document_{effective_hash[:12]}"
                    f"{upload_source.suffix.lower()}"
                )

                upload_config = types.UploadFileConfig(
                    display_name=ascii_display_name,
                    mime_type=mime_type,
                )

                logger.info(
                    "Uploading ASCII temporary copy to Gemini: %s",
                    ascii_temp_path.name,
                )

                uploaded = client.files.upload(
                    file=str(ascii_temp_path),
                    config=upload_config,
                )

                if not uploaded or not getattr(
                    uploaded, "name", None
                ):
                    raise RuntimeError(
                        "Gemini upload returned no valid "
                        "file resource."
                    )

                uploaded = wait_for_file_active(
                    client, uploaded
                )

                if (
                    USE_GEMINI_INTERACTIONS_API
                    and hasattr(client, "interactions")
                ):
                    interaction = client.interactions.create(
                        model=GEMINI_MODEL,
                        input=[AI_PROMPT, uploaded],
                        response_format={
                            "type": "text",
                            "mime_type": "application/json",
                            "schema": AI_RESPONSE_SCHEMA,
                        },
                    )
                    output = getattr(
                        interaction, "output_text", ""
                    ) or ""
                    return extract_json_object(output)

                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=[AI_PROMPT, uploaded],
                    config=gemini_config(),
                )

                return extract_json_object(
                    response.text or ""
                )

            except Exception as exc:
                last_error = exc

                logger.warning(
                    "Gemini file attempt %s/%s failed: %s",
                    attempt,
                    GEMINI_RETRIES,
                    exc,
                )

                if attempt >= GEMINI_RETRIES:
                    break

                if not is_retryable_error(exc):
                    logger.warning(
                        "Gemini file error not retryable; "
                        "aborting retries."
                    )
                    break

                retry_sleep(attempt)

            finally:
                if uploaded is not None:
                    remote_name = getattr(
                        uploaded, "name", None
                    )
                    if remote_name:
                        with suppress(Exception):
                            client.files.delete(
                                name=remote_name
                            )

                if ascii_temp_path is not None:
                    with suppress(OSError):
                        ascii_temp_path.unlink()

        raise RuntimeError(
            f"Gemini file extraction failed "
            f"for {source.name}."
        ) from last_error

    finally:
        # Always clean up the trimmed copy.
        if trimmed_path is not None:
            with suppress(OSError):
                trimmed_path.unlink()


# ============================================================
# Groq
# ============================================================

def make_groq_client() -> Any | None:
    if not GROQ_API_KEY or Groq is None:
        return None

    return Groq(api_key=GROQ_API_KEY)


def call_groq(
    client: Any,
    text: str,
) -> dict[str, Any]:

    document_block = build_document_block(text)

    last_error: Exception | None = None

    for attempt in range(1, GROQ_RETRIES + 1):

        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": AI_PROMPT},
                    {"role": "user", "content": document_block},
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )

            if not response.choices:
                raise RuntimeError("Groq returned no choices.")

            content = (
                response.choices[0].message.content or ""
            )

            return extract_json_object(content)

        except Exception as exc:
            last_error = exc

            logger.warning(
                "Groq attempt %s/%s failed: %s",
                attempt,
                GROQ_RETRIES,
                exc,
            )

            if attempt >= GROQ_RETRIES:
                break

            if not is_retryable_error(exc):
                logger.warning(
                    "Groq error not retryable; aborting retries."
                )
                break

            time.sleep(5 * attempt)

    raise RuntimeError("Groq extraction failed.") from last_error


# ============================================================
# Metadata
# ============================================================

def clean_title(value: Any) -> str:
    title = normalize_string(value, MAX_TITLE_CHARS)

    if title.lower() in GENERIC_BANNED_TITLES_LOWER:
        return ""

    return title


def normalized_ai_data(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": clean_title(data.get("title")),
        "title_en": normalize_string(
            data.get("title_en"), MAX_TITLE_CHARS
        ),
        "author": normalize_string(
            data.get("author"), MAX_AUTHOR_CHARS
        ),
        "category": normalize_string(
            data.get("category"), MAX_CATEGORY_CHARS
        ),
        "type": normalize_string(
            data.get("type"), MAX_TYPE_CHARS
        ),
        "description": normalize_string(
            data.get("description"), MAX_DESCRIPTION_CHARS
        ),
        "publisher": normalize_string(
            data.get("publisher"), MAX_PUBLISHER_CHARS
        ),
        "year": safe_int(data.get("year")),
        "isbn": normalize_string(
            data.get("isbn"), MAX_ISBN_CHARS
        ),
        "keywords": normalize_list(
            data.get("keywords"), 50, MAX_KEYWORD_CHARS
        ),
        "key_points": normalize_list(
            data.get("key_points"), 30, MAX_KEY_POINT_CHARS
        ),
        "target_audience": normalize_string(
            data.get("target_audience"),
            MAX_TARGET_AUDIENCE_CHARS,
        ),
    }


def validate_metadata(
    metadata: dict[str, Any],
    source: Path,
) -> None:

    if not metadata.get("title"):
        raise ValueError(
            f"AI did not return a usable title for "
            f"{source.name}."
        )

    if not metadata.get("description"):
        raise ValueError(
            f"AI did not return a usable description for "
            f"{source.name}."
        )

    if not metadata.get("category"):
        raise ValueError(
            f"AI did not return a category for {source.name}."
        )

    year = metadata.get("year", 0)

    if year and (year < 1000 or year > 2100):
        raise ValueError(
            f"Suspicious publication year {year} for "
            f"{source.name}."
        )


def make_book(
    *,
    book_id: int,
    source: Path,
    metadata: dict[str, Any],
    pages: int,
    provider: str,
    source_hash: str,
    relative_path: str,
) -> Book:
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


# ============================================================
# Existing records
# ============================================================

def existing_book_maps(
    books: list[dict[str, Any]],
) -> tuple[
    dict[str, dict[str, Any]],
    dict[str, dict[str, Any]],
]:

    by_path: dict[str, dict[str, Any]] = {}
    by_hash: dict[str, dict[str, Any]] = {}

    for book in books:
        file_path = normalize_string(book.get("file_path"))
        source_hash = normalize_string(book.get("source_sha256"))

        if file_path:
            by_path[file_path] = book

        if source_hash:
            by_hash[source_hash.lower()] = book

    return by_path, by_hash


def should_skip_existing(
    relative_path: str,
    source_hash: str,
    by_path: dict[str, dict[str, Any]],
    by_hash: dict[str, dict[str, Any]],
) -> bool:

    # Content-hash duplicate protection.
    if source_hash.lower() in by_hash:
        return True

    existing = by_path.get(relative_path)

    if existing is None:
        return False

    existing_hash = normalize_string(
        existing.get("source_sha256")
    )

    if existing_hash:
        return existing_hash.lower() == source_hash.lower()

    # Legacy record with no hash: assume unchanged.
    return True


# ============================================================
# Provider call with validation
# ============================================================

def call_provider_with_validation(
    provider_name: str,
    caller: Callable[[], dict[str, Any]],
    source: Path,
) -> tuple[dict[str, Any] | None, str]:
    """
    Invoke an AI provider and validate its output.

    Returns (metadata, provider) on success, (None, "") on any
    failure so the caller can try the next provider.
    """
    try:
        raw = caller()
    except Exception as exc:
        logger.warning(
            "%s extraction failed for %s: %s",
            provider_name,
            source.name,
            exc,
        )
        return None, ""

    try:
        metadata = normalized_ai_data(raw)
        validate_metadata(metadata, source)
    except Exception as exc:
        logger.warning(
            "%s output failed validation for %s: %s",
            provider_name,
            source.name,
            exc,
        )
        return None, ""

    return metadata, provider_name


# ============================================================
# Book processing
# ============================================================

def process_one_book(
    source: Path,
    book_id: int,
    source_hash: str,
    relative_path: str,
    gemini_client: Any | None,
    groq_client: Any | None,
) -> Book | None:

    logger.info("Processing: %s", source)

    if not source.is_file():
        return None

    size_mb = source.stat().st_size / (1024 * 1024)

    if size_mb > MAX_DOCUMENT_SIZE_MB:
        logger.warning(
            "Skipping %s: %.1f MB exceeds local %s MB limit.",
            source,
            size_mb,
            MAX_DOCUMENT_SIZE_MB,
        )
        return None

    text, pages, needs_file_analysis = extract_document_text(source)

    metadata: dict[str, Any] | None = None
    provider = ""

    has_meaningful_text = len(text) >= MIN_MEANINGFUL_TEXT

    # --------------------------------------------------------
    # Normal text path
    # --------------------------------------------------------

    if has_meaningful_text and not needs_file_analysis:

        if gemini_client is not None:
            metadata, provider = call_provider_with_validation(
                "gemini-text",
                lambda: call_gemini_text(gemini_client, text),
                source,
            )

        if metadata is None and groq_client is not None:
            metadata, provider = call_provider_with_validation(
                "groq",
                lambda: call_groq(groq_client, text),
                source,
            )

    # --------------------------------------------------------
    # OCR / insufficient-text path
    # --------------------------------------------------------

    else:

        logger.info(
            "Insufficient or OCR-dependent text for %s; "
            "attempting Gemini file analysis.",
            source.name,
        )

        if gemini_client is not None:

            if size_mb <= MAX_UPLOAD_SIZE_MB:
                # Normal upload.
                metadata, provider = call_provider_with_validation(
                    "gemini-file",
                    lambda: call_gemini_file(
                        gemini_client, source, source_hash
                    ),
                    source,
                )

            elif (
                GEMINI_TRIM_ENABLED
                and source.suffix.lower() == ".pdf"
            ):
                # Oversized PDF: allow trimming inside
                # call_gemini_file to handle the upload.
                logger.info(
                    "Oversized PDF (%.1f MB); attempting "
                    "Gemini upload with trimming.",
                    size_mb,
                )
                metadata, provider = call_provider_with_validation(
                    "gemini-file-trimmed",
                    lambda: call_gemini_file(
                        gemini_client, source, source_hash
                    ),
                    source,
                )

            else:
                logger.warning(
                    "Gemini file upload skipped for %s: "
                    "%.1f MB exceeds %s MB and cannot be "
                    "trimmed.",
                    source.name,
                    size_mb,
                    MAX_UPLOAD_SIZE_MB,
                )

        # Fall back to Groq using whatever text we do have.
        if (
            metadata is None
            and has_meaningful_text
            and groq_client is not None
        ):
            metadata, provider = call_provider_with_validation(
                "groq",
                lambda: call_groq(groq_client, text),
                source,
            )

    if metadata is None:
        logger.error(
            "All available AI extraction paths failed for %s.",
            source.name,
        )
        return None

    return make_book(
        book_id=book_id,
        source=source,
        metadata=metadata,
        pages=pages,
        provider=provider,
        source_hash=source_hash,
        relative_path=relative_path,
    )


# ============================================================
# Main
# ============================================================

def main() -> None:

    if not PDF_DIR.exists():
        PDF_DIR.mkdir(parents=True, exist_ok=True)

    if not GEMINI_API_KEY and not GROQ_API_KEY:
        raise RuntimeError(
            "No AI provider is configured. Set "
            "GEMINI_API_KEY and/or GROQ_API_KEY."
        )

    gemini_client = make_gemini_client()
    groq_client = make_groq_client()

    if gemini_client is None and groq_client is None:
        raise RuntimeError(
            "No usable AI client could be created. "
            "Check installed dependencies and API keys."
        )

    logger.info(
        "Active providers: gemini=%s groq=%s | "
        "Gemini model=%s | Groq model=%s | "
        "Trim enabled=%s (first=%s, last=%s)",
        gemini_client is not None,
        groq_client is not None,
        GEMINI_MODEL,
        GROQ_MODEL,
        GEMINI_TRIM_ENABLED,
        GEMINI_TRIM_FIRST_PAGES,
        GEMINI_TRIM_LAST_PAGES,
    )

    books = load_books()

    if len(books) > MAX_BOOKS:
        raise RuntimeError(
            f"{JSON_PATH} contains more than "
            f"{MAX_BOOKS} records."
        )

    logger.info("Existing catalog records: %s", len(books))

    extract_zips()

    by_path, by_hash = existing_book_maps(books)

    candidates = sorted(
        path
        for path in PDF_DIR.rglob("*")
        if is_supported_document(path)
    )

    logger.info("Supported documents found: %s", len(candidates))

    next_id = next_book_id(books)

    successful = 0
    skipped = 0

    for source in candidates:

        try:
            relative_path = compute_relative_path(source)
            source_hash = sha256_file(source)

        except OSError as exc:
            logger.error(
                "Could not inspect %s: %s", source, exc
            )
            continue

        if should_skip_existing(
            relative_path,
            source_hash,
            by_path,
            by_hash,
        ):
            skipped += 1
            logger.info(
                "Skipping already processed file: %s",
                relative_path,
            )
            continue

        try:
            book = process_one_book(
                source=source,
                book_id=next_id,
                source_hash=source_hash,
                relative_path=relative_path,
                gemini_client=gemini_client,
                groq_client=groq_client,
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
        by_hash[source_hash.lower()] = record

        next_id += 1
        successful += 1

        save_books(books)

        logger.info(
            "Saved book #%s: %s | provider=%s",
            book.id,
            source.name,
            book._ai_provider,
        )

    logger.info(
        "Indexing complete. "
        "Successful: %s | Skipped: %s | Total: %s",
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
