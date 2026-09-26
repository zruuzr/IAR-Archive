"""اختبارات تنظيف والتحقق من metadata"""
import pytest
from pathlib import Path
from process_books import (
    clean_title,
    normalized_ai_data,
    validate_metadata,
)


class TestCleanTitle:
    @pytest.mark.parametrize("value,expected", [
        ("", ""),
        ("unknown", ""),
        ("UNKNOWN", ""),
        ("Untitled", ""),
        ("book", ""),
        ("كتاب", ""),
        ("مستند", ""),
        ("بدون عنوان", ""),
        ("غير معروف", ""),
        ("  كتاب  ", ""),
        ("مقدمة في الإدارة", "مقدمة في الإدارة"),
        ("Real Title", "Real Title"),
    ])
    def test_various_titles(self, value, expected):
        assert clean_title(value) == expected


class TestNormalizedAiData:
    def test_empty_input_returns_defaults(self):
        result = normalized_ai_data({})
        assert result["title"] == ""
        assert result["year"] == 0
        assert result["keywords"] == []
        assert result["key_points"] == []

    def test_cleans_banned_title(self):
        result = normalized_ai_data({"title": "كتاب"})
        assert result["title"] == ""

    def test_normalizes_lists(self):
        result = normalized_ai_data({
            "keywords": ["a", "", "  ", None, "b"],
        })
        assert result["keywords"] == ["a", "b"]

    def test_year_string_to_int(self):
        result = normalized_ai_data({"year": "2020"})
        assert result["year"] == 2020

    def test_negative_year_becomes_zero(self):
        result = normalized_ai_data({"year": -5})
        assert result["year"] == 0

    def test_keywords_limited_to_50(self):
        result = normalized_ai_data({
            "keywords": [f"k{i}" for i in range(100)],
        })
        assert len(result["keywords"]) == 50

    def test_key_points_limited_to_30(self):
        result = normalized_ai_data({
            "key_points": [f"p{i}" for i in range(100)],
        })
        assert len(result["key_points"]) == 30


class TestValidateMetadata:
    def test_valid_passes(self):
        validate_metadata(
            {"title": "t", "description": "d", "category": "c", "year": 2020},
            Path("a.pdf"),
        )

    def test_missing_title_raises(self):
        with pytest.raises(ValueError, match="title"):
            validate_metadata(
                {"title": "", "description": "d", "category": "c"},
                Path("a.pdf"),
            )

    def test_missing_description_raises(self):
        with pytest.raises(ValueError, match="description"):
            validate_metadata(
                {"title": "t", "description": "", "category": "c"},
                Path("a.pdf"),
            )

    def test_missing_category_raises(self):
        with pytest.raises(ValueError, match="category"):
            validate_metadata(
                {"title": "t", "description": "d", "category": ""},
                Path("a.pdf"),
            )

    def test_year_too_small_raises(self):
        with pytest.raises(ValueError, match="Suspicious"):
            validate_metadata(
                {"title": "t", "description": "d", "category": "c", "year": 500},
                Path("a.pdf"),
            )

    def test_year_too_large_raises(self):
        with pytest.raises(ValueError, match="Suspicious"):
            validate_metadata(
                {"title": "t", "description": "d", "category": "c", "year": 2500},
                Path("a.pdf"),
            )

    def test_year_zero_passes(self):
        validate_metadata(
            {"title": "t", "description": "d", "category": "c", "year": 0},
            Path("a.pdf"),
        )
