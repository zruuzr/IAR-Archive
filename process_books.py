import os
import json
import shutil
import time
from google import genai
from google.genai import types
from google.genai.errors import ClientError

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

JSON_PATH = "data.json"
PDF_DIR = "pdf"

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
                temp_pdf = "temp_upload.pdf"
                shutil.copyfile(file_path, temp_pdf)
                
                uploaded_file = None
                try:
                    # رفع الملف إلى خوادم Gemini
                    uploaded_file = client.files.upload(file=temp_pdf)
                    
                    prompt = """استخرج معلومات هذا الكتاب بصيغة JSON بنفس حقول الهيكل المعتاد (id, title, title_en, author, author_en, category, category_en, type, type_en, description, description_en, publisher, publisher_en, year, pages, file_size, file_type, isbn, keywords, keywords_en, key_points, key_points_en, target_audience, target_audience_en)."""
                    
                    # محاولة استخراج البيانات مع الانتظار التلقائي في حال تجاوز حد الطلبات (Rate Limit / 429)
                    response = None
                    max_retries = 5
                    for attempt in range(max_retries):
                        try:
                            response = client.models.generate_content(
                                model="gemini-2.5-flash",
                                contents=[uploaded_file, prompt],
                                config=types.GenerateContentConfig(
                                    response_mime_type="application/json"
                                )
                            )
                            break
                        except ClientError as e:
                            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                                print(f"تجاوز حد الاستخدام المؤقت، جاري الانتظار 20 ثانية... (المحاولة {attempt + 1})")
                                time.sleep(20)
                            else:
                                raise e
                    
                    if response and response.text:
                        clean_json = response.text.strip()
                        new_book = json.loads(clean_json)
                        
                        new_book["id"] = len(books_data) + 1
                        new_book["file_path"] = file_path
                        new_book["cover_image"] = f"covers/{new_book['id']}.png"
                        
                        books_data.append(new_book)
                        
                finally:
                    # تنظيف وحذف الملفات المرفوعة مؤقتاً لتفريغ المساحة
                    if uploaded_file:
                        try:
                            client.files.delete(name=uploaded_file.name)
                        except Exception:
                            pass
                    if os.path.exists(temp_pdf):
                        os.remove(temp_pdf)
                
                # فك الضغط عن معدل الطلبات بدقيقة واحدة بين كل كتاب والآخر
                time.sleep(10)

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(books_data, f, ensure_ascii=False, indent=2)
