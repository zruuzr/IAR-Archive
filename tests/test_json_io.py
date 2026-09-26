"""اختبارات قراءة/كتابة books.json"""
import json
import pytest
import process_books
from process_books import (
    atomic_write_json,
    load_books,
    save_books,
    next_book_id,
    MAX_BOOKS,
)


class TestAtomicWriteJson:
    def test_writes_valid_json(self, tmp_path):
        target = tmp_path / "test.json"
        data = [{"id": 1, "title": "كتاب"}]
        atomic_write_json(target, data)
        result = json.loads(target.read_text(encoding="utf-8"))
        assert result == data

    def test_overwrites_existing(self, tmp_path):
        target = tmp_path / "test.json"
        target.write_text("old")
        atomic_write_json(target, {"new": True})
        assert json.loads(target.read_text(encoding="utf-8")) == {"new": True}

    def test_no_tmp_file_left(self, tmp_path):
        target = tmp_path / "test.json"
        atomic_write_json(target, [])
        assert list(tmp_path.glob("*.tmp")) == []

    def test_creates_parent_directory(self, tmp_path):
        target = tmp_path / "nested" / "deep" / "test.json"
        atomic_write_json(target, [])
        assert target.exists()

    def test_preserves_arabic_utf8(self, tmp_path):
        target = tmp_path / "test.json"
        atomic_write_json(target, [{"title": "مرجع"}])
        raw = target.read_text(encoding="utf-8")
        assert "مرجع" in raw


class TestNextBookId:
    def test_empty_returns_one(self):
        assert next_book_id([]) == 1

    def test_max_plus_one(self):
        assert next_book_id([{"id": 1}, {"id": 2}, {"id": 3}]) == 4

    def test_ignores_invalid(self):
        books = [{"id": 1}, {"id": "abc"}, {"id": None}, {"id": 5}]
        assert next_book_id(books) == 6

    def test_ignores_negative(self):
        assert next_book_id([{"id": -1}, {"id": 3}]) == 4

    def test_missing_id_key(self):
        assert next_book_id([{"title": "x"}]) == 1


class TestLoadBooks:
    def test_missing_file_returns_empty(self, monkeypatch, tmp_path):
        monkeypatch.setattr(process_books, "JSON_PATH", tmp_path / "missing.json")
        assert load_books() == []

    def test_invalid_json_raises(self, monkeypatch, tmp_path):
        bad = tmp_path / "bad.json"
        bad.write_text("{not valid")
        monkeypatch.setattr(process_books, "JSON_PATH", bad)
        with pytest.raises(RuntimeError, match="Invalid JSON"):
            load_books()

    def test_non_array_raises(self, monkeypatch, tmp_path):
        obj = tmp_path / "obj.json"
        obj.write_text('{"a": 1}')
        monkeypatch.setattr(process_books, "JSON_PATH", obj)
        with pytest.raises(RuntimeError, match="must contain"):
            load_books()

    def test_valid_array_loads(self, monkeypatch, tmp_path):
        good = tmp_path / "good.json"
        good.write_text('[{"id": 1}]', encoding="utf-8")
        monkeypatch.setattr(process_books, "JSON_PATH", good)
        assert load_books() == [{"id": 1}]


class TestSaveBooks:
    def test_exceeds_max_raises(self, monkeypatch, tmp_path):
        monkeypatch.setattr(process_books, "JSON_PATH", tmp_path / "books.json")
        huge = [{"id": i} for i in range(MAX_BOOKS + 1)]
        with pytest.raises(RuntimeError, match="Refusing to save"):
            save_books(huge)

    def test_exactly_max_is_allowed(self, monkeypatch, tmp_path):
        target = tmp_path / "books.json"
        monkeypatch.setattr(process_books, "JSON_PATH", target)
        exact = [{"id": i} for i in range(MAX_BOOKS)]
        save_books(exact)
        assert target.exists()
