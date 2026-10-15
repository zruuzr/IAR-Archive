"""اختبارات دعم السجلات الجزئية (ai_status) في validate_books.py"""
import pytest

import validate_books as v


def complete_book(**extra):
    book = {
        "id": 1, "title": "t", "category": "c", "description": "d",
        "type": "كتاب", "file_path": "pdf/a.pdf",
    }
    book.update(extra)
    return book


def partial_book(**extra):
    book = {"id": 1, "title": "t", "category": "", "description": "",
            "type": "", "file_path": "pdf/a.pdf", "ai_status": "partial",
            "ai_attempts": 1}
    book.update(extra)
    return book


class TestPartialRecords:
    def test_partial_with_empty_fields_passes(self):
        v.validate_book(partial_book(), 1, set())

    def test_partial_still_needs_a_title(self):
        with pytest.raises(SystemExit):
            v.validate_book(partial_book(title=""), 1, set())

    def test_partial_still_needs_file_path(self):
        book = partial_book()
        del book["file_path"]
        with pytest.raises(SystemExit):
            v.validate_book(book, 1, set())

    def test_complete_record_stays_strict(self):
        with pytest.raises(SystemExit):
            v.validate_book(complete_book(description=""), 1, set())
        with pytest.raises(SystemExit):
            v.validate_book(complete_book(type=""), 1, set())

    def test_record_without_status_stays_strict(self):
        with pytest.raises(SystemExit):
            v.validate_book(complete_book(category=""), 1, set())

    def test_explicit_complete_status_is_strict(self):
        with pytest.raises(SystemExit):
            v.validate_book(complete_book(ai_status="complete", category=""), 1, set())
        v.validate_book(complete_book(ai_status="complete"), 1, set())


class TestAiBookkeeping:
    def test_unknown_status_rejected(self):
        with pytest.raises(SystemExit):
            v.validate_book(complete_book(ai_status="pending"), 1, set())

    def test_non_string_status_rejected(self):
        with pytest.raises(SystemExit):
            v.validate_book(complete_book(ai_status=True), 1, set())

    @pytest.mark.parametrize("value", [-1, 1.5, "3", True, 5000])
    def test_bad_attempts_rejected(self, value):
        with pytest.raises(SystemExit):
            v.validate_book(partial_book(ai_attempts=value), 1, set())

    def test_file_type_is_accepted(self):
        v.validate_book(complete_book(file_type="PDF"), 1, set())


class TestMainWarnsAboutPartial:
    def test_main_passes_and_warns(self, tmp_path, monkeypatch, capsys):
        import json
        path = tmp_path / "books.json"
        path.write_text(json.dumps([complete_book(), partial_book(id=2)]), encoding="utf-8")
        monkeypatch.setattr(v, "BOOKS_PATH", path)
        v.main()
        out = capsys.readouterr().out
        assert "partial" in out and "validation passed" in out
