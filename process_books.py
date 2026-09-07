import os
import json
import shutil
from google import genai

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
                # إنشاء نسخة مؤقتة باسم إنجليزي لتفادي خطأ الحروف العربية في الترويسة
                temp_pdf = "temp_upload.pdf"
                shutil.copyfile(file_path, temp_pdf)
                
                try:
                    uploaded_file = client.files.upload(file=temp_pdf)
                    
                    prompt = """استخرج معلومات هذا الكتاب بصيغة JSON بنفس حقول الهيكل المعتاد (id, title, title_en, author, author_en, category, category_en, type, type_en, description, description_en, publisher, publisher_en, year, pages, file_size, file_type, isbn, keywords, keywords_en, key_points, key_points_en, target_audience, target_audience_en). أرجع فقط كود JSON بدون أي نصوص إضافية."""
                    
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=[uploaded_file, prompt]
                    )
                    
                    clean_json = response.text.replace("```json", "").replace("```", "").strip()
                    new_book = json.loads(clean_json)
                    
                    new_book["id"] = len(books_data) + 1
                    new_book["file_path"] = file_path
                    new_book["cover_image"] = f"covers/{new_book['id']}.png"
                    
                    books_data.append(new_book)
                finally:
                    # حذف الملف المؤقت بعد المعالجة
                    if os.path.exists(temp_pdf):
                        os.remove(temp_pdf)

with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(books_data, f, ensure_ascii=False, indent=2)
