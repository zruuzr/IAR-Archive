"""اختبارات dataclass Book والدوال المرتبطة"""
import pytest
from pathlib import Path
from process_books import (
    Book,
    existing_book_maps,
    make_book,
    should_skip_existing,
    is_supported_document,
    sha256_file,
)


class TestBookToJsonDict:
    def test_excludes_ai_provider(self):
        book = Book(id=1, title="t", _ai_provider="gemini-text")
        d = book.to_json_dict()
        assert "_ai_provider" not in d

    def test_includes_all_public_fields(self):
        book = Book(id=5, title="t")
        d = book.to_json_dict()
        assert d["id"] == 5
        assert d["title"] == "t"
        assert d["keywords"] == []
        assert d["featured"] is False


class TestExistingBookMaps:
    def test_builds_by_path_and_hash(self, sample_books):
        by_path, by_hash = existing_book_maps(sample_books)
        assert "pdf/book1.pdf" in by_path
        assert "a" * 64 in by_hash
        assert by_path["pdf/book1.pdf"]["id"] == 1

    def test_handles_missing_fields(self):
        by_path, by_hash = existing_book_maps([{"id": 1}])
        assert by_path == {}
        assert by_hash == {}

    def test_empty_list(self):
        by_path, by_hash = existing_book_maps([])
        assert by_path == {} and by_hash == {}


class TestShouldSkipExisting:
    def test_not_in_map_returns_false(self, tmp_path):
        f = tmp_path / "new.pdf"
        f.write_bytes(b"data")
        assert should_skip_existing(f, {}) is False

    def test_same_hash_returns_true(self, sample_source_file):
        digest = sha256_file(sample_source_file)
        by_path = {
            sample_source_file.as_posix(): {"source_sha256": digest},
        }
        assert should_skip_existing(sample_source_file, by_path) is True

    def test_different_hash_returns_false(self, sample_source_file):
        by_path = {
            sample_source_file.as_posix(): {"source_sha256": "0" * 64},
        }
        assert should_skip_existing(sample_source_file, by_path) is False

    def test_legacy_record_without_hash_skips(self, sample_source_file):
        by_path = {
            sample_source_file.as_posix(): {"title": "legacy"},
        }
        assert should_skip_existing(sample_source_file, by_path) is True


class TestIsSupportedDocument:
    def test_pdf_is_supported(self, tmp_path):
        f = tmp_path / "book.pdf"
        f.write_bytes(b"x")
        assert is_supported_document(f) is True

    def test_docx_is_supported(self, tmp_path):
        f = tmp_path / "book.docx"
        f.write_bytes(b"x")
        assert is_supported_document(f) is True

    def test_zip_is_not_supported_as_document(self, tmp_path):
        f = tmp_path / "archive.zip"
        f.write_bytes(b"x")
        assert is_supported_document(f) is False

    def test_unknown_extension_rejected(self, tmp_path):
        f = tmp_path / "book.txt"
        f.write_bytes(b"x")
        assert is_supported_document(f) is False

    def test_directory_rejected(self, tmp_path):
        assert is_supported_document(tmp_path) is False


class TestMakeBook:
    def test_builds_book_from_metadata(
        self, sample_source_file, sample_metadata
    ):
        book = make_book(
            book_id=42,
            source=sample_source_file,
            metadata=sample_metadata,
            pages=10,
            provider="gemini-text",
        )
        assert book.id == 42
        assert book.title == "مقدمة في الإدارة"
        assert book.pages == 10
        assert book.source_sha256
        assert len(book.source_sha256) == 64
        assert book._ai_provider == "gemini-text"

    def test_file_path_normalized(self, sample_source_file, sample_metadata):
        book = make_book(
            book_id=1,
            source=sample_source_file,
            metadata=sample_metadata,
            pages=0,
            provider="test",
        )
        assert book.file_path.startswith("pdf/")

    def test_cover_image_uses_book_id(self, sample_source_file, sample_metadata):
        book = make_book(
            book_id=7,
            source=sample_source_file,
            metadata=sample_metadata,
            pages=0,
            provider="test",
        )
        assert book.cover_image == "covers/7.png"
