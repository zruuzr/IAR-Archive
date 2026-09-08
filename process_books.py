import os
import json
import shutil
from google import genai
from google.genai import types
from pypdf import PdfReader

# إعداد عميل Gemini باستخدام المفتاح الممرر من أسرار GitHub
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

JSON_PATH = "books.json"
PDF_DIR = "pdf"

# قالب الهيكل الموحد والصارم لضمان عدم اختلاف مخرجات الـ AI أبداً
JSON_SCHEMA_INSTRUCTIONS = """
قم باستخراج بيانات الكتاب وصغ البيانات داخل كائن JSON يلتزم بالهيكل التالي حرفياً وبدون أي تغيير في أسماء الحقول أو إضافة حقول خارجية، واجعل قيمة حقل الناشر (publisher) دائماً نصاً (String) وليست كائناً:

{
  "title": "العنوان بالعربية",
  "title_en": "العنوان بالإنجليزية",
  "author": "اسم المؤلف بالعربية",
  "author_en": "اسم المؤلف بالإنجليزية",
  "category": "التصنيف بالعربية",
  "category_en": "التصنيف بالإنجليزية",
  "type": "نوع الكتاب بالعربية",
  "type_en": "نوع الكتاب بالإنجليزية",
  "description": "وصف شامل بالعربية",
  "description_en": "وصف شامل بالإنجليزية",
  "publisher": "اسم الناشر نصاً بالعربية فقط",
  "publisher_en": "اسم الناشر بالإنجليزية فقط",
  "year": "سنة النشر كـ نص مثل '2015'",
  "isbn": "الرقم الدولي المعياري أو نص فارغ",
  "keywords": ["كلمة1", "كلمة2"],
  "keywords_en": ["Word1", "Word2"],
  "key_points": ["نقطة1", "نقطة2"],
  "key_points_en": ["Point1", "Point2"],
  "target_audience": "الجمهور المستهدف بالعربية",
  "target_audience_en": "الجمهور المستهدف بالإنجليزية"
}
"""

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
    """استخراج نص أول بضعة صفحات محلياً لتوفير الاستهلاك وسرعة المعالجة"""
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

def sanitize_book_data(book):
    """دالة تنقية للتأكد من أن البيانات الناتجة مطابقة لهيكل الموقع تماماً وتجنب أي أخطاء كائنية"""
    if not isinstance(book, dict):
        return {}

    # معالجة الناشر لو عاد كـ كائن بالخطأ
    pub = book.get("publisher", "")
    if isinstance(pub, dict):
        book["publisher"] = pub.get("name", "الأرشيف الإداري العراقي")
    elif not pub:
        book["publisher"] = "الأرشيف الإداري العراقي"

    pub_en = book.get("publisher_en", "")
    if isinstance(pub_en, dict):
        book["publisher_en"] = pub_en.get("name", "IAR Archive")
    elif not pub_en:
        book["publisher_en"] = "IAR Archive"

    # ضمان وجود الحقول النصية الأساسية لتجنب الانهيار في الواجهة
    if not book.get("category"):
        book["category"] = "عام"
    if not book.get("description"):
        book["description"] = "لا يتوفر وصف تفصيلي لهذا المرجع حالياً."
    if not book.get("type"):
        book["type"] = "مرجع منهجي"
    if not book.get("year"):
        book["year"] = "2026"

    # التأكد من المصفوفات
    for field in ["keywords", "keywords_en", "key_points", "key_points_en"]:
        if not isinstance(book.get(field), list):
            book[field] = []

    return book

# قراءة البيانات الحالية من ملف books.json
if os.path.exists(JSON_PATH):
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        books_data = json.load(f)
else:
    books_data = []

# توحيد مسارات الملفات لتفادي تكرار المعالجة
existing_files = [os.path.normpath(book.get("file_path", "")) for book in books_data]

if os.path.exists(PDF_DIR):
    for file_name in os.listdir(PDF_DIR):
        if file_name.lower().endswith(".pdf"):
            file_path = f"{PDF_DIR}/{file_name}"
            normalized_path = os.path.normpath(file_path)
            
            if normalized_path not in existing_files:
                print(f"جاري معالجة الكتاب الجديد: {file_name}")
                
                pages_count, file_size_str = get_file_info(file_path)
                sample_text = extract_first_pages_text(file_path, max_pages=10)
                
                uploaded_file = None
                temp_pdf = "temp_upload.pdf"
                
                try:
                    if not sample_text:
                        print("الملف مصور، جاري الرفع للتحليل الشامل عبر الموديل متعدد الوسائط...")
                        shutil.copyfile(file_path, temp_pdf)
                        uploaded_file = client.files.upload(file=temp_pdf)
                        contents_payload = [
                            uploaded_file,
                            f"أنت مفهرس كتب محترف. {JSON_SCHEMA_INSTRUCTIONS}"
                        ]
                    else:
                        prompt = f"""
أنت مفهرس كتب محترف. {JSON_SCHEMA_INSTRUCTIONS}

النص المستخرج من الكتاب:
{sample_text[:12000]}
"""
                        contents_payload = prompt

                    response = client.models.generate_content(
                        model="gemini-2.5-flash",  # تم اعتماد موديل موثوق ومستقر
                        contents=contents_payload,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    
                    if response and response.text:
                        raw_book = json.loads(response.text.strip())
                        new_book = sanitize_book_data(raw_book)
                        
                        # إسناد المعرف والبيانات المحسوبة برمجياً بدقة
                        new_book["id"] = len(books_data) + 1
                        new_book["pages"] = pages_count if pages_count else new_book.get("pages", "0")
                        new_book["file_size"] = file_size_str
                        new_book["file_type"] = "PDF"
                        new_book["file_path"] = file_path
                        new_book["cover_image"] = f"covers/{new_book['id']}.png"
                        
                        books_data.append(new_book)
                        print(f"تمت إضافة الكتاب بنجاح: {new_book.get('title')}")
                        
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

# حفظ القائمة المحدثة في books.json بشكل مرتب ويدعم العربية
with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(books_data, f, ensure_ascii=False, indent=2)
