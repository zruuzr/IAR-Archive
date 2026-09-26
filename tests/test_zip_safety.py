"""اختبارات أمان ZIP والأسماء"""
import pytest
from pathlib import Path
from process_books import (
    decode_zip_name,
    is_safe_archive_member,
    safe_filename,
)


class TestIsSafeArchiveMember:
    def test_rejects_absolute_unix(self):
        assert is_safe_archive_member("/etc/passwd") is False

    def test_rejects_absolute_windows(self):
        assert is_safe_archive_member("C:\\Windows\\system32") is False

    def test_rejects_unc_path(self):
        assert is_safe_archive_member("\\\\server\\share") is False

    def test_rejects_simple_traversal(self):
        assert is_safe_archive_member("../secret.txt") is False

    def test_rejects_deep_traversal(self):
        assert is_safe_archive_member("a/b/../../../etc/passwd") is False

    def test_rejects_backslash_traversal(self):
        assert is_safe_archive_member("..\\..\\etc\\passwd") is False

    def test_accepts_clean_filename(self):
        assert is_safe_archive_member("book.pdf") is True

    def test_accepts_nested_relative(self):
        assert is_safe_archive_member("folder/sub/book.pdf") is True

    def test_accepts_arabic_filename(self):
        assert is_safe_archive_member("مرجع.pdf") is True


class TestDecodeZipName:
    def test_ascii_passthrough(self):
        assert decode_zip_name("test.pdf") == "test.pdf"

    def test_returns_string_always(self):
        assert isinstance(decode_zip_name("anything"), str)

    def test_handles_arabic_already_decoded(self):
        assert decode_zip_name("مرجع.pdf") == "مرجع.pdf"


class TestSafeFilename:
    def test_replaces_colon(self):
        result = safe_filename(Path("book:2024.pdf"))
        assert ":" not in result
        assert result.endswith(".pdf")

    def test_replaces_special_chars(self):
        result = safe_filename(Path("a*b?c.pdf"))
        assert "*" not in result
        assert "?" not in result

    def test_preserves_arabic(self):
        result = safe_filename(Path("مرجع.pdf"))
        assert "مرجع" in result

    def test_uses_only_basename(self):
        result = safe_filename(Path("folder/sub/file.pdf"))
        assert result == "file.pdf"

    def test_returns_document_for_empty_name(self):
        result = safe_filename(Path("."))
        assert result == "document"
