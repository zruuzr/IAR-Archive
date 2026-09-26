"""اختبارات الدوال المساعدة العامة"""
import pytest
from process_books import (
    normalize_string,
    normalize_list,
    safe_int,
    format_file_size,
    sha256_file,
)


class TestNormalizeString:
    def test_none_returns_empty(self):
        assert normalize_string(None) == ""

    def test_strips_whitespace(self):
        assert normalize_string("  hi  ") == "hi"

    def test_number_to_string(self):
        assert normalize_string(42) == "42"

    def test_preserves_arabic(self):
        assert normalize_string("مرحبا") == "مرحبا"

    def test_empty_stays_empty(self):
        assert normalize_string("") == ""


class TestNormalizeList:
    def test_non_list_returns_empty(self):
        assert normalize_list(None) == []
        assert normalize_list("string") == []
        assert normalize_list(123) == []

    def test_filters_empty_strings(self):
        assert normalize_list(["a", "", "  ", "b"]) == ["a", "b"]

    def test_strips_items(self):
        assert normalize_list(["  a  ", "b"]) == ["a", "b"]

    def test_respects_limit(self):
        items = [f"item{i}" for i in range(100)]
        result = normalize_list(items, limit=3)
        assert result == ["item0", "item1", "item2"]

    def test_default_limit_is_50(self):
        items = [f"i{i}" for i in range(100)]
        assert len(normalize_list(items)) == 50


class TestSafeInt:
    @pytest.mark.parametrize("value,expected", [
        (None, 0),
        ("", 0),
        (False, 0),
        ("42", 42),
        (42, 42),
        (-5, 0),
        ("abc", 0),
        (3.9, 3),
        (0, 0),
    ])
    def test_various_inputs(self, value, expected):
        assert safe_int(value) == expected


class TestFormatFileSize:
    @pytest.mark.parametrize("size,expected", [
        (-1, "0 B"),
        (0, "0 B"),
        (500, "500 B"),
        (1024, "1.0 KB"),
        (1536, "1.5 KB"),
        (1024 * 1024, "1.0 MB"),
        (1024 * 1024 * 1024, "1.0 GB"),
    ])
    def test_various_sizes(self, size, expected):
        assert format_file_size(size) == expected


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

    def test_chunk_size_does_not_affect_result(self, tmp_path):
        f = tmp_path / "data.bin"
        f.write_bytes(b"x" * 5000)
        assert sha256_file(f, chunk_size=1024) == sha256_file(f, chunk_size=64)
