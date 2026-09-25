"""
IAR Archive — strict books.json validator.

Purpose:
    Ensure books.json conforms to the normalized archive schema.

This validator intentionally fails on malformed data.
Legacy normalization belongs to migrate_books.py.
"""

from __future__ import annotations

import json

from pathlib import Path
from typing import Any


BOOKS_PATH = Path(
    "books.json"
)

MAX_BOOKS = 10_000

REQUIRED_FIELDS = {
    "id",
    "title",
    "author",
    "category",
    "description",
    "type",
    "file_path",
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


def fail(
    message: str,
) -> None:
    print(
        "::error title=Catalog Validation::"
        f"{message}"
    )

    raise SystemExit(1)


def require_string(
    book: dict[str, Any],
    field: str,
    index: int,
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


def validate_integer(
    book: dict[str, Any],
    field: str,
    index: int,
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


def validate_list(
    book: dict[str, Any],
    field: str,
    index: int,
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

        if not item.strip():
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' "
                "cannot be empty."
            )

        if len(item.strip()) > max_item_length:
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' "
                f"exceeds {max_item_length} characters."
            )


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


def validate_year(
    book: dict[str, Any],
    index: int,
) -> None:
    value = book.get(
        "year"
    )

    if value is None:
        return

    if isinstance(
        value,
        bool,
    ) or not isinstance(
        value,
        int,
    ):
        fail(
            f"Book #{index}: year must be an integer."
        )

    if value < 0:
        fail(
            f"Book #{index}: year cannot be negative."
        )

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

    missing = sorted(
        REQUIRED_FIELDS
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

    for field in (
        "title",
        "author",
        "category",
        "description",
        "type",
    ):
        require_string(
            book,
            field,
            index,
        )

    optional_strings = {
        "title_en",
        "author_en",
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
    }

    for field in optional_strings:
        if field in book:
            require_string(
                book,
                field,
                index,
                allow_empty=True,
            )

    validate_year(
        book,
        index,
    )

    validate_pages(
        book,
        index,
    )

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

    validate_boolean(
        book,
        "featured",
        index,
    )

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

    print(
        "✓ Catalog validation passed: "
        f"{len(data)} records checked."
    )


if __name__ == "__main__":
    main()
