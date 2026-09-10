import os
import json
import shutil
import tempfile
import zipfile
import re
from google import genai
from google.genai import types
from pypdf import PdfReader

if "GEMINI_API_KEY" not in os.environ:
    raise ValueError("GEMINI_API_KEY environment variable is missing.")

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

JSON_PATH = "books.json"
PDF_DIR = "pdf"
MODEL_NAME = "gemini-3.6-flash"

JSON_SCHEMA_PROMPT = """
أنت مفهرس كتب محترف. قم باستخراج بيانات الكتاب الحقيقية من المحتوى المرفق وصغ البيانات داخل JSON يلتزم بالهيكل التالي حرفياً:

{
  "title": "العنوان الحقيقي بالعربية",
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

قواعد صارمة:
1. استخرج العنوان الحقيقي من محتوى الكتاب (الغلاف، الصفحة الأولى، أو الترويسة)، وليس من اسم الملف.
2. إذا لم تجد معلومة معينة (مثل ISBN)، اتركها كنص فارغ "".
3. لا تُعد أبداً بعبارات عامة مثل "وثيقة نصية" أو "نص غير محدد".
4. إذا كان المحتوى غير كافٍ للتعرف على الكتاب، أعد العنوان "غير معروف" مع بقية الحقول فارغة.
5. أعد فقط كائن JSON واحد بدون أي نص إضافي قبله أو بعده.
"""


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


def extract_first_pages_text(pdf_path, max_pages=15):
    """استخراج نص الصفحات الأولى مع كشف نوعية المحتوى."""
    text = ""
    try:
        reader = PdfReader(pdf_path)
        num_pages = min(len(reader.pages), max_pages)
        for i in range(num_pages):
            page_text = reader.pages[i].extract_text()
            if page_text:
                text += f"\n--- Page {i+1} ---\n" + page_text
    except Exception as e:
        print(f"Error extracting text from {pdf_path}: {e}")
    return text.strip()


def has_meaningful_text(text, min_chars=200):
    """التحقق من أن النص المستخرج ذو معنى (يحتوي على نسبة مقبولة من الأحرف العربية/اللاتينية)."""
    if not text or len(text.strip()) < min_chars:
        return False

    # حساب نسبة الأحرف العربية واللاتينية
    letters = re.findall(r"[A-Za-z\u0600-\u06FF]", text)
    total_chars = len(text.replace(" ", "").replace("\n", ""))
    if total_chars == 0:
        return False

    ratio = len(letters) / total_chars
    return ratio >= 0.4


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
    """كشف الاستجابات العامة غير المفيدة من Gemini."""
    if not isinstance(book_data, dict):
        return True

    title = (book_data.get("title") or "").strip()
    description = (book_data.get("description") or "").strip()

    # أنماط عامة تشير إلى فشل التعرف
    generic_patterns = [
        r"وثيقة",
        r"نص غير محدد",
        r"نص مجزأ",
        r"غير معروف",
        r"unspecified",
        r"fragment",
        r"unknown document",
    ]

    combined = f"{title} {description}".lower()
    for pattern in generic_patterns:
        if re.search(pattern, combined):
            return True

    # إذا كان العنوان فارغاً أو مشابهاً لاسم الملف
    if not title or len(title) < 3:
        return True

    return False


def build_payload(file_path, file_name, sample_text, use_upload=False, uploaded_file=None):
    """بناء الحمولة المرسلة إلى Gemini مع تلميح اسم الملف."""
    file_hint = f"\n\nملاحظة: اسم الملف الأصلي هو: {file_name}"

    if use_upload and uploaded_file:
        return [uploaded_file, JSON_SCHEMA_PROMPT + file_hint]
    else:
        return f"{JSON_SCHEMA_PROMPT}{file_hint}\n\nExtracted Text:\n{sample_text[:15000]}"


def call_gemini(contents_payload):
    """استدعاء Gemini مع إعادة محاولة."""
    last_error = None
    for attempt in range(1, 3):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=contents_payload,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            if response and response.text:
                return response
        except Exception as inner_error:
            last_error = inner_error
            print(f"  Attempt {attempt} failed: {inner_error}")
    raise ValueError(f"No valid response after retries. Last error: {last_error}")


# ===== 1. فك ضغط أي ملفات ZIP قبل بدء المعالجة =====
extract_zip_files(PDF_DIR)

# ===== 2. قراءة البيانات الحالية من books.json =====
if os.path.exists(JSON_PATH):
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            books_data = json.load(f)
    except Exception:
        books_data = []
else:
    books_data = []

existing_files = {os.path.normpath(book.get("file_path", "")) for book in books_data}

# ===== 3. معالجة ملفات PDF =====
if os.path.exists(PDF_DIR):
    for file_name in sorted(os.listdir(PDF_DIR)):
        if not file_name.lower().endswith(".pdf"):
            continue

        file_path = os.path.join(PDF_DIR, file_name)
        normalized_path = os.path.normpath(file_path)

        if normalized_path in existing_files:
            continue

        print(f"Processing new book: {file_name}")

        pages_count, file_size_str = get_file_info(file_path)
        sample_text = extract_first_pages_text(file_path, max_pages=15)

        # التحقق من جودة النص المستخرج محلياً
        text_is_meaningful = has_meaningful_text(sample_text, min_chars=200)
        print(f"  Local text meaningful: {text_is_meaningful} (length: {len(sample_text)} chars)")

        uploaded_file = None
        temp_pdf = None

        try:
            # ===== المرحلة 1: محاولة أولى =====
            if text_is_meaningful:
                print("  Strategy 1: Using local extracted text")
                contents_payload = build_payload(file_path, file_name, sample_text, use_upload=False)
            else:
                print("  Strategy 1: Local text insufficient, uploading full PDF")
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    temp_pdf = tmp.name
                shutil.copyfile(file_path, temp_pdf)
                uploaded_file = client.files.upload(file=temp_pdf)
                contents_payload = build_payload(file_path, file_name, "", use_upload=True, uploaded_file=uploaded_file)

            response = call_gemini(contents_payload)
            new_book = extract_json_object(response.text)

            # ===== المرحلة 2: التحقق من جودة الاستجابة =====
            if is_generic_response(new_book, file_name):
                print(f"  Generic/failed response detected. Trying fallback with full PDF upload...")

                # إذا لم نكن قد رفعنا الملف بعد، نرفعه الآن
                if not uploaded_file:
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                        temp_pdf = tmp.name
                    shutil.copyfile(file_path, temp_pdf)
                    uploaded_file = client.files.upload(file=temp_pdf)

                fallback_payload = build_payload(file_path, file_name, "", use_upload=True, uploaded_file=uploaded_file)
                response = call_gemini(fallback_payload)
                new_book = extract_json_object(response.text)

                # إذا كانت الاستجابة الثانية أيضاً عامة، نرفض الملف
                if is_generic_response(new_book, file_name):
                    print(f"  Skipping {file_name}: Gemini could not identify the book content.")
                    continue

            if not isinstance(new_book, dict):
                raise ValueError("Invalid JSON object response.")

            max_id = max((book.get("id", 0) for book in books_data), default=0)
            new_book["id"] = max_id + 1

            new_book["pages"] = pages_count if pages_count else new_book.get("pages")
            new_book["file_size"] = file_size_str
            new_book["file_type"] = "PDF"
            new_book["file_path"] = file_path
            new_book["cover_image"] = f"covers/{new_book['id']}.png"

            books_data.append(new_book)
            existing_files.add(normalized_path)

            with open(JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(books_data, f, ensure_ascii=False, indent=2)

            print(f"Successfully added and saved: {new_book.get('title')}")

        except Exception as e:
            print(f"Error processing file {file_name}: {type(e).__name__}: {e}")
            if 'response' in locals() and response and getattr(response, "text", None):
                print("--- Raw response (first 500 chars) ---")
                print(response.text[:500])
                print("--- End of raw response ---")

        finally:
            if uploaded_file:
                try:
                    client.files.delete(name=uploaded_file.name)
                except Exception:
                    pass
            if temp_pdf and os.path.exists(temp_pdf):
                try:
                    os.remove(temp_pdf)
                except Exception:
                    pass

print("Processing completed successfully.")
