"""
اختبارات validate_books.py

هذا الملف يُشغَّل من auto_process.yml.
أي خطأ في السلوك يُعطّل معالجة الكتب الجديدة.

الاستثناءات المستخدمة:
- SystemExit(1) عند الفشل (وليس ValueError).
- الرسائل تُطبع بصيغة GitHub Actions ::error:: و ::warning::.
"""
import json
import pytest
from pathlib import Path

import validate_books
from validate_books import (
    fail,
    warning,
    require_string,
    validate_integer,
    validate_year,
    validate_pages,
    validate_id,
    validate_list,
    validate_boolean,
    validate_file_path,
    validate_cover_path,
    validate_sha256,
    validate_book,
    main,
    REQUIRED_FIELDS,
    MAX_BOOKS,
    SUPPORTED_EXTENSIONS,
    MAX_LENGTHS,
)


# ============================================================
# Fixtures
# ============================================================

@pytest.fixture
def valid_book():
    """كتاب صالح بالحد الأدنى — كل الاختبارات تبدأ منه"""
    return {
        "id": 1,
        "title": "مقدمة في الإدارة",
        "category": "إدارة",
        "description": "وصف تجريبي للمرجع",
        "type": "كتاب",
        "file_path": "pdf/book.pdf",
    }


@pytest.fixture
def books_file(monkeypatch, tmp_path):
    """ينشئ books.json مؤقتًا ويوجه validator إليه"""
    target = tmp_path / "books.json"

    def _write(data):
        if isinstance(data, (list, dict)):
            target.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        else:
            target.write_text(data, encoding="utf-8")
        return target

    monkeypatch.setattr(validate_books, "BOOKS_PATH", target)
    return _write


# ============================================================
# fail() و warning() — صيغة GitHub Actions
# ============================================================

class TestFailOutput:
    """حرج: صيغة ::error:: يجب أن تكون دقيقة"""

    def test_fail_raises_system_exit(self):
        with pytest.raises(SystemExit) as exc_info:
            fail("something broke")
        assert exc_info.value.code == 1

    def test_fail_prints_github_error_format(self, capsys):
        with pytest.raises(SystemExit):
            fail("test message")
        captured = capsys.readouterr()
        assert "::error title=Catalog Validation::test message" in captured.out

    def test_fail_with_arabic_message(self, capsys):
        with pytest.raises(SystemExit):
            fail("خطأ في الكتاب رقم 5")
        captured = capsys.readouterr()
        assert "::error title=Catalog Validation::خطأ في الكتاب رقم 5" in captured.out

    def test_fail_with_special_chars(self, capsys):
        with pytest.raises(SystemExit):
            fail("field 'title' contains <script>")
        captured = capsys.readouterr()
        assert "::error title=Catalog Validation::field 'title' contains <script>" in captured.out


class TestWarningOutput:
    """تحذيرات لا تُوقف التنفيذ"""

    def test_warning_does_not_raise(self):
        warning("just a warning")  # لا يرفع

    def test_warning_prints_github_warning_format(self, capsys):
        warning("empty author")
        captured = capsys.readouterr()
        assert "::warning title=Catalog Validation::empty author" in captured.out

    def test_warning_arabic(self, capsys):
        warning("المؤلف فارغ")
        captured = capsys.readouterr()
        assert "::warning title=Catalog Validation::المؤلف فارغ" in captured.out


# ============================================================
# require_string
# ============================================================

class TestRequireString:
    def test_returns_valid_string(self):
        book = {"title": "hello"}
        assert require_string(book, "title", 1) == "hello"

    def test_strips_whitespace(self):
        book = {"title": "  hello  "}
        assert require_string(book, "title", 1) == "hello"

    def test_missing_field_raises(self):
        with pytest.raises(SystemExit):
            require_string({}, "title", 5)

    def test_none_value_raises_when_not_allowed(self):
        with pytest.raises(SystemExit):
            require_string({"title": None}, "title", 1)

    def test_none_returns_empty_when_allowed(self):
        assert require_string({"title": None}, "title", 1, allow_empty=True) == ""

    def test_empty_string_raises_when_not_allowed(self):
        with pytest.raises(SystemExit):
            require_string({"title": ""}, "title", 1)

    def test_whitespace_only_raises_when_not_allowed(self):
        with pytest.raises(SystemExit):
            require_string({"title": "   "}, "title", 1)

    def test_empty_string_allowed(self):
        assert require_string({"title": ""}, "title", 1, allow_empty=True) == ""

    def test_non_string_raises(self):
        with pytest.raises(SystemExit):
            require_string({"title": 123}, "title", 1)

    def test_list_value_raises(self):
        with pytest.raises(SystemExit):
            require_string({"title": ["a"]}, "title", 1)

    def test_max_length_exceeded_raises(self):
        long_title = "a" * (MAX_LENGTHS["title"] + 1)
        with pytest.raises(SystemExit):
            require_string({"title": long_title}, "title", 1)

    def test_max_length_at_limit_passes(self):
        title = "a" * MAX_LENGTHS["title"]
        result = require_string({"title": title}, "title", 1)
        assert len(result) == MAX_LENGTHS["title"]

    def test_field_without_max_length_is_unlimited(self):
        # field not in MAX_LENGTHS
        book = {"custom_field": "a" * 10_000}
        result = require_string(book, "custom_field", 1)
        assert len(result) == 10_000


# ============================================================
# validate_integer
# ============================================================

class TestValidateInteger:
    def test_valid_integer_passes(self):
        validate_integer({"pages": 100}, "pages", 1)

    def test_missing_field_passes(self):
        validate_integer({}, "pages", 1)  # missing → skip

    def test_none_value_passes(self):
        validate_integer({"pages": None}, "pages", 1)

    def test_bool_raises(self):
        # حرج: True == 1 في Python، لكن bool ليس int
        with pytest.raises(SystemExit):
            validate_integer({"pages": True}, "pages", 1)

    def test_false_bool_raises(self):
        with pytest.raises(SystemExit):
            validate_integer({"pages": False}, "pages", 1)

    def test_string_raises(self):
        with pytest.raises(SystemExit):
            validate_integer({"pages": "100"}, "pages", 1)

    def test_float_raises(self):
        with pytest.raises(SystemExit):
            validate_integer({"pages": 100.5}, "pages", 1)

    def test_below_minimum_raises(self):
        with pytest.raises(SystemExit):
            validate_integer({"pages": -1}, "pages", 1, minimum=0)

    def test_at_minimum_passes(self):
        validate_integer({"pages": 0}, "pages", 1, minimum=0)

    def test_exceeds_maximum_raises(self):
        with pytest.raises(SystemExit):
            validate_integer({"pages": 101}, "pages", 1, maximum=100)

    def test_at_maximum_passes(self):
        validate_integer({"pages": 100}, "pages", 1, maximum=100)

    def test_no_maximum_accepts_large_value(self):
        validate_integer({"pages": 10**9}, "pages", 1)


# ============================================================
# validate_year
# ============================================================

class TestValidateYear:
    def test_valid_year_passes(self):
        validate_year({"year": 2024}, 1)

    def test_zero_is_unknown_passes(self):
        validate_year({"year": 0}, 1)

    def test_missing_year_passes(self):
        validate_year({}, 1)

    def test_none_passes(self):
        validate_year({"year": None}, 1)

    def test_bool_raises(self):
        with pytest.raises(SystemExit):
            validate_year({"year": True}, 1)

    def test_string_raises(self):
        with pytest.raises(SystemExit):
            validate_year({"year": "2024"}, 1)

    def test_negative_raises(self):
        with pytest.raises(SystemExit):
            validate_year({"year": -1}, 1)

    def test_too_small_raises(self):
        with pytest.raises(SystemExit):
            validate_year({"year": 500}, 1)

    def test_too_large_raises(self):
        with pytest.raises(SystemExit):
            validate_year({"year": 2500}, 1)

    def test_lower_boundary_passes(self):
        validate_year({"year": 1000}, 1)

    def test_upper_boundary_passes(self):
        validate_year({"year": 2100}, 1)


# ============================================================
# validate_pages
# ============================================================

class TestValidatePages:
    def test_valid_pages_passes(self):
        validate_pages({"pages": 300}, 1)

    def test_zero_pages_passes(self):
        validate_pages({"pages": 0}, 1)

    def test_negative_pages_raises(self):
        with pytest.raises(SystemExit):
            validate_pages({"pages": -5}, 1)

    def test_above_maximum_raises(self):
        with pytest.raises(SystemExit):
            validate_pages({"pages": 100_001}, 1)

    def test_at_maximum_passes(self):
        validate_pages({"pages": 100_000}, 1)


# ============================================================
# validate_id
# ============================================================

class TestValidateId:
    def test_valid_id_passes(self):
        seen = set()
        validate_id({"id": 1}, 1, seen)
        assert 1 in seen

    def test_zero_id_passes(self):
        seen = set()
        validate_id({"id": 0}, 1, seen)

    def test_bool_id_raises(self):
        with pytest.raises(SystemExit):
            validate_id({"id": True}, 1, set())

    def test_string_id_raises(self):
        with pytest.raises(SystemExit):
            validate_id({"id": "1"}, 1, set())

    def test_negative_id_raises(self):
        with pytest.raises(SystemExit):
            validate_id({"id": -1}, 1, set())

    def test_duplicate_id_raises(self):
        seen = {1}
        with pytest.raises(SystemExit):
            validate_id({"id": 1}, 2, seen)

    def test_two_unique_ids_pass(self):
        seen = set()
        validate_id({"id": 1}, 1, seen)
        validate_id({"id": 2}, 2, seen)
        assert seen == {1, 2}


# ============================================================
# validate_list
# ============================================================

class TestValidateList:
    def test_valid_list_passes(self):
        validate_list({"keywords": ["a", "b"]}, "keywords", 1,
                      max_items=10, max_item_length=50)

    def test_empty_list_passes(self):
        validate_list({"keywords": []}, "keywords", 1,
                      max_items=10, max_item_length=50)

    def test_missing_field_passes(self):
        validate_list({}, "keywords", 1, max_items=10, max_item_length=50)

    def test_none_passes(self):
        validate_list({"keywords": None}, "keywords", 1,
                      max_items=10, max_item_length=50)

    def test_non_list_raises(self):
        with pytest.raises(SystemExit):
            validate_list({"keywords": "hello"}, "keywords", 1,
                          max_items=10, max_item_length=50)

    def test_too_many_items_raises(self):
        with pytest.raises(SystemExit):
            validate_list({"keywords": ["a"] * 11}, "keywords", 1,
                          max_items=10, max_item_length=50)

    def test_at_max_items_passes(self):
        validate_list({"keywords": ["a"] * 10}, "keywords", 1,
                      max_items=10, max_item_length=50)

    def test_non_string_item_raises(self):
        with pytest.raises(SystemExit):
            validate_list({"keywords": ["a", 123]}, "keywords", 1,
                          max_items=10, max_item_length=50)

    def test_empty_string_item_raises(self):
        with pytest.raises(SystemExit):
            validate_list({"keywords": ["a", ""]}, "keywords", 1,
                          max_items=10, max_item_length=50)

    def test_whitespace_only_item_raises(self):
        with pytest.raises(SystemExit):
            validate_list({"keywords": ["a", "   "]}, "keywords", 1,
                          max_items=10, max_item_length=50)

    def test_item_exceeds_max_length_raises(self):
        with pytest.raises(SystemExit):
            validate_list({"keywords": ["a" * 51]}, "keywords", 1,
                          max_items=10, max_item_length=50)

    def test_arabic_items_pass(self):
        validate_list({"keywords": ["إدارة", "تنظيم"]}, "keywords", 1,
                      max_items=10, max_item_length=50)


# ============================================================
# validate_boolean
# ============================================================

class TestValidateBoolean:
    def test_true_passes(self):
        validate_boolean({"featured": True}, "featured", 1)

    def test_false_passes(self):
        validate_boolean({"featured": False}, "featured", 1)

    def test_missing_passes(self):
        validate_boolean({}, "featured", 1)

    def test_none_passes(self):
        validate_boolean({"featured": None}, "featured", 1)

    def test_integer_raises(self):
        # حرج: 1 يُشبه True لكنه ليس bool
        with pytest.raises(SystemExit):
            validate_boolean({"featured": 1}, "featured", 1)

    def test_string_raises(self):
        with pytest.raises(SystemExit):
            validate_boolean({"featured": "true"}, "featured", 1)


# ============================================================
# validate_file_path
# ============================================================

class TestValidateFilePath:
    def test_valid_pdf_path_passes(self):
        validate_file_path({"file_path": "pdf/book.pdf"}, 1)

    def test_valid_docx_path_passes(self):
        validate_file_path({"file_path": "pdf/doc.docx"}, 1)

    def test_nested_path_passes(self):
        validate_file_path({"file_path": "pdf/subfolder/book.pdf"}, 1)

    def test_arabic_filename_passes(self):
        validate_file_path({"file_path": "pdf/مرجع.pdf"}, 1)

    def test_windows_backslash_converted(self):
        # يُقبل لأن الكود يحوّل \ إلى /
        validate_file_path({"file_path": "pdf\\book.pdf"}, 1)

    def test_missing_path_raises(self):
        with pytest.raises(SystemExit):
            validate_file_path({}, 1)

    def test_outside_pdf_raises(self):
        with pytest.raises(SystemExit):
            validate_file_path({"file_path": "files/book.pdf"}, 1)

    def test_absolute_path_raises(self):
        with pytest.raises(SystemExit):
            validate_file_path({"file_path": "/etc/passwd"}, 1)

    def test_path_traversal_raises(self):
        with pytest.raises(SystemExit):
            validate_file_path({"file_path": "pdf/../etc/passwd"}, 1)

    def test_deep_traversal_raises(self):
        with pytest.raises(SystemExit):
            validate_file_path({"file_path": "pdf/a/b/../../../etc/x.pdf"}, 1)

    def test_unsupported_extension_raises(self):
        with pytest.raises(SystemExit):
            validate_file_path({"file_path": "pdf/book.txt"}, 1)

    def test_zip_not_in_supported_list_raises(self):
        # .zip غير مدعوم كملف نهائي
        with pytest.raises(SystemExit):
            validate_file_path({"file_path": "pdf/archive.zip"}, 1)

    def test_all_supported_extensions_pass(self):
        for ext in SUPPORTED_EXTENSIONS:
            validate_file_path({"file_path": f"pdf/book{ext}"}, 1)

    def test_uppercase_extension_normalized(self):
        # الكود يحول إلى lowercase
        validate_file_path({"file_path": "pdf/BOOK.PDF"}, 1)


# ============================================================
# validate_cover_path
# ============================================================

class TestValidateCoverPath:
    def test_valid_cover_path_passes(self):
        validate_cover_path({"cover_image": "covers/1.png"}, 1)

    def test_missing_cover_passes(self):
        validate_cover_path({}, 1)

    def test_empty_cover_passes(self):
        validate_cover_path({"cover_image": ""}, 1)

    def test_none_cover_passes(self):
        validate_cover_path({"cover_image": None}, 1)

    def test_outside_covers_raises(self):
        with pytest.raises(SystemExit):
            validate_cover_path({"cover_image": "images/1.png"}, 1)

    def test_traversal_raises(self):
        with pytest.raises(SystemExit):
            validate_cover_path({"cover_image": "covers/../secret.png"}, 1)


# ============================================================
# validate_sha256
# ============================================================

class TestValidateSha256:
    def test_valid_hash_passes(self):
        validate_sha256({"source_sha256": "a" * 64}, 1)

    def test_valid_uppercase_hash_passes(self):
        validate_sha256({"source_sha256": "A" * 64}, 1)

    def test_valid_mixed_case_passes(self):
        validate_sha256({"source_sha256": "aBcDeF" + "0" * 58}, 1)

    def test_missing_hash_passes(self):
        validate_sha256({}, 1)

    def test_empty_hash_passes(self):
        validate_sha256({"source_sha256": ""}, 1)

    def test_none_hash_passes(self):
        validate_sha256({"source_sha256": None}, 1)

    def test_short_hash_raises(self):
        with pytest.raises(SystemExit):
            validate_sha256({"source_sha256": "a" * 63}, 1)

    def test_long_hash_raises(self):
        with pytest.raises(SystemExit):
            validate_sha256({"source_sha256": "a" * 65}, 1)

    def test_non_hex_raises(self):
        with pytest.raises(SystemExit):
            validate_sha256({"source_sha256": "g" * 64}, 1)

    def test_mixed_non_hex_raises(self):
        with pytest.raises(SystemExit):
            validate_sha256({"source_sha256": "abc" + "z" + "a" * 60}, 1)


# ============================================================
# validate_book
# ============================================================

class TestValidateBook:
    def test_valid_book_passes(self, valid_book):
        validate_book(valid_book, 1, set())

    def test_non_dict_raises(self):
        with pytest.raises(SystemExit):
            validate_book("not a dict", 1, set())

    def test_list_raises(self):
        with pytest.raises(SystemExit):
            validate_book([], 1, set())

    def test_missing_required_field_raises(self, valid_book):
        del valid_book["title"]
        with pytest.raises(SystemExit):
            validate_book(valid_book, 1, set())

    def test_missing_multiple_required_raises(self, valid_book):
        del valid_book["title"]
        del valid_book["category"]
        with pytest.raises(SystemExit):
            validate_book(valid_book, 1, set())

    def test_empty_author_allowed_with_warning(self, valid_book, capsys):
        valid_book["author"] = ""
        validate_book(valid_book, 1, set())
        captured = capsys.readouterr()
        assert "::warning" in captured.out
        assert "author is empty" in captured.out

    def test_missing_author_is_allowed(self, valid_book, capsys):
        # author ليس في REQUIRED_FIELDS
        assert "author" not in REQUIRED_FIELDS
        validate_book(valid_book, 1, set())

    def test_duplicate_id_raises(self, valid_book):
        seen = {1}
        with pytest.raises(SystemExit):
            validate_book(valid_book, 2, seen)

    def test_all_required_fields_present(self, valid_book):
        for field in REQUIRED_FIELDS:
            assert field in valid_book

    def test_book_with_optional_fields(self, valid_book):
        valid_book.update({
            "author": "أحمد",
            "publisher": "دار النشر",
            "year": 2020,
            "pages": 300,
            "keywords": ["إدارة"],
            "key_points": ["نقطة 1"],
            "featured": True,
            "source_sha256": "a" * 64,
            "cover_image": "covers/1.png",
        })
        validate_book(valid_book, 1, set())


# ============================================================
# main() — تكامل
# ============================================================

class TestMain:
    def test_missing_file_raises(self, monkeypatch, tmp_path):
        monkeypatch.setattr(validate_books, "BOOKS_PATH", tmp_path / "missing.json")
        with pytest.raises(SystemExit):
            main()

    def test_empty_file_raises(self, books_file):
        books_file("")
        with pytest.raises(SystemExit):
            main()

    def test_invalid_json_raises(self, books_file):
        books_file("{not valid json")
        with pytest.raises(SystemExit):
            main()

    def test_non_array_raises(self, books_file):
        books_file({"not": "an array"})
        with pytest.raises(SystemExit):
            main()

    def test_exceeds_max_books_raises(self, books_file):
        huge = [{"id": i} for i in range(MAX_BOOKS + 1)]
        books_file(huge)
        with pytest.raises(SystemExit):
            main()

    def test_empty_array_passes(self, books_file, capsys):
        books_file([])
        main()
        captured = capsys.readouterr()
        assert "Catalog validation passed" in captured.out
        assert "0 records" in captured.out

    def test_single_valid_book_passes(self, books_file, valid_book, capsys):
        books_file([valid_book])
        main()
        captured = capsys.readouterr()
        assert "Catalog validation passed" in captured.out
        assert "1 records" in captured.out

    def test_multiple_books_pass(self, books_file, valid_book, capsys):
        books = [dict(valid_book, id=i) for i in range(1, 5)]
        books_file(books)
        main()
        captured = capsys.readouterr()
        assert "4 records" in captured.out

    def test_one_invalid_among_valid_fails(self, books_file, valid_book):
        books = [
            dict(valid_book, id=1),
            dict(valid_book, id=2, title=""),  # invalid
            dict(valid_book, id=3),
        ]
        books_file(books)
        with pytest.raises(SystemExit):
            main()

    def test_duplicate_ids_in_file_fail(self, books_file, valid_book):
        books = [
            dict(valid_book, id=1),
            dict(valid_book, id=1),
        ]
        books_file(books)
        with pytest.raises(SystemExit):
            main()

    def test_arabic_book_passes(self, books_file, capsys):
        book = {
            "id": 1,
            "title": "مقدمة في الإدارة العامة",
            "category": "إدارة عامة",
            "description": "كتاب يشرح أساسيات الإدارة العامة",
            "type": "كتاب",
            "file_path": "pdf/مقدمة.pdf",
            "keywords": ["إدارة", "تنظيم"],
            "author": "د. محمد",
        }
        books_file([book])
        main()
        captured = capsys.readouterr()
        assert "Catalog validation passed" in captured.out
