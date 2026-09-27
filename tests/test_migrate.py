"""
اختبارات migrate_books.py

هذا السكربت يُعدّل books.json مباشرة.
bug فيه قد يُفقد بيانات الأرشيف بالكامل.

الاستثناءات: RuntimeError, OSError.
"""
import hashlib
import json
import pytest
from pathlib import Path

import migrate_books
from migrate_books import (
    normalize_string,
    normalize_int,
    normalize_bool,
    normalize_list,
    atomic_write,
    sha256_file,
    source_path_from_record,
    migrate_book,
    load_books,
    main,
    BACKUP_PATH,
)


# ============================================================
# Fixtures
# ============================================================

@pytest.fixture
def isolated(tmp_path, monkeypatch):
    """يعزل كل ثوابت module في مجلد مؤقت"""
    books = tmp_path / "books.json"
    pdf = tmp_path / "pdf"
    pdf.mkdir()
    backup = tmp_path / "books.json.migration.bak"

    monkeypatch.setattr(migrate_books, "JSON_PATH", books)
    monkeypatch.setattr(migrate_books, "PDF_DIR", pdf)
    monkeypatch.setattr(migrate_books, "BACKUP_PATH", backup)
    monkeypatch.chdir(tmp_path)

    return {
        "root": tmp_path,
        "books": books,
        "pdf": pdf,
        "backup": backup,
    }


@pytest.fixture
def write_books(isolated):
    """يكتب books.json ويُعيد المسار"""
    def _write(data):
        if isinstance(data, (list, dict)):
            isolated["books"].write_text(
                json.dumps(data, ensure_ascii=False),
                encoding="utf-8",
            )
        else:
            isolated["books"].write_text(data, encoding="utf-8")
        return isolated["books"]
    return _write


@pytest.fixture
def minimal_book():
    """كتاب بسيط صالح للـ migration"""
    return {
        "id": 1,
        "title": "مقدمة",
        "category": "إدارة",
        "description": "وصف",
        "type": "كتاب",
        "file_path": "pdf/book.pdf",
    }


# ============================================================
# normalize_string
# ============================================================

class TestNormalizeString:
    def test_none_returns_empty(self):
        assert normalize_string(None) == ""

    def test_strips_whitespace(self):
        assert normalize_string("  hi  ") == "hi"

    def test_number_to_string(self):
        assert normalize_string(42) == "42"

    def test_float_to_string(self):
        assert normalize_string(3.14) == "3.14"

    def test_preserves_arabic(self):
        assert normalize_string("مرحبا") == "مرحبا"

    def test_empty_stays_empty(self):
        assert normalize_string("") == ""

    def test_list_to_string(self):
        # سلوك Python الافتراضي — ليست حالة مقصودة لكن موثّقة
        assert normalize_string([1, 2]) == "[1, 2]"


# ============================================================
# normalize_int — الأخطر (regex + أنواع متعددة)
# ============================================================

class TestNormalizeInt:
    def test_none_returns_default(self):
        assert normalize_int(None) == 0

    def test_custom_default(self):
        assert normalize_int(None, default=99) == 99

    def test_bool_true_returns_one(self):
        assert normalize_int(True) == 1

    def test_bool_false_returns_zero(self):
        assert normalize_int(False) == 0

    def test_positive_int(self):
        assert normalize_int(42) == 42

    def test_zero(self):
        assert normalize_int(0) == 0

    def test_negative_int_returns_default(self):
        assert normalize_int(-5) == 0

    def test_negative_int_with_custom_default(self):
        assert normalize_int(-5, default=100) == 100

    def test_positive_float_integral(self):
        assert normalize_int(3.0) == 3

    def test_negative_float_integral_returns_default(self):
        assert normalize_int(-3.0) == 0

    def test_non_integral_float_returns_default(self):
        assert normalize_int(3.9) == 0

    def test_string_digits(self):
        assert normalize_int("312") == 312

    def test_string_with_leading_zeros(self):
        assert normalize_int("0042") == 42

    def test_string_arabic_suffix(self):
        # "312 صفحة" → 312
        assert normalize_int("312 صفحة") == 312

    def test_string_english_suffix(self):
        assert normalize_int("312 pages") == 312

    def test_string_mixed_with_number(self):
        assert normalize_int("about 42 items") == 42

    def test_string_no_number_returns_default(self):
        assert normalize_int("صفحات") == 0

    def test_string_empty_returns_default(self):
        assert normalize_int("") == 0

    def test_string_whitespace_only_returns_default(self):
        assert normalize_int("   ") == 0

    def test_large_string_number(self):
        assert normalize_int("1000000") == 1_000_000

    def test_string_with_number_at_start(self):
        assert normalize_int("42abc") == 42

    def test_arabic_digits_not_matched(self):
        # الأرقام العربية ٣١٢ لا تُطابق \d
        assert normalize_int("٣١٢") == 0


# ============================================================
# normalize_bool
# ============================================================

class TestNormalizeBool:
    def test_true_bool(self):
        assert normalize_bool(True) is True

    def test_false_bool(self):
        assert normalize_bool(False) is False

    def test_one_int(self):
        assert normalize_bool(1) is True

    def test_zero_int(self):
        assert normalize_bool(0) is False

    def test_negative_int(self):
        assert normalize_bool(-1) is True

    def test_string_true(self):
        assert normalize_bool("true") is True

    def test_string_TRUE_uppercase(self):
        assert normalize_bool("TRUE") is True

    def test_string_one(self):
        assert normalize_bool("1") is True

    def test_string_yes(self):
        assert normalize_bool("yes") is True

    def test_string_y(self):
        assert normalize_bool("y") is True

    def test_string_on(self):
        assert normalize_bool("on") is True

    def test_string_arabic_naam(self):
        assert normalize_bool("نعم") is True

    def test_string_arabic_sahih(self):
        assert normalize_bool("صحيح") is True

    def test_string_with_whitespace(self):
        assert normalize_bool("  true  ") is True

    def test_string_false(self):
        assert normalize_bool("false") is False

    def test_string_zero(self):
        assert normalize_bool("0") is False

    def test_string_arabic_laa(self):
        assert normalize_bool("لا") is False

    def test_empty_string(self):
        assert normalize_bool("") is False

    def test_none(self):
        assert normalize_bool(None) is False

    def test_random_string(self):
        assert normalize_bool("maybe") is False


# ============================================================
# normalize_list
# ============================================================

class TestNormalizeList:
    def test_none_returns_empty(self):
        assert normalize_list(None) == []

    def test_empty_list(self):
        assert normalize_list([]) == []

    def test_list_of_strings(self):
        assert normalize_list(["a", "b"]) == ["a", "b"]

    def test_strips_whitespace(self):
        assert normalize_list(["  a  ", "  b  "]) == ["a", "b"]

    def test_filters_empty_strings(self):
        assert normalize_list(["a", "", "b"]) == ["a", "b"]

    def test_filters_whitespace_only(self):
        assert normalize_list(["a", "   ", "b"]) == ["a", "b"]

    def test_converts_numbers_to_strings(self):
        assert normalize_list([1, 2, 3]) == ["1", "2", "3"]

    def test_single_string_returns_list(self):
        # legacy: كلمة مفتاحية واحدة كـ string
        assert normalize_list("keyword") == ["keyword"]

    def test_string_strips_whitespace(self):
        assert normalize_list("  keyword  ") == ["keyword"]

    def test_empty_string_returns_empty(self):
        assert normalize_list("") == []

    def test_whitespace_string_returns_empty(self):
        assert normalize_list("   ") == []

    def test_non_list_non_string_returns_empty(self):
        assert normalize_list(42) == []

    def test_preserves_arabic(self):
        assert normalize_list(["إدارة", "تنظيم"]) == ["إدارة", "تنظيم"]


# ============================================================
# sha256_file
# ============================================================

class TestSha256File:
    def test_known_hash_for_hello(self, tmp_path):
        f = tmp_path / "hello.bin"
        f.write_bytes(b"hello")
        expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        assert sha256_file(f) == expected

    def test_known_hash_for_empty(self, tmp_path):
        f = tmp_path / "empty.bin"
        f.write_bytes(b"")
        expected = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        assert sha256_file(f) == expected

    def test_large_file_multiple_chunks(self, tmp_path):
        f = tmp_path / "large.bin"
        f.write_bytes(b"x" * (2 * 1024 * 1024))  # 2 MB
        # نتحقق من أن النتيجة string بطول 64
        result = sha256_file(f)
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)


# ============================================================
# source_path_from_record — أمنيًا حرج
# ============================================================

class TestSourcePathFromRecord:
    def test_missing_file_path_returns_none(self):
        assert source_path_from_record({}) is None

    def test_empty_file_path_returns_none(self):
        assert source_path_from_record({"file_path": ""}) is None

    def test_none_file_path_returns_none(self):
        assert source_path_from_record({"file_path": None}) is None

    def test_outside_pdf_returns_none(self):
        assert source_path_from_record({"file_path": "files/book.pdf"}) is None

    def test_absolute_path_returns_none(self):
        assert source_path_from_record({"file_path": "/etc/passwd"}) is None

    def test_traversal_double_dot_returns_none(self):
        assert source_path_from_record({"file_path": "pdf/../etc/passwd"}) is None

    def test_traversal_single_dot_returns_none(self):
        assert source_path_from_record({"file_path": "pdf/./book.pdf"}) is None

    def test_deep_traversal_returns_none(self):
        assert source_path_from_record({"file_path": "pdf/a/b/../../x.pdf"}) is None

    def test_valid_simple_path(self):
        result = source_path_from_record({"file_path": "pdf/book.pdf"})
        assert result == Path("pdf/book.pdf")

    def test_valid_nested_path(self):
        result = source_path_from_record({"file_path": "pdf/sub/book.pdf"})
        assert result == Path("pdf/sub/book.pdf")

    def test_backslash_converted(self):
        result = source_path_from_record({"file_path": "pdf\\book.pdf"})
        assert result == Path("pdf/book.pdf")

    def test_arabic_filename(self):
        result = source_path_from_record({"file_path": "pdf/مرجع.pdf"})
        assert result == Path("pdf/مرجع.pdf")


# ============================================================
# migrate_book
# ============================================================

class TestMigrateBook:
    def test_returns_tuple(self, minimal_book):
        result = migrate_book(minimal_book)
        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], dict)
        assert isinstance(result[1], bool)

    def test_no_changes_returns_false(self, minimal_book):
        _, changed = migrate_book(minimal_book)
        assert changed is False

    def test_id_normalization(self):
        book = {"id": "5", "title": "t"}
        result, changed = migrate_book(book)
        assert result["id"] == 5
        assert changed is True

    def test_year_normalization(self):
        book = {"id": 1, "title": "t", "year": "2020"}
        result, changed = migrate_book(book)
        assert result["year"] == 2020
        assert changed is True

    def test_pages_arabic_suffix(self):
        book = {"id": 1, "title": "t", "pages": "312 صفحة"}
        result, changed = migrate_book(book)
        assert result["pages"] == 312
        assert changed is True

    def test_featured_normalization(self):
        book = {"id": 1, "title": "t", "featured": 1}
        result, changed = migrate_book(book)
        assert result["featured"] is True
        assert changed is True

    def test_featured_arabic_yes(self):
        book = {"id": 1, "title": "t", "featured": "نعم"}
        result, changed = migrate_book(book)
        assert result["featured"] is True
        assert changed is True

    def test_title_stripping(self):
        book = {"id": 1, "title": "  hello  "}
        result, changed = migrate_book(book)
        assert result["title"] == "hello"
        assert changed is True

    def test_keywords_normalization(self):
        book = {"id": 1, "title": "t", "keywords": ["  a  ", "", "b"]}
        result, changed = migrate_book(book)
        assert result["keywords"] == ["a", "b"]
        assert changed is True

    def test_original_book_not_mutated(self):
        book = {"id": "5", "title": "t"}
        original_id = book["id"]
        migrate_book(book)
        assert book["id"] == original_id  # لم يتغير

    def test_no_featured_key_stays_absent(self):
        book = {"id": 1, "title": "t"}
        result, _ = migrate_book(book)
        assert "featured" not in result

    def test_no_year_key_stays_absent(self):
        book = {"id": 1, "title": "t"}
        result, _ = migrate_book(book)
        assert "year" not in result

    def test_complex_normalization(self):
        book = {
            "id": "7",
            "title": "  كتاب  ",
            "year": "2020",
            "pages": "312 صفحة",
            "featured": "نعم",
            "keywords": ["  إدارة  ", "", "تنظيم"],
        }
        result, changed = migrate_book(book)
        assert result["id"] == 7
        assert result["title"] == "كتاب"
        assert result["year"] == 2020
        assert result["pages"] == 312
        assert result["featured"] is True
        assert result["keywords"] == ["إدارة", "تنظيم"]
        assert changed is True

    def test_sha256_backfill_with_existing_file(self, isolated, minimal_book):
        """يجب أن يملأ source_sha256 إذا الملف موجود"""
        pdf_file = isolated["pdf"] / "book.pdf"
        pdf_file.write_bytes(b"content")
        expected_hash = hashlib.sha256(b"content").hexdigest()

        result, changed = migrate_book(minimal_book)
        assert result["source_sha256"] == expected_hash
        assert changed is True

    def test_sha256_not_overwritten_if_exists(self, isolated, minimal_book):
        """لا يجب أن يستبدل hash موجود"""
        minimal_book["source_sha256"] = "a" * 64
        pdf_file = isolated["pdf"] / "book.pdf"
        pdf_file.write_bytes(b"content")

        result, changed = migrate_book(minimal_book)
        assert result["source_sha256"] == "a" * 64
        # قد يكون changed False إذا لا شيء آخر تغير
        assert "source_sha256" in result

    def test_sha256_skipped_if_file_missing(self, isolated, minimal_book):
        """لا يجب أن يفشل إذا الملف غير موجود"""
        # book.pdf غير موجود على القرص
        result, changed = migrate_book(minimal_book)
        assert "source_sha256" not in result or result["source_sha256"] == ""

    def test_sha256_skipped_if_no_file_path(self):
        book = {"id": 1, "title": "t"}
        result, _ = migrate_book(book)
        assert "source_sha256" not in result or result.get("source_sha256") == ""


# ============================================================
# load_books
# ============================================================

class TestLoadBooks:
    def test_missing_file_raises(self, isolated):
        with pytest.raises(RuntimeError, match="does not exist"):
            load_books()

    def test_invalid_json_raises(self, write_books):
        write_books("{invalid json")
        with pytest.raises(RuntimeError, match="invalid JSON"):
            load_books()

    def test_non_array_raises(self, write_books):
        write_books({"not": "array"})
        with pytest.raises(RuntimeError, match="top-level array"):
            load_books()

    def test_valid_array_loads(self, write_books):
        write_books([{"id": 1}])
        assert load_books() == [{"id": 1}]

    def test_empty_array_loads(self, write_books):
        write_books([])
        assert load_books() == []

    def test_arabic_content_loads(self, write_books):
        write_books([{"id": 1, "title": "مرجع"}])
        assert load_books()[0]["title"] == "مرجع"


# ============================================================
# atomic_write
# ============================================================

class TestAtomicWrite:
    def test_writes_content(self, tmp_path):
        target = tmp_path / "out.json"
        atomic_write(target, "hello")
        assert target.read_text(encoding="utf-8") == "hello"

    def test_creates_parent_directory(self, tmp_path):
        target = tmp_path / "nested" / "deep" / "out.json"
        atomic_write(target, "content")
        assert target.exists()

    def test_overwrites_existing(self, tmp_path):
        target = tmp_path / "out.json"
        target.write_text("old")
        atomic_write(target, "new")
        assert target.read_text(encoding="utf-8") == "new"

    def test_no_temp_file_left(self, tmp_path):
        target = tmp_path / "out.json"
        atomic_write(target, "data")
        # لا يجب أن يبقى ملف .tmp
        temp_files = list(tmp_path.glob("*.tmp"))
        assert temp_files == []

    def test_arabic_content(self, tmp_path):
        target = tmp_path / "out.json"
        atomic_write(target, "مرجع")
        assert target.read_text(encoding="utf-8") == "مرجع"


# ============================================================
# main() — تكامل
# ============================================================

class TestMain:
    def test_missing_books_raises(self, isolated):
        with pytest.raises(RuntimeError):
            main()

    def test_creates_backup(self, write_books, isolated, minimal_book):
        write_books([minimal_book])
        main()
        assert isolated["backup"].exists()

    def test_backup_preserves_original(self, write_books, isolated, minimal_book):
        # كتاب بحالة "غير مُطَبَّعة" (id كنص)
        book = {"id": "5", "title": "  test  "}
        write_books([book])
        main()
        # الـ backup يجب أن يحتوي البيانات الأصلية
        backup_data = json.loads(isolated["backup"].read_text(encoding="utf-8"))
        assert backup_data[0]["id"] == "5"

    def test_migration_applied_to_books(self, write_books, isolated):
        book = {"id": "5", "title": "  test  "}
        write_books([book])
        main()
        # books.json يجب أن يكون مُطبَّعًا
        result = json.loads(isolated["books"].read_text(encoding="utf-8"))
        assert result[0]["id"] == 5
        assert result[0]["title"] == "test"

    def test_no_change_still_writes(self, write_books, isolated, minimal_book):
        write_books([minimal_book])
        main()
        # الملف يجب أن يُكتب حتى بدون تغيير
        assert isolated["books"].exists()

    def test_non_dict_record_raises(self, write_books, isolated):
        write_books(["not a dict"])
        with pytest.raises(RuntimeError, match="not a JSON object"):
            main()

    def test_multiple_books(self, write_books, isolated, minimal_book):
        books = [dict(minimal_book, id=i) for i in range(1, 5)]
        write_books(books)
        main()
        result = json.loads(isolated["books"].read_text(encoding="utf-8"))
        assert len(result) == 4

    def test_output_is_valid_json(self, write_books, isolated, minimal_book):
        write_books([minimal_book])
        main()
        # لا يجب أن يرفع
        json.loads(isolated["books"].read_text(encoding="utf-8"))

    def test_output_has_trailing_newline(self, write_books, isolated, minimal_book):
        write_books([minimal_book])
        main()
        content = isolated["books"].read_text(encoding="utf-8")
        assert content.endswith("\n")

    def test_preserves_arabic(self, write_books, isolated):
        book = {
            "id": 1,
            "title": "مقدمة",
            "category": "إدارة",
            "description": "وصف",
            "type": "كتاب",
            "file_path": "pdf/x.pdf",
        }
        write_books([book])
        main()
        result = json.loads(isolated["books"].read_text(encoding="utf-8"))
        assert result[0]["title"] == "مقدمة"

    def test_sha_backfill_during_migration(self, write_books, isolated, minimal_book):
        # أنشئ ملف PDF فعلي
        pdf_file = isolated["pdf"] / "book.pdf"
        pdf_file.write_bytes(b"content")

        write_books([minimal_book])
        main()

        result = json.loads(isolated["books"].read_text(encoding="utf-8"))
        expected = hashlib.sha256(b"content").hexdigest()
        assert result[0].get("source_sha256") == expected

    def test_backup_and_output_differ_when_changes_made(self, write_books, isolated):
        book = {"id": "1", "title": "  test  "}
        write_books([book])
        main()

        backup = json.loads(isolated["backup"].read_text(encoding="utf-8"))
        output = json.loads(isolated["books"].read_text(encoding="utf-8"))

        assert backup[0]["id"] == "1"          # لم يتغير
        assert output[0]["id"] == 1            # تغير
