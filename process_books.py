import os
import json
import shutil
from google import genai
from google.genai import types
from pypdf import PdfReader

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

JSON_PATH = "books.json"
PDF_DIR = "pdf"

def get_file_info(file_path):
    """حساب عدد الصفحات وحجم الملف برمجياً بدقة"""
    pages_count = 0
    file_size_str = "غير معروف"
    
    try:
        reader = PdfReader(file_path)
        pages_count = len(reader.pages)
    except Exception:
        pass

    try:
        size_bytes = os.path.getsize(file_path)
        size_mb = size_bytes / (1024 * 1024)
        file_size_str = f"{size_mb:.2f} MB"
    except Exception:
        pass
        
    return str(pages_count) if pages_count > 0 else None, file_size_str

def extract_first_pages_text(pdf_path, max_pages=10):
    text = ""
    try:
        reader = PdfReader(pdf_path)
        num_pages = min(len(reader.pages), max_pages)
        for i in range(num_pages):
            page_text = reader.pages[i].extract_text()
            if page_text:
                text += f"\n--- صفحة {i+1} ---\n" + page_text
    except Exception as e:
        print(f"تعذر استخراج النص من {pdf_path}: {e}")
    return text.strip()

# قراءة الملف الحالي
if os.path.exists(JSON_PATH):
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        books_data = json.load(f)
else:
    books_data = []

# توحيد صيغ المسارات لتجنب إعادة معالجة الملفات المسجلة سابقاً
existing_files = [os.path.normpath(book.get("file_path", "")) for book in books_data]

if os.path.exists(PDF_DIR):
    for file_name in os.listdir(PDF_DIR):
        if file_name.endswith(".pdf"):
            file_path = f"{PDF_DIR}/{file_name}"
            normalized_path = os.path.normpath(file_path)
            
            if normalized_path not in existing_files:
                print(f"جاري معالجة الكتاب الجديد: {file_name}")
                
                sample_text = extract_first_pages_text(file_path, max_pages=10)
                pages_count, file_size_str = get_file_info(file_path)
                
                if not sample_text:
                    continue

                prompt = f"""
أنت مفهرس كتب محترف. بناءً على النص التالي، استخرج بيانات الكتاب وصغها داخل JSON بالتحديد.
الحقول المطلوبة:
(title, title_en, author, author_en, category, category_en, type, type_en, description, description_en, publisher, publisher_en, year, isbn, keywords, keywords_en, key_points, key_points_en, target_audience, target_audience_en)

ملاحظة: اجعل target_audience و target_audience_en نصوصاً صريحة (String) وليست مصفوفات.

النص:
{sample_text[:12000]}
"""
                try:
                    response = client.models.generate_content(
                        model="gemini-3.6-flash",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    
                    if response and response.text:
                        new_book = json.loads(response.text.strip())
                        
                        # تعيين البيانات التلقائية وحساب القيم المحسوبة برمجياً
                        new_book["id"] = len(books_data) + 1
                        new_book["pages"] = pages_count
                        new_book["file_size"] = file_size_str
                        new_book["file_type"] = "PDF"
                        new_book["file_path"] = file_path
                        new_book["cover_image"] = f"covers/{new_book['id']}.png"
                        
                        books_data.append(new_book)
                        print(f"تم إضافة الكتاب بنجاح: {new_book.get('title')}")
                except Exception as e:
                    print(f"خطأ أثناء معالجة {file_name}: {e}")

# حفظ التحديثات مع الحفاظ على البيانات القديمة
with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(books_data, f, ensure_ascii=False, indent=2)
