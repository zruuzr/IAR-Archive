import os
import json
import shutil
from google import genai
from google.genai import types
from pypdf import PdfReader

# ✅ التحقق المبكر من وجود مفتاح API لتجنب الانهيار المفاجئ
if "GEMINI_API_KEY" not in os.environ:
    raise ValueError("خطأ: متغير البيئة GEMINI_API_KEY غير موجود. يرجى إعداده في أسرار مستودع GitHub.")

# إعداد عميل Gemini باستخدام المفتاح الممرر
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

JSON_PATH = "books.json"
PDF_DIR = "pdf"

# القالب الهيكلي الموحد لضمان التزام النموذج بالحقول المطلوبة
JSON_SCHEMA_PROMPT = """
أنت مفهرس كتب محترف. قم باستخراج بيانات الكتاب وصغ البيانات داخل JSON يلتزم بالهيكل التالي حرفياً وبدون أي تغيير في أسماء الحقول أو إضافة حقول خارجية:

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
  "publisher": "الناشر بالعربية",
  "publisher_en": "الناشر بالإنجليزية",
  "year": "سنة النشر",
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

# قراءة البيانات الحالية من ملف books.json بأمان
if os.path.exists(JSON_PATH):
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            books_data = json.load(f)
    except Exception:
        books_data = []
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
                    # اعتبار الملف مصوراً إذا كان النص المستخرج منه أقل من 100 حرف
                    if len(sample_text.strip()) < 100:
                        print("الملف مصور أو النص المحلي غير كافٍ، جاري الرفع للتحليل الشامل عبر Gemini...")
                        shutil.copyfile(file_path, temp_pdf)
                        uploaded_file = client.files.upload(file=temp_pdf)
                        contents_payload = [
                            uploaded_file,
                            JSON_SCHEMA_PROMPT
                        ]
                    else:
                        contents_payload = f"{JSON_SCHEMA_PROMPT}\n\nالنص المستخرج من الكتاب:\n{sample_text[:12000]}"

                    # استخدام اسم نموذج مستقر ومعتمد
                    response = client.models.generate_content(
                        model="gemini-3.5-flash",
                        contents=contents_payload,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json"
                        )
                    )
                    
                    if response and response.text:
                        new_book = json.loads(response.text.strip())
                        
                        # التحقق من أن الاستجابة عبارة عن قاموس (dict)
                        if not isinstance(new_book, dict):
                            raise ValueError("استجابة نموذج Gemini لم تكن بصيغة كائن JSON صالح.")
                        
                        # توليد ID آمن ومتسلسل لا يتأثر بالحذف اليدوي
                        max_id = max((book.get("id", 0) for book in books_data), default=0)
                        new_book["id"] = max_id + 1
                        
                        new_book["pages"] = pages_count if pages_count else new_book.get("pages")
                        new_book["file_size"] = file_size_str
                        new_book["file_type"] = "PDF"
                        new_book["file_path"] = file_path
                        new_book["cover_image"] = f"covers/{new_book['id']}.png"
                        
                        books_data.append(new_book)
                        
                        # حفظ تدريجي للبيانات بعد إضافة كل كتاب (لحماية التقدم وضمان عدم ضياعه)
                        with open(JSON_PATH, "w", encoding="utf-8") as f:
                            json.dump(books_data, f, ensure_ascii=False, indent=2)
                            
                        print(f"تمت إضافة وحفظ الكتاب بنجاح: {new_book.get('title')}")
                        
                except Exception as e:
                    print(f"خطأ أثناء معالجة الملف {file_name}: {e}")
                finally:
                    # التنظيف الآمن للملفات المؤقتة
                    if uploaded_file:
                        try:
                            client.files.delete(name=uploaded_file.name)
                        except Exception:
                            pass
                    if os.path.exists(temp_pdf):
                        try:
                            os.remove(temp_pdf)
                        except Exception:
                            pass

print("اكتملت عملية معالجة المراجع بنجاح.")
