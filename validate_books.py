"""
IAR Archive — strict books.json validator.

Purpose:
    Ensure books.json conforms to the normalized archive schema.

Important:
    Author is intentionally OPTIONAL.

Why?
    The archive may contain institutional publications, guides,
    reports, regulations, manuals, circulars, and other references
    that do not have an individual author.

Missing author therefore generates a warning instead of failing
the workflow.

Partial records
---------------
process_books.py never drops a book when AI providers are unavailable:
it writes a record marked  "ai_status": "partial"  built from local data
only and completes it automatically on a later run. For such records only
id, title and file_path are mandatory; category, type and description may
be empty (the website shows neutral labels for empty values). Records
without ai_status, or with "complete", are validated strictly as before.
"""

from __future__ import annotations

import json

from pathlib import Path
from typing import Any


BOOKS_PATH = Path(
    "books.json"
)

MAX_BOOKS = 10_000

# Required fields represent data that is structurally necessary
# for the archive to display and reference an item.
#
# "author" is deliberately NOT required.
REQUIRED_FIELDS = {
    "id",
    "title",
    "category",
    "description",
    "type",
    "file_path",
}

# Minimum for records still waiting for AI enrichment (ai_status="partial").
PARTIAL_REQUIRED_FIELDS = {
    "id",
    "title",
    "file_path",
}

VALID_AI_STATUSES = {
    "complete",
    "partial",
}

MAX_AI_ATTEMPTS = 1_000

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

MAX_LENGTHS = {
    "id": 20,
    "title": 500,
    "title_en": 500,

    "author": 500,
    "author_en": 500,

    "category": 300,
    "category_en": 300,

    "description": 10_000,
    "description_en": 10_000,

    "publisher": 500,
    "publisher_en": 500,

    "type": 200,
    "type_en": 200,

    "target_audience": 1_500,
    "target_audience_en": 1_500,

    "isbn": 100,

    "file_path": 1_000,
    "file_name": 500,
    "cover_image": 1_000,

    "source_sha256": 64,
}


# ============================================================
# Error / warning helpers
# ============================================================

def fail(
    message: str,
) -> None:
    print(
        "::error title=Catalog Validation::"
        f"{message}"
    )

    raise SystemExit(1)


def warning(
    message: str,
) -> None:
    print(
        "::warning title=Catalog Validation::"
        f"{message}"
    )


# ============================================================
# String validation
# ============================================================

def require_string(
    book: dict[str, Any],
    field: str,
    index: int,
    *,
    allow_empty: bool = False,
) -> str:
    value = book.get(
        field
    )

    if value is None:
        if allow_empty:
            return ""

        fail(
            f"Book #{index}: missing required field "
            f"'{field}'."
        )

    if not isinstance(
        value,
        str,
    ):
        fail(
            f"Book #{index}: field '{field}' "
            "must be a string."
        )

    value = value.strip()

    if (
        not value
        and not allow_empty
    ):
        fail(
            f"Book #{index}: field '{field}' "
            "cannot be empty."
        )

    maximum = MAX_LENGTHS.get(
        field
    )

    if (
        maximum is not None
        and len(value) > maximum
    ):
        fail(
            f"Book #{index}: field '{field}' "
            f"exceeds {maximum} characters."
        )

    return value


# ============================================================
# Numeric validation
# ============================================================

def validate_integer(
    book: dict[str, Any],
    field: str,
    index: int,
    *,
    minimum: int = 0,
    maximum: int | None = None,
) -> None:
    value = book.get(
        field
    )

    if value is None:
        return

    if isinstance(
        value,
        bool,
    ):
        fail(
            f"Book #{index}: '{field}' "
            "must be an integer."
        )

    if not isinstance(
        value,
        int,
    ):
        fail(
            f"Book #{index}: '{field}' "
            "must be an integer."
        )

    if value < minimum:
        fail(
            f"Book #{index}: '{field}' "
            f"cannot be below {minimum}."
        )

    if (
        maximum is not None
        and value > maximum
    ):
        fail(
            f"Book #{index}: '{field}' "
            f"exceeds {maximum}."
        )


def validate_year(
    book: dict[str, Any],
    index: int,
) -> None:
    value = book.get(
        "year"
    )

    if value is None:
        return

    if (
        isinstance(value, bool)
        or not isinstance(value, int)
    ):
        fail(
            f"Book #{index}: year must be an integer."
        )

    if value < 0:
        fail(
            f"Book #{index}: year cannot be negative."
        )

    # 0 means "unknown / not available".
    if value != 0 and (
        value < 1000
        or value > 2100
    ):
        fail(
            f"Book #{index}: suspicious publication "
            f"year '{value}'."
        )


def validate_pages(
    book: dict[str, Any],
    index: int,
) -> None:
    validate_integer(
        book,
        "pages",
        index,
        minimum=0,
        maximum=100_000,
    )


# ============================================================
# ID validation
# ============================================================

def validate_id(
    book: dict[str, Any],
    index: int,
    seen_ids: set[int],
) -> None:
    value = book.get(
        "id"
    )

    if isinstance(
        value,
        bool,
    ):
        fail(
            f"Book #{index}: id cannot be boolean."
        )

    if not isinstance(
        value,
        int,
    ):
        fail(
            f"Book #{index}: id must be an integer."
        )

    if value < 0:
        fail(
            f"Book #{index}: id cannot be negative."
        )

    if value in seen_ids:
        fail(
            f"Duplicate book id detected: {value}."
        )

    seen_ids.add(
        value
    )


# ============================================================
# List validation
# ============================================================

def validate_list(
    book: dict[str, Any],
    field: str,
    index: int,
    *,
    max_items: int,
    max_item_length: int,
) -> None:
    value = book.get(
        field
    )

    if value is None:
        return

    if not isinstance(
        value,
        list,
    ):
        fail(
            f"Book #{index}: '{field}' "
            "must be an array."
        )

    if len(value) > max_items:
        fail(
            f"Book #{index}: '{field}' contains "
            f"{len(value)} items; maximum is {max_items}."
        )

    for item_index, item in enumerate(
        value,
        start=1,
    ):
        if not isinstance(
            item,
            str,
        ):
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' "
                "must be a string."
            )

        item = item.strip()

        if not item:
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' "
                "cannot be empty."
            )

        if len(item) > max_item_length:
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' "
                f"exceeds {max_item_length} characters."
            )


# ============================================================
# Boolean validation
# ============================================================

def validate_boolean(
    book: dict[str, Any],
    field: str,
    index: int,
) -> None:
    value = book.get(
        field
    )

    if value is None:
        return

    if not isinstance(
        value,
        bool,
    ):
        fail(
            f"Book #{index}: '{field}' "
            "must be boolean."
        )


# ============================================================
# File/path validation
# ============================================================

def validate_file_path(
    book: dict[str, Any],
    index: int,
) -> None:
    path = require_string(
        book,
        "file_path",
        index,
    )

    normalized = path.replace(
        "\\",
        "/",
    )

    if not normalized.startswith(
        "pdf/"
    ):
        fail(
            f"Book #{index}: file_path must stay "
            f"inside 'pdf/'. Received: {path}"
        )

    parts = Path(
        normalized
    ).parts

    if ".." in parts:
        fail(
            f"Book #{index}: file_path contains "
            "path traversal."
        )

    extension = Path(
        normalized
    ).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        fail(
            f"Book #{index}: unsupported file "
            f"extension '{extension}'."
        )


def validate_cover_path(
    book: dict[str, Any],
    index: int,
) -> None:
    value = book.get(
        "cover_image"
    )

    if value in (
        None,
        "",
    ):
        return

    path = require_string(
        book,
        "cover_image",
        index,
        allow_empty=True,
    )

    normalized = path.replace(
        "\\",
        "/",
    )

    if not normalized.startswith(
        "covers/"
    ):
        fail(
            f"Book #{index}: cover_image must stay "
            "inside 'covers/'."
        )

    if ".." in Path(
        normalized
    ).parts:
        fail(
            f"Book #{index}: cover_image contains "
            "path traversal."
        )


def validate_sha256(
    book: dict[str, Any],
    index: int,
) -> None:
    value = book.get(
        "source_sha256"
    )

    if value in (
        None,
        "",
    ):
        return

    value = require_string(
        book,
        "source_sha256",
        index,
        allow_empty=True,
    )

    if len(value) != 64:
        fail(
            f"Book #{index}: source_sha256 must "
            "contain exactly 64 hexadecimal characters."
        )

    if any(
        char not in "0123456789abcdefABCDEF"
        for char in value
    ):
        fail(
            f"Book #{index}: source_sha256 contains "
            "non-hexadecimal characters."
        )


# ============================================================
# AI enrichment bookkeeping (ai_status / ai_attempts)
# ============================================================

def validate_ai_fields(
    book: dict[str, Any],
    index: int,
) -> None:
    status = book.get(
        "ai_status"
    )

    if status is not None and (
        not isinstance(status, str)
        or status not in VALID_AI_STATUSES
    ):
        fail(
            f"Book #{index}: ai_status must be one of "
            + ", ".join(sorted(VALID_AI_STATUSES))
            + "."
        )

    validate_integer(
        book,
        "ai_attempts",
        index,
        minimum=0,
        maximum=MAX_AI_ATTEMPTS,
    )


# ============================================================
# Book validation
# ============================================================

def validate_book(
    book: Any,
    index: int,
    seen_ids: set[int],
) -> None:
    if not isinstance(
        book,
        dict,
    ):
        fail(
            f"Book #{index}: expected a JSON object."
        )

    partial = book.get("ai_status") == "partial"

    missing = sorted(
        (
            PARTIAL_REQUIRED_FIELDS
            if partial
            else REQUIRED_FIELDS
        )
        - book.keys()
    )

    if missing:
        fail(
            f"Book #{index}: missing required fields: "
            + ", ".join(missing)
        )

    validate_id(
        book,
        index,
        seen_ids,
    )

    # --------------------------------------------------------
    # Required textual metadata
    # --------------------------------------------------------

    for field in (
        "title",
        "category",
        "description",
        "type",
    ):
        require_string(
            book,
            field,
            index,
            # Partial records may leave everything but the title empty.
            allow_empty=partial and field != "title",
        )

    # --------------------------------------------------------
    # Optional textual metadata
    # --------------------------------------------------------

    optional_strings = {
        "author",
        "author_en",
        "title_en",
        "category_en",
        "description_en",
        "publisher",
        "publisher_en",
        "type_en",
        "target_audience",
        "target_audience_en",
        "isbn",
        "badge_text",
        "badge_text_en",
        "file_name",
        "file_size",
        "file_type",
    }

    for field in optional_strings:
        if field in book:
            value = require_string(
                book,
                field,
                index,
                allow_empty=True,
            )

            # Missing author is valid for institutional /
            # administrative material, but remain visible
            # as a warning for data-quality review.
            if (
                field == "author"
                and not value
            ):
                warning(
                    f"Book #{index}: author is empty. "
                    "This is allowed for institutional or "
                    "authorless references."
                )

    # --------------------------------------------------------
    # Numeric fields
    # --------------------------------------------------------

    validate_year(
        book,
        index,
    )

    validate_pages(
        book,
        index,
    )

    # --------------------------------------------------------
    # Paths
    # --------------------------------------------------------

    validate_file_path(
        book,
        index,
    )

    validate_cover_path(
        book,
        index,
    )

    validate_sha256(
        book,
        index,
    )

    # --------------------------------------------------------
    # AI enrichment bookkeeping
    # --------------------------------------------------------

    validate_ai_fields(
        book,
        index,
    )

    # --------------------------------------------------------
    # Boolean fields
    # --------------------------------------------------------

    validate_boolean(
        book,
        "featured",
        index,
    )

    # --------------------------------------------------------
    # Arrays
    # --------------------------------------------------------

    for field in (
        "keywords",
        "keywords_en",
    ):
        validate_list(
            book,
            field,
            index,
            max_items=50,
            max_item_length=150,
        )

    for field in (
        "key_points",
        "key_points_en",
    ):
        validate_list(
            book,
            field,
            index,
            max_items=30,
            max_item_length=1_000,
        )


# ============================================================
# Main
# ============================================================

def main() -> None:
    if not BOOKS_PATH.is_file():
        fail(
            "books.json does not exist."
        )

    if BOOKS_PATH.stat().st_size == 0:
        fail(
            "books.json is empty."
        )

    try:
        data = json.loads(
            BOOKS_PATH.read_text(
                encoding="utf-8"
            )
        )

    except json.JSONDecodeError as exc:
        fail(
            f"books.json contains invalid JSON: {exc}"
        )

    if not isinstance(
        data,
        list,
    ):
        fail(
            "books.json must contain a top-level array."
        )

    if len(data) > MAX_BOOKS:
        fail(
            f"Catalog contains {len(data)} books. "
            f"Maximum supported is {MAX_BOOKS}."
        )

    seen_ids: set[int] = set()

    for index, book in enumerate(
        data,
        start=1,
    ):
        validate_book(
            book,
            index,
            seen_ids,
        )

    partial_count = sum(
        1
        for book in data
        if book.get("ai_status") == "partial"
    )

    if partial_count:
        warning(
            f"{partial_count} record(s) are marked 'partial' and "
            "will be completed automatically on a later run."
        )

    print(
        "✓ Catalog validation passed: "
        f"{len(data)} records checked."
    )


if __name__ == "__main__":
    main()
