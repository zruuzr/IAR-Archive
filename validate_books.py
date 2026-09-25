from __future__ import annotations

import json
import sys

from pathlib import Path
from typing import Any


BOOKS_PATH = Path("books.json")

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
    "id": 200,
    "title": 500,
    "title_en": 500,
    "author": 500,
    "category": 300,
    "description": 10_000,
    "publisher": 500,
    "type": 200,
    "target_audience": 1_500,
    "isbn": 100,
    "file_path": 1_000,
    "file_name": 500,
    "cover_image": 1_000,
    "source_sha256": 128,
}


def fail(message: str) -> None:
    print(
        f"::error title=Catalog Validation::{message}"
    )
    raise SystemExit(1)


def require_string(
    book: dict[str, Any],
    field: str,
    index: int,
    allow_empty: bool = False,
) -> str:
    value = book.get(field)

    if value is None:
        if allow_empty:
            return ""
        fail(
            f"Book #{index}: missing required field '{field}'."
        )

    if not isinstance(value, str):
        fail(
            f"Book #{index}: field '{field}' must be a string."
        )

    value = value.strip()

    if not value and not allow_empty:
        fail(
            f"Book #{index}: field '{field}' cannot be empty."
        )

    max_length = MAX_LENGTHS.get(field)

    if max_length and len(value) > max_length:
        fail(
            f"Book #{index}: field '{field}' exceeds "
            f"{max_length} characters."
        )

    return value


def validate_integer(
    book: dict[str, Any],
    field: str,
    index: int,
    minimum: int = 0,
    maximum: int | None = None,
) -> None:
    value = book.get(field)

    if value in (None, ""):
        return

    if isinstance(value, bool):
        fail(
            f"Book #{index}: '{field}' must be an integer."
        )

    if not isinstance(value, int):
        fail(
            f"Book #{index}: '{field}' must be an integer."
        )

    if value < minimum:
        fail(
            f"Book #{index}: '{field}' cannot be below {minimum}."
        )

    if maximum is not None and value > maximum:
        fail(
            f"Book #{index}: '{field}' exceeds {maximum}."
        )


def validate_list(
    book: dict[str, Any],
    field: str,
    index: int,
    max_items: int,
    max_item_length: int,
) -> None:
    value = book.get(field)

    if value is None:
        return

    if not isinstance(value, list):
        fail(
            f"Book #{index}: '{field}' must be an array."
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
        if not isinstance(item, str):
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' must be a string."
            )

        item = item.strip()

        if not item:
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' cannot be empty."
            )

        if len(item) > max_item_length:
            fail(
                f"Book #{index}: "
                f"'{field}[{item_index}]' exceeds "
                f"{max_item_length} characters."
            )


def validate_id(
    book: dict[str, Any],
    index: int,
    seen_ids: set[int],
) -> None:
    value = book.get("id")

    if isinstance(value, bool):
        fail(
            f"Book #{index}: id cannot be boolean."
        )

    if not isinstance(value, int):
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

    seen_ids.add(value)


def validate_year(
    book: dict[str, Any],
    index: int,
) -> None:
    value = book.get("year")

    if value in (None, "", 0):
        return

    if isinstance(value, bool) or not isinstance(value, int):
        fail(
            f"Book #{index}: year must be an integer."
        )

    if value < 1000 or value > 2100:
        fail(
            f"Book #{index}: suspicious publication year "
            f"'{value}'."
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

    if not normalized.startswith("pdf/"):
        fail(
            f"Book #{index}: file_path must stay inside "
            f"'pdf/'. Received: {path}"
        )

    if any(
        part == ".."
        for part in Path(normalized).parts
    ):
        fail(
            f"Book #{index}: file_path contains path traversal."
        )

    extension = Path(normalized).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        fail(
            f"Book #{index}: unsupported file extension "
            f"'{extension}'."
        )


def validate_cover_path(
    book: dict[str, Any],
    index: int,
) -> None:
    value = book.get("cover_image")

    if value in (None, ""):
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

    if not normalized.startswith("covers/"):
        fail(
            f"Book #{index}: cover_image must stay inside "
            f"'covers/'."
        )

    if any(
        part == ".."
        for part in Path(normalized).parts
    ):
        fail(
            f"Book #{index}: cover_image contains path traversal."
        )


def validate_sha256(
    book: dict[str, Any],
    index: int,
) -> None:
    value = book.get("source_sha256")

    if value in (None, ""):
        return

    value = require_string(
        book,
        "source_sha256",
        index,
        allow_empty=True,
    )

    if len(value) != 64:
        fail(
            f"Book #{index}: source_sha256 must contain "
            f"64 hexadecimal characters."
        )

    if any(
        char not in "0123456789abcdefABCDEF"
        for char in value
    ):
        fail(
            f"Book #{index}: source_sha256 contains "
            f"non-hexadecimal characters."
        )


def validate_boolean(
    book: dict[str, Any],
    field: str,
    index: int,
) -> None:
    value = book.get(field)

    if value is None:
        return

    if not isinstance(value, bool):
        fail(
            f"Book #{index}: '{field}' must be boolean."
        )


def validate_book(
    book: Any,
    index: int,
    seen_ids: set[int],
) -> None:
    if not isinstance(book, dict):
        fail(
            f"Book #{index}: expected an object."
        )

    missing = sorted(
        REQUIRED_FIELDS - book.keys()
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

    for field in (
        "title_en",
        "publisher",
        "publisher_en",
        "target_audience",
        "isbn",
        "file_name",
        "badge_text",
        "badge_text_en",
    ):
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

    validate_list(
        book,
        "keywords",
        index,
        max_items=50,
        max_item_length=150,
    )

    validate_list(
        book,
        "keywords_en",
        index,
        max_items=50,
        max_item_length=150,
    )

    validate_list(
        book,
        "key_points",
        index,
        max_items=30,
        max_item_length=1_000,
    )

    validate_list(
        book,
        "key_points_en",
        index,
        max_items=30,
        max_item_length=1_000,
    )

    file_size = book.get("file_size")

    if file_size is not None:
        if not isinstance(file_size, str):
            fail(
                f"Book #{index}: file_size must be a string."
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

    if not isinstance(data, list):
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
        f"✓ Catalog validation passed: "
        f"{len(data)} records checked."
    )


if __name__ == "__main__":
    main()
