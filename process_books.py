import os
import json
from google import genai
from google.genai import types
from pypdf import PdfReader

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

JSON_PATH = "books.json"
PDF_DIR = "pdf"

def extract_first_pages_text(pdf_path, max_pages=10):
    """استخراج نص أول بضعة صفحات فقط لتفادي استنزاف الـ Tokens"""
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

if os.path.exists(JSON_PATH):
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        books_data = json.load(f)
else:
    books_data = []

existing_files = [book.get("file_path") for book in books_data]

if os.path.exists(PDF_DIR):
    for file_name in os.listdir(PDF_DIR):
        if file_name.endswith(".pdf"):
            file_path = f"{PDF_DIR}/{file_name}"
            if file_path not in existing_files:
                print(f"جاري معالجة الكتاب: {file_name}")
                
                # قراءة أول 10 صفحات فقط محلياً
                sample_text = extract_first_pages_text(file_path, max_pages=10)
                
                if not sample_text:
                    print(f"تجاوز الكتاب {file_name} بسبب عدم وجود نص قابل للقراءة.")
                    continue

                prompt = f"""
أنت مفهرس كتب محترف. بناءً على نص الصفحات الأولى التالية من الكتاب، استخرج البيانات المطلوبة بدقة وصيغها داخل كود JSON حصراً.

الحقول المطلوبة:
(id, title, title_en, author, author_en, category, category_en, type, type_en, description, description_en, publisher, publisher_en, year, pages, file_size, file_type, isbn, keywords, keywords_en, key_points, key_points_en, target_audience, target_audience_en)

نص الصفحات الأولى من الكتاب:
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
                        new_book["id"] = len(books_data) + 1
                        new_book["file_path"] = file_path
                        new_book["cover_image"] = f"covers/{new_book['id']}.png"
                        
                        books_data.append(new_book)
                        print(f"تمت أتمتة الكتاب بنجاح: {new_book.get('title')}")
                except Exception as e:
                    print(f"حدث خطأ أثناء معالجة {file_name}: {e}")

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(books_data, f, ensure_ascii=False, indent=2)
