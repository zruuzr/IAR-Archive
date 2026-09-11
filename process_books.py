import os
import json
import shutil
import tempfile
import zipfile
import re
import time
from google import genai
from google.genai import types
from pypdf import PdfReader

if "GEMINI_API_KEY" not in os.environ:
    raise ValueError("GEMINI_API_KEY environment variable is missing.")

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

JSON_PATH = "books.json"
PDF_DIR = "pdf"
# تم الإبقاء على نموذجك كما طلبت
MODEL_NAME = "gemini-3.6-flash"
MAX_UPLOAD_SIZE_MB = 50
MAX_RETRIES = 5

JSON_SCHEMA_PROMPT = """
أنت مفهرس كتب محترف. مهمتك استخراج بيانات الكتاب الحقيقية بدقة من المحتوى المرفق.

أعد كائن JSON واحد فقط بالهيكل التالي حرفياً وبدون أي تغيير:

{
  "title": "العنوان الحقيقي بالعربية",
  "title_en": "العنوان بالإنجليزية",
  "author": "اسم المؤلف بالعربية أو اتركه فارغاً إذا تعذر إيجاده تماماً",
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

قواعد صارمة جداً:
1. ابحث بدقة عن اسم المؤلف والناشر في صفحات الغلاف أو صفحة الحقوق والملكية الفكرية.
2. تأكد من أن keywords و key_points هي دائماً مصفوفات (Arrays) وليست نصوصاً.
3. لا تكتب أبداً في العنوان "وثيقة نصية" أو "نص مجزأ" أو "غير محدد".
4. أعد فقط كائن JSON واحد بدون أي نص إضافي.
"""

class ApiUnavailableError(Exception):
    pass

def safe_list(value):
    if isinstance(value, list):
        return [str(v) for v in value if v is not None and str(v).strip() != ""]
    if value is None or value == "":
        return []
    return [str(value)]

def fix_zip_filename(name):
    try:
        return name.encode("cp437").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return name

def safe_zip_member(member):
    if not member or member.endswith("/"):
        return False
    normalized = os.path.normpath(member)
    if normalized.startswith("..") or os.path.isabs(normalized):
        return False
    if ".." in normalized.split(os.sep):
        return False
    return True

def extract_zip_files(pdf_dir):
    if not os.path.exists(pdf_dir):
        return

    for file_name in sorted(os.listdir(pdf_dir)):
        if not file_name.lower().endswith(".zip"):
            continue

        zip_path = os.path.join(pdf_dir, file_name)
        print(f"Extracting ZIP archive: {file_name}")

        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                for raw_member in zf.namelist():
                    member = fix_zip_filename(raw_member)
                    if not member.lower().endswith(".pdf"):
                        continue
                    if not safe_zip_member(member):
                        print(f"  Skipped unsafe path: {member}")
                        continue

                    base_name = os.path.basename(member)
                    if not base_name:
                        continue

                    target_path = os.path.join(pdf_dir, base_name)

                    if os.path.exists(target_path):
                        base, ext = os.path.splitext(base_name)
                        counter = 1
                        while os.path.exists(os.path.join(pdf_dir, f"{base}_{counter}{ext}")):
                            counter += 1
                        target_path = os.path.join(pdf_dir, f"{base}_{counter}{ext}")

                    try:
                        with zf.open(raw_member) as source, open(target_path, "wb") as target:
                            shutil.copyfileobj(source, target)
                        print(f"  Extracted: {os.path.basename(target_path)}")
                    except Exception as inner_error:
                        print(f"  Failed to extract {member}: {inner_error}")

            os.remove(zip_path)
            print(f"Removed ZIP archive: {file_name}")

        except zipfile.BadZipFile:
            print(f"Invalid ZIP file (not a zip archive): {file_name}")
        except Exception as e:
            print(f"Error extracting {file_name}: {e}")

def get_file_info(file_path):
    pages_count = 0
    file_size_str = "Unknown"
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

def smart_extract_text(pdf_path, max_pages=30):
    parts = []
    try:
        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        if total_pages == 0:
            return ""

        keywords = ["المؤلف", "author", "الناشر", "publisher", "ISBN", "الطبعة", "edition", "الفصل", "chapter"]
        indices_to_try = set()

        for i in range(min(5, total_pages)):
            indices_to_try.add(i)

        for i in range(max(0, total_pages - 3), total_pages):
            indices_to_try.add(i)

        if total_pages > 15:
            for i in range(5, min(total_pages, 20)):
                try:
                    txt = reader.pages[i].extract_text() or ""
                    low = txt.lower()
                    if any(k.lower() in low for k in keywords):
                        indices_to_try.add(i)
                        if len(indices_to_try) >= max_pages:
                            break
                except Exception:
                    continue

        for i in sorted(indices_to_try):
            try:
                page_text = reader.pages[i].extract_text()
                if page_text and len(page_text.strip()) > 20:
                    parts.append(f"\n--- Page {i+1} ---\n" + page_text)
            except Exception:
                continue

    except Exception as e:
        print(f"Error in smart_extract_text from {pdf_path}: {e}")

    return "\n".join(parts).strip()

def has_meaningful_text(text, min_chars=150):
    if not text or len(text.strip()) < min_chars:
        return False

    stripped = re.sub(r"\s+", "", text)
    if len(stripped) == 0:
        return False

    meaningful_chars = re.findall(r"[A-Za-z0-9\u0600-\u06FF]", text)
    ratio = len(meaningful_chars) / len(stripped)
    return ratio >= 0.25

def extract_json_object(raw_text):
    if not raw_text:
        raise ValueError("Empty response from Gemini.")

    text = raw_text.strip()

    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    first_brace = text.find("{")
    last_brace = text.rfind("}")

    if first_brace == -1 or last_brace == -1 or last_brace <= first_brace:
        raise ValueError("Could not locate a valid JSON object in Gemini response.")

    json_str = text[first_brace:last_brace + 1]
    return json.loads(json_str)

def is_generic_response(book_data, file_name):
    if not isinstance(book_data, dict):
        return True

    title = (book_data.get("title") or "").strip()
    description = (book_data.get("description") or "").strip()

    if not title or len(title) < 2:
        return True

    banned_exact = [
        "غير معروف", "unknown", "unspecified",
        "وثيقة نصية", "نص غير محدد", "نص مجزأ",
        "fragment", "unknown document", "غير محدد"
    ]

    combined = f"{title} {description}".lower()
    for bad in banned_exact:
        if bad.lower() in combined:
            return True

    if not description or len(description) < 10:
        return True

    return False

def build_payload(file_name, sample_text, use_upload=False, uploaded_file=None):
    file_hint = f"\n\nملاحظة: اسم الملف الأصلي هو: {file_name}"
    if use_upload and uploaded_file:
        return [uploaded_file, JSON_SCHEMA_PROMPT + file_hint]
    else:
        return f"{JSON_SCHEMA_PROMPT}{file_hint}\n\nExtracted Text:\n{sample_text[:25000]}"

def is_retryable_error(error):
    error_str = str(error).upper()
    for code in ["503", "429", "500", "502", "504"]:
        if re.search(rf"\b{code}\b", error_str):
            return True
    for kw in ["UNAVAILABLE", "RESOURCE_EXHAUSTED", "DEADLINE_EXCEEDED", "TIMEOUT", "CONNECTION"]:
        if kw in error_str:
            return True
    if isinstance(error, (ConnectionError, TimeoutError)):
        return True
    return False

def call_gemini(contents_payload, max_retries=MAX_RETRIES):
    last_error = None
    # قائمة فترات الانتظار المُحسنة (بالثواني) لتجاوز مشاكل الحد الأقصى للطلبات 429 أو 503
    backoff_delays = [15, 30, 60, 120, 240]

    for attempt in range(1, max_retries + 1):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents_payload,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)
                )
            )
            if response and response.text:
                return response
            last_error = ValueError("Empty response from Gemini")

        except Exception as e:
            last_error = e
            error_str = str(e)

            if is_retryable_error(e):
                if attempt < max_retries:
                    # سحب وقت الانتظار من القائمة بناءً على رقم المحاولة
                    delay = backoff_delays[attempt - 1] if (attempt - 1) < len(backoff_delays) else 240
                    print(f"  Attempt {attempt}/{max_retries} failed (retryable): {error_str[:120]}")
                    print(f"  Waiting {delay}s before retry to allow quota/server recovery...")
                    time.sleep(delay)
                    continue
                else:
                    print(f"  All {max_retries} attempts failed with retryable error.")
                    raise ApiUnavailableError(f"API unavailable after {max_retries} attempts")
            else:
                print(f"  Attempt {attempt}/{max_retries} failed (
