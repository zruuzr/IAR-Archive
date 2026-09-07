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
        print(f"تعذر استخراج النص محلياً من {pdf_path}: {e}")
    return text.strip()

if os.path.exists(JSON_PATH):
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        books_data = json.load(f)
else:
    books_data = []

existing_files = [os.path.normpath(book.get("file_path", "")) for book in books_data]

if os.path.exists(PDF_DIR):
    for file_name in os.listdir(PDF_DIR):
        if file_name.lower().endswith(".pdf"):
            file_path = f"{PDF_DIR}/{file_name}"
            normalized_path = os.path.normpath(file_path)
            
            if normalized_path not in existing_files:
                print(f"جاري معالجة الكتاب: {file_name}")
                
                pages_count, file_size_str = get_file_info(file_path)
                sample_text = extract_first_pages_text(file_path, max_pages=10)
                
                uploaded_file = None
                temp_pdf = "temp_upload.pdf"
                
                try:
                    # إذا كان الملف مصوراً ولم يخرج نصاً محلياً، نرفعه للذكاء الاصطناعي مباشرة
                    if not sample_text:
                        print("الملف مصور أو لا يحتوي نصاً المباشر، جاري الرفع للتحليل الشامل...")
                        shutil.copyfile(file_path, temp_pdf)
                        uploaded_file = client.files.upload(file=temp_pdf)
                        contents_payload = [
                            uploaded_file,
                            "استخرج بيانات الكتاب المرفق بصيغة JSON حصرية تحوي الحقول المعيارية."
                        ]
                    else:
                        prompt = f"""
أنت مفهرس كتب محترف. بناءً على النص التالي، استخرج بيانات الكتاب وصغها داخل JSON حصراً.
الحقول المطلوبة:
(title, title_en, author, author_en, category, category_en, type, type_en, description, description_en, publisher, publisher_en, year, isbn, keywords, keywords_en, key_points, key_points_en, target_audience, target_audience_en)

النص:
{sample_text[:12000]}
"""
                        contents_payload = prompt

                    response = client.models.generate_content(
                        model="gemini-3.6-flash",
                        contents=contents_payload,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    
                    if response and response.text:
                        new_book = json.loads(response.text.strip())
                        
                        new_book["id"] = len(books_data) + 1
                        new_book["pages"] = pages_count if pages_count else new_book.get("pages")
                        new_book["file_size"] = file_size_str
                        new_book["file_type"] = "PDF"
                        new_book["file_path"] = file_path
                        new_book["cover_image"] = f"covers/{new_book['id']}.png"
                        
                        books_data.append(new_book)
                        print(f"تم إضافة الكتاب بنجاح: {new_book.get('title')}")
                        
                except Exception as e:
                    print(f"خطأ أثناء معالجة الملف {file_name}: {e}")
                finally:
                    if uploaded_file:
                        try:
                            client.files.delete(name=uploaded_file.name)
                        except Exception:
                            pass
                    if os.path.exists(temp_pdf):
                        os.remove(temp_pdf)

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(books_data, f, ensure_ascii=False, indent=2)
