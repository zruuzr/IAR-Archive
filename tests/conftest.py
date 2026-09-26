"""
Fixtures مشتركة لاختبارات process_books.py
يُكتشف تلقائيًا بواسطة pytest
"""
import pytest
from pathlib import Path


@pytest.fixture
def sample_books():
    """قائمة كتب وهمية مع بنية مطابقة لما ينتجه make_book"""
    return [
        {
            "id": 1,
            "title": "مرجع إداري",
            "file_path": "pdf/book1.pdf",
            "source_sha256": "a" * 64,
        },
        {
            "id": 2,
            "title": "دليل مالي",
            "file_path": "pdf/book2.pdf",
            "source_sha256": "b" * 64,
        },
    ]


@pytest.fixture
def sample_source_file(tmp_path):
    """ملف PDF وهمي صغير لاختبار sha256 و make_book"""
    f = tmp_path / "sample.pdf"
    f.write_bytes(b"%PDF-1.4\n%dummy\n%%EOF\n")
    return f


@pytest.fixture
def sample_metadata():
    """metadata كامل مطابق لما يعيده normalized_ai_data"""
    return {
        "title": "مقدمة في الإدارة",
        "title_en": "",
        "author": "أحمد محمد",
        "category": "إدارة",
        "type": "كتاب",
        "description": "وصف تجريبي",
        "publisher": "دار النشر",
        "year": 2020,
        "isbn": "",
        "keywords": ["إدارة", "تنظيم"],
        "key_points": ["نقطة 1", "نقطة 2"],
        "target_audience": "طلاب",
    }
