"""اختبارات أدوات AI (بدون استدعاء شبكي)"""
import pytest
from pathlib import Path
from process_books import (
    extract_json_object,
    build_prompt,
    gemini_mime_type,
    MAX_SAMPLE_CHARS,
)


class TestExtractJsonObject:
    def test_plain_json(self):
        result = extract_json_object('{"title": "كتاب"}')
        assert result == {"title": "كتاب"}

    def test_json_in_code_fence(self):
        result = extract_json_object('```json\n{"a": 1}\n```')
        assert result == {"a": 1}

    def test_json_in_bare_fence(self):
        result = extract_json_object('```\n{"a": 1}\n```')
        assert result == {"a": 1}

    def test_json_with_prefix_text(self):
        result = extract_json_object('Here: {"a": 1} done')
        assert result == {"a": 1}

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="empty"):
            extract_json_object("")

    def test_no_json_raises(self):
        with pytest.raises(ValueError, match="No JSON"):
            extract_json_object("no json here")

    def test_non_object_raises(self):
        with pytest.raises(ValueError, match="must be a JSON object"):
            extract_json_object("[1, 2, 3]")


class TestBuildPrompt:
    def test_contains_document_marker(self):
        result = build_prompt("hello")
        assert "DOCUMENT CONTENT" in result
        assert "hello" in result

    def test_truncates_long_text(self):
        marker = "Z"
        long_text = marker * 40_000
        result = build_prompt(long_text)
        # نص الوثيقة يقتصر على MAX_SAMPLE_CHARS
        assert result.count(marker) == MAX_SAMPLE_CHARS

    def test_short_text_not_truncated(self):
        short = "short content"
        result = build_prompt(short)
        assert short in result


class TestGeminiMimeType:
    def test_pdf(self):
        assert gemini_mime_type(Path("book.pdf")) == "application/pdf"

        def test_unknown_extension_falls_back(self):
        # ملاحظة: .xyz معروف في mimetypes كـ chemical/x-xyz
        # نستخدم امتدادًا وهميًا غير مسجّل
        assert gemini_mime_type(Path("book.qqq")) == "application/octet-stream"

    def test_docx(self):
        result = gemini_mime_type(Path("book.docx"))
        assert "word" in result.lower() or result == "application/octet-stream"
