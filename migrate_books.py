"""
IAR Archive — books.json migration utility.

Purpose:
    Normalize legacy books.json records so they conform to the
    current archive schema before strict validation.

This script does NOT call Gemini or Groq.

Migration tasks:
- Normalize numeric fields.
- Normalize booleans.
- Normalize string fields.
- Normalize list fields.
- Backfill source_sha256 when the referenced source file exists.
- Preserve all existing book records.
- Create a backup before writing.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import shutil
import tempfile

from pathlib import Path
from typing import Any


JSON_PATH = Path("books.json")
PDF_DIR = Path("pdf")
BACKUP_PATH = Path("books.json.migration.bak")

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
    "iar-books-migration"
)


# ============================================================
# Helpers
# ============================================================

def normalize_string(
    value: Any,
) -> str:
    if value is None:
        return ""

    return str(value).strip()


def normalize_int(
    value: Any,
    default: int = 0,
) -> int:
    if value is None:
        return default

    if isinstance(
        value,
        bool,
    ):
        return int(value)

    if isinstance(
        value,
        int,
    ):
        return value if value >= 0 else default

    if isinstance(
        value,
        float,
    ):
        if value.is_integer() and value >= 0:
            return int(value)

        return default

    text = str(value).strip()

    if not text:
        return default

    # Accept simple integer strings.
    if re.fullmatch(
        r"\d+",
        text,
    ):
        return int(text)

    # Accept strings such as:
    # "312 صفحة"
    # "312 pages"
    match = re.search(
        r"(?<!\d)(\d{1,6})(?!\d)",
        text,
    )

    if match:
        try:
            return int(
                match.group(1)
            )
        except ValueError:
            pass

    return default


def normalize_bool(
    value: Any,
) -> bool:
    if isinstance(
        value,
        bool,
    ):
        return value

    if isinstance(
        value,
        int,
    ):
        return value != 0

    text = normalize_string(
        value
    ).lower()

    if text in {
        "true",
        "1",
        "yes",
        "y",
        "on",
        "نعم",
        "صحيح",
    }:
        return True

    return False


def normalize_list(
    value: Any,
) -> list[str]:
    if value is None:
        return []

    if isinstance(
        value,
        list,
    ):
        return [
            normalize_string(item)
            for item in value
            if normalize_string(item)
        ]

    # Legacy data may occasionally have
    # a single keyword as a string.
    if isinstance(
        value,
        str,
    ):
        text = value.strip()

        if not text:
            return []

        return [text]

    return []


def atomic_write(
    path: Path,
    payload: str,
) -> None:
    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        suffix=".tmp",
        prefix=".books-migration-",
        dir=str(path.parent),
        delete=False,
    ) as temp:
        temp_path = Path(
            temp.name
        )

        temp.write(payload)
        temp.flush()

        os.fsync(
            temp.fileno()
        )

    temp_path.replace(
        path
    )


def sha256_file(
    path: Path,
) -> str:
    digest = hashlib.sha256()

    with path.open(
        "rb"
    ) as file:
        while True:
            chunk = file.read(
                1024 * 1024
            )

            if not chunk:
                break

            digest.update(
                chunk
            )

    return digest.hexdigest()


def source_path_from_record(
    book: dict[str, Any],
) -> Path | None:
    file_path = normalize_string(
        book.get("file_path")
    )

    if not file_path:
        return None

    normalized = file_path.replace(
        "\\",
        "/",
    )

    if not normalized.startswith(
        "pdf/"
    ):
        return None

    path = Path(
        normalized
    )

    if any(
        part in {"..", "."}
        for part in path.parts
    ):
        return None

    return path


# ============================================================
# Migration
# ============================================================

def migrate_book(
    book: dict[str, Any],
) -> tuple[dict[str, Any], bool]:
    changed = False

    result = dict(book)

    # --------------------------------------------------------
    # ID
    # --------------------------------------------------------

    old_id = book.get("id")

    new_id = normalize_int(
        old_id,
        default=0,
    )

    if old_id != new_id:
        result["id"] = new_id
        changed = True

    # --------------------------------------------------------
    # Numeric fields
    # --------------------------------------------------------

    for field in (
        "year",
        "pages",
    ):
        old_value = book.get(
            field
        )

        new_value = normalize_int(
            old_value,
            default=0,
        )

        if old_value != new_value:
            result[field] = new_value
            changed = True

    # --------------------------------------------------------
    # Boolean fields
    # --------------------------------------------------------

    if "featured" in book:
        old_value = book.get(
            "featured"
        )

        new_value = normalize_bool(
            old_value
        )

        if old_value != new_value:
            result["featured"] = new_value
            changed = True

    # --------------------------------------------------------
    # Text fields
    # --------------------------------------------------------

    text_fields = {
        "title",
        "title_en",
        "author",
        "author_en",
        "category",
        "category_en",
        "description",
        "description_en",
        "publisher",
        "publisher_en",
        "type",
        "type_en",
        "target_audience",
        "target_audience_en",
        "badge_text",
        "badge_text_en",
        "file_path",
        "file_name",
        "cover_image",
        "file_size",
        "isbn",
    }

    for field in text_fields:
        if field not in book:
            continue

        old_value = book.get(
            field
        )

        new_value = normalize_string(
            old_value
        )

        if old_value != new_value:
            result[field] = new_value
            changed = True

    # --------------------------------------------------------
    # List fields
    # --------------------------------------------------------

    list_fields = {
        "keywords",
        "keywords_en",
        "key_points",
        "key_points_en",
    }

    for field in list_fields:
        if field not in book:
            continue

        old_value = book.get(
            field
        )

        new_value = normalize_list(
            old_value
        )

        if old_value != new_value:
            result[field] = new_value
            changed = True

    # --------------------------------------------------------
    # Backfill SHA-256 for existing files.
    # --------------------------------------------------------

    existing_hash = normalize_string(
        book.get("source_sha256")
    )

    if not existing_hash:
        source_path = (
            source_path_from_record(
                result
            )
        )

        if (
            source_path is not None
            and source_path.is_file()
        ):
            try:
                new_hash = sha256_file(
                    source_path
                )

                result[
                    "source_sha256"
                ] = new_hash

                changed = True

                logger.info(
                    "Added SHA-256 for book #%s: %s",
                    result.get("id"),
                    source_path,
                )

            except OSError as exc:
                logger.warning(
                    "Could not hash source file for book #%s: %s",
                    result.get("id"),
                    exc,
                )

    return result, changed


def load_books() -> list[dict[str, Any]]:
    if not JSON_PATH.is_file():
        raise RuntimeError(
            "books.json does not exist."
        )

    try:
        data = json.loads(
            JSON_PATH.read_text(
                encoding="utf-8"
            )
        )

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"books.json contains invalid JSON: {exc}"
        ) from exc

    if not isinstance(
        data,
        list,
    ):
        raise RuntimeError(
            "books.json must contain a top-level array."
        )

    return data


def main() -> None:
    books = load_books()

    logger.info(
        "Loaded %s catalog records.",
        len(books),
    )

    # --------------------------------------------------------
    # Backup
    # --------------------------------------------------------

    shutil.copy2(
        JSON_PATH,
        BACKUP_PATH,
    )

    logger.info(
        "Backup created: %s",
        BACKUP_PATH,
    )

    migrated: list[
        dict[str, Any]
    ] = []

    changed_count = 0

    for index, book in enumerate(
        books,
        start=1,
    ):
        if not isinstance(
            book,
            dict,
        ):
            raise RuntimeError(
                f"Book #{index} is not a JSON object."
            )

        updated, changed = migrate_book(
            book
        )

        migrated.append(
            updated
        )

        if changed:
            changed_count += 1

    payload = json.dumps(
        migrated,
        ensure_ascii=False,
        indent=2,
    ) + "\n"

    atomic_write(
        JSON_PATH,
        payload,
    )

    logger.info(
        "Migration complete. Changed records: %s / %s.",
        changed_count,
        len(books),
    )


if __name__ == "__main__":
    main()
