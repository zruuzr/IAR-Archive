"""
IAR Archive — automated book indexing.

Pipeline:
    document
        ↓
    anydoc / pypdf
        ↓
    Gemini structured extraction
        ↓
    Groq JSON fallback
        ↓
    metadata normalization
        ↓
    books.json

Hardening:
- Safe Unicode filenames during Gemini upload.
- Gemini structured JSON output.
- Automatic Function Calling disabled.
- Groq JSON fallback.
- SHA-256 source tracking.
- Safe ZIP extraction.
- Atomic books.json writes.
- No API secrets written to generated data.
- Size limits.
- Duplicate/path protection.
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


# ============================================================
# Configuration
# ============================================================

JSON_PATH = Path("books.json")
PDF_DIR = Path("pdf")

GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    "",
).strip()

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY",
    "",
).strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash",
)

GROQ_MODEL = os.getenv(
    "GROQ_MODEL",
    "llama-3.3-70b-versatile",
)

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

SUPPORTED_DOCUMENT_EXTENSIONS = (
    SUPPORTED_EXTENSIONS
    - {".zip"}
)

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

LOG_LEVEL = os.getenv(
    "LOG_LEVEL",
    "INFO",
).upper()

logging.basicConfig(
    level=getattr(
        logging,
        LOG_LEVEL,
        logging.INFO,
    ),
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger(
    "iar-archive"
)


# ============================================================
# Gemini response schema
# ============================================================

AI_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "title": {
            "type": "STRING",
        },
        "title_en": {
            "type": "STRING",
        },
        "author": {
            "type": "STRING",
        },
        "category": {
            "type": "STRING",
        },
        "type": {
            "type": "STRING",
        },
        "description": {
            "type": "STRING",
        },
        "publisher": {
            "type": "STRING",
        },
        "year": {
            "type": "INTEGER",
        },
        "isbn": {
            "type": "STRING",
        },
        "keywords": {
            "type": "ARRAY",
            "items": {
                "type": "STRING",
            },
        },
        "key_points": {
            "type": "ARRAY",
            "items": {
                "type": "STRING",
            },
        },
        "target_audience": {
            "type": "STRING",
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

    keywords: list[str] = field(
        default_factory=list
    )

    keywords_en: list[str] = field(
        default_factory=list
    )

    key_points: list[str] = field(
        default_factory=list
    )

    key_points_en: list[str] = field(
        default_factory=list
    )

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

    def to_json_dict(
        self,
    ) -> dict[str, Any]:
        data = asdict(
            self
        )

        data.pop(
            "_ai_provider",
            None,
        )

        return data


# ============================================================
# Generic helpers
# ============================================================

def normalize_string(
    value: Any,
) -> str:
    if value is None:
        return ""

    return str(
        value
    ).strip()


def normalize_list(
    value: Any,
    limit: int = 50,
) -> list[str]:

    if not isinstance(
        value,
        list,
    ):
        return []

    result: list[str] = []

    for item in value[:limit]:
        text = normalize_string(
            item
        )

        if text:
            result.append(
                text
            )

    return result


def safe_int(
    value: Any,
) -> int:
    if value in (
        None,
        "",
        False,
    ):
        return 0

    try:
        number = int(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return 0

    return (
        number
        if number >= 0
        else 0
    )


def format_file_size(
    size_bytes: int,
) -> str:
    if size_bytes <= 0:
        return "0 B"

    units = (
        "B",
        "KB",
        "MB",
        "GB",
    )

    size = float(
        size_bytes
    )

    for unit in units:
        if (
            size < 1024
            or unit == units[-1]
        ):
            if unit == "B":
                return (
                    f"{int(size)} {unit}"
                )

            return (
                f"{size:.1f} {unit}"
            )

        size /= 1024

    return f"{size:.1f} GB"


def sha256_file(
    path: Path,
    chunk_size: int = 1024 * 1024,
) -> str:
    digest = hashlib.sha256()

    with path.open(
        "rb"
    ) as file:

        while True:
            chunk = file.read(
                chunk_size
            )

            if not chunk:
                break

            digest.update(
                chunk
            )

    return digest.hexdigest()


def atomic_write_json(
    path: Path,
    data: Any,
) -> None:
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    temp_path = (
        path.with_suffix(
            path.suffix + ".tmp"
        )
    )

    payload = (
        json.dumps(
            data,
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )

    temp_path.write_text(
        payload,
        encoding="utf-8",
    )

    temp_path.replace(
        path
    )


def load_books() -> list[dict[str, Any]]:
    if not JSON_PATH.exists():
        return []

    try:
        data = json.loads(
            JSON_PATH.read_text(
                encoding="utf-8"
            )
        )

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Invalid JSON in {JSON_PATH}: {exc}"
        ) from exc

    if not isinstance(
        data,
        list,
    ):
        raise RuntimeError(
            f"{JSON_PATH} must contain "
            "a top-level JSON array."
        )

    return data


def save_books(
    books: list[dict[str, Any]],
) -> None:
    if len(books) > MAX_BOOKS:
        raise RuntimeError(
            f"Refusing to save more than "
            f"{MAX_BOOKS} books."
        )

    atomic_write_json(
        JSON_PATH,
        books,
    )


def next_book_id(
    books: list[dict[str, Any]],
) -> int:
    ids: list[int] = []

    for book in books:
        try:
            value = int(
                book.get("id")
            )

        except (
            TypeError,
            ValueError,
        ):
            continue

        if value >= 0:
            ids.append(
                value
            )

    return (
        max(
            ids,
            default=0,
        )
        + 1
    )


def is_supported_document(
    path: Path,
) -> bool:
    return (
        path.is_file()
        and path.suffix.lower()
        in SUPPORTED_DOCUMENT_EXTENSIONS
    )


# ============================================================
# ZIP handling
# ============================================================

def decode_zip_name(
    name: str,
) -> str:
    try:
        encoded = name.encode(
            "cp437"
        )

        return encoded.decode(
            "utf-8"
        )

    except (
        UnicodeEncodeError,
        UnicodeDecodeError,
    ):
        return name


def is_safe_archive_member(
    name: str,
) -> bool:
    normalized = name.replace(
        "\\",
        "/",
    )

    if normalized.startswith(
        "/"
    ):
        return False

    parts = Path(
        normalized
    ).parts

    if any(
        part in (
            "",
            ".",
            "..",
        )
        for part in parts
    ):
        return False

    if parts and ":" in parts[0]:
        return False

    return True


def safe_filename(
    path: Path,
) -> str:
    name = path.name.strip()

    name = re.sub(
        r"[^\w\-.()\[\]{} ]+",
        "_",
        name,
        flags=re.UNICODE,
    )

    return name or "document"


def extract_zips() -> list[Path]:
    extracted: list[Path] = []

    if not PDF_DIR.exists():
        return extracted

    zip_files = sorted(
        path
        for path in PDF_DIR.iterdir()
        if path.is_file()
        and path.suffix.lower() == ".zip"
    )

    for archive in zip_files:

        logger.info(
            "Extracting ZIP: %s",
            archive,
        )

        try:
            with zipfile.ZipFile(
                archive,
                "r",
            ) as zf:

                for member in zf.infolist():

                    if member.is_dir():
                        continue

                    raw_name = decode_zip_name(
                        member.filename
                    )

                    if not is_safe_archive_member(
                        raw_name
                    ):
                        logger.warning(
                            "Skipping unsafe ZIP member: %s",
                            member.filename,
                        )
                        continue

                    suffix = (
                        Path(
                            raw_name
                        )
                        .suffix
                        .lower()
                    )

                    if (
                        suffix
                        not in SUPPORTED_DOCUMENT_EXTENSIONS
                    ):
                        continue

                    target_name = safe_filename(
                        Path(
                            raw_name
                        )
                    )

                    destination = (
                        PDF_DIR
                        / target_name
                    )

                    counter = 1

                    while destination.exists():
                        destination = (
                            PDF_DIR
                            / (
                                f"{destination.stem}-"
                                f"{counter}"
                                f"{destination.suffix}"
                            )
                        )

                        counter += 1

                    with zf.open(
                        member,
                        "r",
                    ) as source, destination.open(
                        "wb"
                    ) as target:

                        shutil.copyfileobj(
                            source,
                            target,
                            length=1024 * 1024,
                        )

                    extracted.append(
                        destination
                    )

        except zipfile.BadZipFile as exc:
            logger.error(
                "Invalid ZIP archive %s: %s",
                archive,
                exc,
            )

            continue

        except OSError as exc:
            logger.error(
                "Could not extract %s: %s",
                archive,
                exc,
            )

            continue

        with suppress(
            OSError
        ):
            archive.unlink()

    return extracted


# ============================================================
# Local extraction
# ============================================================

def extract_with_anydoc(
    path: Path,
) -> str:
    try:
        text = anydoc.to_markdown(
            str(path)
        )

    except Exception as exc:
        logger.warning(
            "anydoc extraction failed for %s: %s",
            path,
            exc,
        )

        return ""

    return normalize_string(
        text
    )


def extract_pdf_with_pypdf(
    path: Path,
) -> tuple[str, int]:
    try:
        reader = PdfReader(
            str(path),
            strict=False,
        )

        if reader.is_encrypted:
            with suppress(
                Exception
            ):
                reader.decrypt("")

        pages = len(
            reader.pages
        )

        text_parts: list[str] = []

        indices: list[int] = []

        for index in range(
            min(
                pages,
                20,
            )
        ):
            indices.append(
                index
            )

        for index in range(
            max(
                20,
                pages - 5,
            ),
            pages,
        ):
            if 0 <= index < pages:
                indices.append(
                    index
                )

        seen: set[int] = set()

        for index in indices:

            if index in seen:
                continue

            seen.add(
                index
            )

            with suppress(
                Exception
            ):
                page_text = (
                    reader
                    .pages[index]
                    .extract_text()
                    or ""
                )

                if page_text.strip():
                    text_parts.append(
                        page_text
                    )

        return (
            normalize_string(
                "\n\n".join(
                    text_parts
                )
            ),
            pages,
        )

    except Exception as exc:
        logger.warning(
            "pypdf extraction failed for %s: %s",
            path,
            exc,
        )

        return (
            "",
            0,
        )


def extract_document_text(
    path: Path,
) -> tuple[
    str,
    int,
    bool,
]:
    """
    Returns:
        text,
        page_count,
        needs_file_analysis
    """

    page_count = 0

    if (
        path.suffix.lower()
        == ".pdf"
    ):

        pdf_text, page_count = (
            extract_pdf_with_pypdf(
                path
            )
        )

        anydoc_text = (
            extract_with_anydoc(
                path
            )
        )

        if len(anydoc_text) > len(
            pdf_text
        ):
            pdf_text = anydoc_text

        needs_file_analysis = (
            len(pdf_text)
            < MIN_MEANINGFUL_TEXT
        )

        return (
            pdf_text,
            page_count,
            needs_file_analysis,
        )

    text = extract_with_anydoc(
        path
    )

    return (
        text,
        0,
        len(text)
        < MIN_MEANINGFUL_TEXT,
    )


# ============================================================
# AI helpers
# ============================================================

def extract_json_object(
    value: str,
) -> dict[str, Any]:
    text = normalize_string(
        value
    )

    if not text:
        raise ValueError(
            "AI response is empty."
        )

    fenced = re.search(
        r"```(?:json)?\s*(\{.*\})\s*```",
        text,
        flags=(
            re.DOTALL
            | re.IGNORECASE
        ),
    )

    if fenced:
        text = (
            fenced.group(1)
            .strip()
        )

    try:
        parsed = json.loads(
            text
        )

    except json.JSONDecodeError:
        start = text.find(
            "{"
        )

        end = text.rfind(
            "}"
        )

        if start < 0 or end <= start:
            raise ValueError(
                "No JSON object found "
                "in AI response."
            )

        parsed = json.loads(
            text[
                start : end + 1
            ]
        )

    if not isinstance(
        parsed,
        dict,
    ):
        raise ValueError(
            "AI response must be a JSON object."
        )

    return parsed


def build_prompt(
    text: str,
) -> str:
    return (
        f"{AI_PROMPT}\n\n"
        "DOCUMENT CONTENT:\n"
        "-----------------\n"
        f"{text[:MAX_SAMPLE_CHARS]}\n"
        "-----------------\n"
    )


def retry_sleep(
    attempt: int,
) -> None:
    delay = 15 * (
        2 ** (
            attempt - 1
        )
    )

    logger.info(
        "Waiting %s seconds before retry.",
        delay,
    )

    time.sleep(
        delay
    )


# ============================================================
# Gemini
# ============================================================

def make_gemini_client() -> Any | None:
    if not GEMINI_API_KEY:
        return None

    return genai.Client(
        api_key=GEMINI_API_KEY
    )


def gemini_config() -> Any:
    return types.GenerateContentConfig(
        response_mime_type=(
            "application/json"
        ),
        response_schema=(
            AI_RESPONSE_SCHEMA
        ),
        automatic_function_calling=(
            types.AutomaticFunctionCallingConfig(
                disable=True
            )
        ),
    )


def call_gemini_text(
    client: Any,
    text: str,
) -> dict[str, Any]:

    prompt = build_prompt(
        text
    )

    last_error: Exception | None = None

    for attempt in range(
        1,
        GEMINI_RETRIES + 1,
    ):

        try:
            response = (
                client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    config=gemini_config(),
                )
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
                retry_sleep(
                    attempt
                )

    raise RuntimeError(
        "Gemini text extraction failed."
    ) from last_error


def create_ascii_temp_copy(
    source: Path,
) -> Path:
    """
    Create a temporary ASCII-only filename.

    The original source file is never renamed.
    """

    suffix = (
        source.suffix.lower()
    )

    descriptor = (
        sha256_file(
            source
        )[:12]
    )

    temp_file = (
        tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=(
                f"iar_upload_"
                f"{descriptor}_"
            ),
            suffix=suffix,
            delete=False,
        )
    )

    temp_path = Path(
        temp_file.name
    )

    temp_file.close()

    try:
        shutil.copyfile(
            source,
            temp_path,
        )

    except Exception:
        with suppress(
            OSError
        ):
            temp_path.unlink()

        raise

    return temp_path


def gemini_mime_type(
    source: Path,
) -> str:
    mime_type, _ = (
        mimetypes.guess_type(
            source.name
        )
    )

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
        ".ppt": (
            "application/vnd.ms-powerpoint"
        ),
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
        source.suffix.lower(),
        "application/octet-stream",
    )


def call_gemini_file(
    client: Any,
    source: Path,
) -> dict[str, Any]:

    size = source.stat().st_size

    if size > (
        MAX_UPLOAD_SIZE_MB
        * 1024
        * 1024
    ):
        raise RuntimeError(
            f"{source.name} exceeds "
            f"{MAX_UPLOAD_SIZE_MB} MB."
        )

    mime_type = gemini_mime_type(
        source
    )

    last_error: Exception | None = None

    for attempt in range(
        1,
        GEMINI_RETRIES + 1,
    ):

        uploaded = None
        temp_path: Path | None = None

        try:
            temp_path = (
                create_ascii_temp_copy(
                    source
                )
            )

            ascii_display_name = (
                "iar_document_"
                f"{sha256_file(source)[:12]}"
                f"{source.suffix.lower()}"
            )

            upload_config = (
                types.UploadFileConfig(
                    display_name=(
                        ascii_display_name
                    ),
                    mime_type=mime_type,
                )
            )

            logger.info(
                "Uploading ASCII temporary copy to Gemini: %s",
                temp_path.name,
            )

            uploaded = (
                client.files.upload(
                    file=str(
                        temp_path
                    ),
                    config=upload_config,
                )
            )

            if not uploaded or not getattr(
                uploaded,
                "name",
                None,
            ):
                raise RuntimeError(
                    "Gemini upload returned "
                    "no valid file resource."
                )

            response = (
                client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=[
                        AI_PROMPT,
                        uploaded,
                    ],
                    config=gemini_config(),
                )
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

            if attempt < GEMINI_RETRIES:
                retry_sleep(
                    attempt
                )

        finally:
            if uploaded is not None:

                remote_name = getattr(
                    uploaded,
                    "name",
                    None,
                )

                if remote_name:
                    with suppress(
                        Exception
                    ):
                        client.files.delete(
                            name=remote_name
                        )

            if temp_path is not None:
                with suppress(
                    OSError
                ):
                    temp_path.unlink()

    raise RuntimeError(
        f"Gemini file extraction failed "
        f"for {source.name}."
    ) from last_error


# ============================================================
# Groq
# ============================================================

def make_groq_client() -> Any | None:
    if (
        not GROQ_API_KEY
        or Groq is None
    ):
        return None

    return Groq(
        api_key=GROQ_API_KEY
    )


def call_groq(
    client: Any,
    text: str,
) -> dict[str, Any]:

    prompt = build_prompt(
        text
    )

    last_error: Exception | None = None

    for attempt in range(
        1,
        GROQ_RETRIES + 1,
    ):

        try:
            response = (
                client.chat.completions.create(
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
            )

            if not response.choices:
                raise RuntimeError(
                    "Groq returned no choices."
                )

            content = (
                response
                .choices[0]
                .message
                .content
                or ""
            )

            return extract_json_object(
                content
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
                time.sleep(
                    5 * attempt
                )

    raise RuntimeError(
        "Groq extraction failed."
    ) from last_error


# ============================================================
# Metadata
# ============================================================

def clean_title(
    value: Any,
) -> str:
    title = normalize_string(
        value
    )

    if title.lower() in {
        item.lower()
        for item in GENERIC_BANNED_TITLES
    }:
        return ""

    return title


def normalized_ai_data(
    data: dict[str, Any],
) -> dict[str, Any]:

    return {
        "title": clean_title(
            data.get("title")
        ),
        "title_en": normalize_string(
            data.get("title_en")
        ),
        "author": normalize_string(
            data.get("author")
        ),
        "category": normalize_string(
            data.get("category")
        ),
        "type": normalize_string(
            data.get("type")
        ),
        "description": normalize_string(
            data.get("description")
        ),
        "publisher": normalize_string(
            data.get("publisher")
        ),
        "year": safe_int(
            data.get("year")
        ),
        "isbn": normalize_string(
            data.get("isbn")
        ),
        "keywords": normalize_list(
            data.get("keywords"),
            50,
        ),
        "key_points": normalize_list(
            data.get("key_points"),
            30,
        ),
        "target_audience": normalize_string(
            data.get(
                "target_audience"
            )
        ),
    }


def validate_metadata(
    metadata: dict[str, Any],
    source: Path,
) -> None:

    if not metadata.get(
        "title"
    ):
        raise ValueError(
            f"AI did not return a usable title "
            f"for {source.name}."
        )

    if not metadata.get(
        "description"
    ):
        raise ValueError(
            f"AI did not return a usable description "
            f"for {source.name}."
        )

    if not metadata.get(
        "category"
    ):
        raise ValueError(
            f"AI did not return a category "
            f"for {source.name}."
        )

    year = metadata.get(
        "year",
        0,
    )

    if year and (
        year < 1000
        or year > 2100
    ):
        raise ValueError(
            f"Suspicious publication year "
            f"{year} for {source.name}."
        )


def make_book(
    *,
    book_id: int,
    source: Path,
    metadata: dict[str, Any],
    pages: int,
    provider: str,
) -> Book:

    source_hash = sha256_file(
        source
    )

    relative_path = (
        source.as_posix()
    )

    if not relative_path.startswith(
        "pdf/"
    ):
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
        target_audience=(
            metadata["target_audience"]
        ),
        year=metadata["year"],
        pages=pages,
        file_size=format_file_size(
            source.stat().st_size
        ),
        isbn=metadata["isbn"],
        keywords=metadata["keywords"],
        key_points=metadata["key_points"],
        file_path=relative_path,
        file_name=source.name,
        cover_image=(
            f"covers/{book_id}.png"
        ),
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

    by_path: dict[
        str,
        dict[str, Any],
    ] = {}

    by_hash: dict[
        str,
        dict[str, Any],
    ] = {}

    for book in books:

        file_path = normalize_string(
            book.get(
                "file_path"
            )
        )

        source_hash = normalize_string(
            book.get(
                "source_sha256"
            )
        )

        if file_path:
            by_path[
                file_path
            ] = book

        if source_hash:
            by_hash[
                source_hash
            ] = book

    return (
        by_path,
        by_hash,
    )


def should_skip_existing(
    source: Path,
    by_path: dict[str, dict[str, Any]],
) -> bool:

    relative_path = (
        source.as_posix()
    )

    existing = by_path.get(
        relative_path
    )

    if existing is None:
        return False

    existing_hash = normalize_string(
        existing.get(
            "source_sha256"
        )
    )

    if existing_hash:

        current_hash = sha256_file(
            source
        )

        return (
            current_hash.lower()
            == existing_hash.lower()
        )

    # Legacy fallback.
    return True


# ============================================================
# Book processing
# ============================================================

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

    size_mb = (
        source.stat().st_size
        / (
            1024 * 1024
        )
    )

    if size_mb > MAX_PDF_SIZE_MB:
        logger.warning(
            "Skipping %s: %.1f MB exceeds "
            "local %s MB safety limit.",
            source,
            size_mb,
            MAX_PDF_SIZE_MB,
        )

        return None

    text, pages, needs_file_analysis = (
        extract_document_text(
            source
        )
    )

    metadata: dict[str, Any] | None = None
    provider = ""

    gemini_client = (
        make_gemini_client()
    )

    groq_client = (
        make_groq_client()
    )

    # --------------------------------------------------------
    # Normal text path
    # --------------------------------------------------------

    if (
        len(text)
        >= MIN_MEANINGFUL_TEXT
        and not needs_file_analysis
    ):

        if gemini_client is not None:
            try:
                metadata = call_gemini_text(
                    gemini_client,
                    text,
                )

                provider = (
                    "gemini-text"
                )

            except Exception as exc:
                logger.warning(
                    "Gemini text extraction failed "
                    "for %s: %s",
                    source.name,
                    exc,
                )

        if (
            metadata is None
            and groq_client is not None
        ):
            try:
                metadata = call_groq(
                    groq_client,
                    text,
                )

                provider = "groq"

            except Exception as exc:
                logger.error(
                    "Groq extraction failed "
                    "for %s: %s",
                    source.name,
                    exc,
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

        if (
            gemini_client is not None
            and size_mb
            <= MAX_UPLOAD_SIZE_MB
        ):

            try:
                metadata = call_gemini_file(
                    gemini_client,
                    source,
                )

                provider = (
                    "gemini-file"
                )

            except Exception as exc:
                logger.error(
                    "Gemini file extraction failed "
                    "for %s: %s",
                    source.name,
                    exc,
                )

        elif (
            gemini_client is not None
            and size_mb
            > MAX_UPLOAD_SIZE_MB
        ):

            logger.warning(
                "Gemini file upload skipped for %s: "
                "%.1f MB exceeds %s MB.",
                source.name,
                size_mb,
                MAX_UPLOAD_SIZE_MB,
            )

        # If the file is too large for Gemini direct upload,
        # use whatever text was successfully extracted.
        if (
            metadata is None
            and len(text)
            >= MIN_MEANINGFUL_TEXT
            and groq_client is not None
        ):

            try:
                metadata = call_groq(
                    groq_client,
                    text,
                )

                provider = "groq"

            except Exception as exc:
                logger.error(
                    "Groq fallback failed "
                    "for %s: %s",
                    source.name,
                    exc,
                )

    if metadata is None:

        logger.error(
            "All available AI extraction paths failed "
            "for %s.",
            source.name,
        )

        return None

    metadata = normalized_ai_data(
        metadata
    )

    validate_metadata(
        metadata,
        source,
    )

    return make_book(
        book_id=book_id,
        source=source,
        metadata=metadata,
        pages=pages,
        provider=provider,
    )


# ============================================================
# Main
# ============================================================

def main() -> None:

    if not PDF_DIR.exists():
        PDF_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

    if (
        not GEMINI_API_KEY
        and not GROQ_API_KEY
    ):
        raise RuntimeError(
            "No AI provider is configured. "
            "Set GEMINI_API_KEY and/or GROQ_API_KEY."
        )

    books = load_books()

    if len(books) > MAX_BOOKS:
        raise RuntimeError(
            f"{JSON_PATH} contains more than "
            f"{MAX_BOOKS} records."
        )

    logger.info(
        "Existing catalog records: %s",
        len(books),
    )

    extract_zips()

    by_path, _ = (
        existing_book_maps(
            books
        )
    )

    candidates = sorted(
        path
        for path in PDF_DIR.rglob("*")
        if is_supported_document(
            path
        )
    )

    logger.info(
        "Supported documents found: %s",
        len(candidates),
    )

    next_id = next_book_id(
        books
    )

    successful = 0
    skipped = 0

    for source in candidates:

        if should_skip_existing(
            source,
            by_path,
        ):

            skipped += 1

            logger.info(
                "Skipping already processed file: %s",
                source.as_posix(),
            )

            continue

        try:
            book = process_one_book(
                source,
                next_id,
            )

        except Exception as exc:
            logger.exception(
                "Unhandled processing error "
                "for %s: %s",
                source,
                exc,
            )

            continue

        if book is None:
            continue

        record = book.to_json_dict()

        books.append(
            record
        )

        by_path[
            book.file_path
        ] = record

        next_id += 1
        successful += 1

        save_books(
            books
        )

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
            "books.json contains no books "
            "after processing."
        )


if __name__ == "__main__":
    main()
