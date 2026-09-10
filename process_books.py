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
MODEL_NAME = "gemini-3.6-flash"
MAX_UPLOAD_SIZE_MB = 20
MAX_RETRIES = 5
INITIAL_BACKOFF = 5

JSON_SCHEMA_PROMPT = """
أنت مفهرس كتب محترف. مهمتك استخراج بيانات الكتاب من المحتوى المرفق، مهما كان المحتوى جزئيًا أو غير مكتمل.

أعد كائن JSON واحد فقط بالهيكل التالي حرفياً:

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

قواعد صارمة جداً:
1. استخرج العنوان من الغلاف أو الترويسة أو الفهرس أو أي مكان.
2. إذا لم تجد المؤلف، اتركه "" — لكن لا تكتب "غير معروف" أو "unknown".
3. لا تكتب أبداً في العنوان "وثيقة نصية" أو "نص مجزأ" أو "غير محدد" أو "fragment" أو "unspecified".
4. إذا كان المحتوى جداول مالية أو إدارية، صنّفه كـ "المحاسبة والمالية" أو "الإدارة" واستخرج أي كلمات مفتاحية مفيدة.
5. حتى لو كان المحتوى ناقصاً، استنتج الموضوع من الكلمات المفتاحية الموجودة في النص.
6. اكتب وصفاً عاماً من 2-3 أسطر يشرح موضوع الكتاب بناءً على المحتوى الفعلي.
7. أعد فقط كائن JSON واحد بدون أي نص إضافي.
"""


class ApiUnavailableError(Exception):
    pass


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
    """استخراج ذكي: أول صفحات + آخر صفحات + صفحات تحتوي على كلمات مفتاحية مهمة."""
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
                if page_text:
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

    meaningful_chars = re.findall(r"[A-Za-z\u0600-\u06FF0-9]", text)
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
    """كشف فقط الاستجابات الفارغة تماماً. نتحمل عناوين جزئية."""
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

    title_low = title.lower().strip()
    if title_low in [b.lower() for b in banned_exact]:
        return True

    for bad in banned_exact:
        if bad.lower() in title_low and len(title_low) < len(bad) + 5:
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
    retryable_codes = ["503", "429", "500", "502", "504", "UNAVAILABLE", "RESOURCE_EXHAUSTED", "DEADLINE_EXCEEDED", "TIMEOUT"]
    return any(code in error_str for code in retryable_codes)


def call_gemini(contents_payload, max_retries=MAX_RETRIES):
    last_error = None

    for attempt in range(1, max_retries + 1):
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
            last_error = ValueError("Empty response from Gemini")

        except Exception as e:
            last_error = e
            error_str = str(e)

            if is_retryable_error(e):
                if attempt < max_retries:
                    delay = INITIAL_BACKOFF * (2 ** (attempt - 1))
                    print(f"  Attempt {attempt}/{max_retries} failed (retryable): {error_str[:120]}")
                    print(f"  Waiting {delay}s before retry...")
                    time.sleep(delay)
                    continue
                else:
                    print(f"  All {max_retries} attempts failed with retryable error.")
                    raise ApiUnavailableError(f"API unavailable after {max_retries} attempts")
            else:
                print(f"  Attempt {attempt}/{max_retries} failed (non-retryable): {error_str[:200]}")
                raise

    if last_error:
        raise ApiUnavailableError(f"API call failed: {last_error}")


def build_fallback_book(file_name):
    """بناء بيانات احتياطية من اسم الملف عند فشل كل المحاولات."""
    base_name = os.path.splitext(file_name)[0]
    clean_title = base_name.replace("_", " ").replace("-", " ").strip()

    return {
        "title": clean_title,
        "title_en": "",
        "author": "",
        "author_en": "",
        "category": "غير مصنف",
        "category_en": "Uncategorized",
        "type": "كتاب",
        "type_en": "Book",
        "description": f"كتاب بعنوان '{clean_title}'. لم تتمكن أداة التحليل من قراءة محتواه بشكل كامل، وقد تم استخدام اسم الملف كعنوان مؤقت.",
        "description_en": f"A book titled '{clean_title}'. The analysis tool could not fully read its content; the filename was used as a temporary title.",
        "publisher": "",
        "publisher_en": "",
        "year": "",
        "isbn": "",
        "keywords": [clean_title],
        "keywords_en": [],
        "key_points": ["يتطلب مراجعة يدوية لاستكمال البيانات."],
        "key_points_en": ["Manual review required to complete metadata."],
        "target_audience": "",
        "target_audience_en": ""
    }


extract_zip_files(PDF_DIR)

if os.path.exists(JSON_PATH):
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            books_data = json.load(f)
    except Exception:
        books_data = []
else:
    books_data = []

existing_files = {os.path.normpath(book.get("file_path", "")) for book in books_data}

api_unavailable = False

if os.path.exists(PDF_DIR):
    for file_name in sorted(os.listdir(PDF_DIR)):
        if not file_name.lower().endswith(".pdf"):
            continue

        file_path = os.path.join(PDF_DIR, file_name)
        normalized_path = os.path.normpath(file_path)

        if normalized_path in existing_files:
            continue

        print(f"\nProcessing new book: {file_name}")

        pages_count, file_size_str = get_file_info(file_path)
        sample_text = smart_extract_text(file_path, max_pages=30)

        text_is_meaningful = has_meaningful_text(sample_text, min_chars=150)
        print(f"  Local text meaningful: {text_is_meaningful} (length: {len(sample_text)} chars)")

        uploaded_file = None
        temp_pdf = None
        new_book = None

        try:
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            can_upload_full = file_size_mb <= MAX_UPLOAD_SIZE_MB

            if text_is_meaningful:
                print("  Strategy 1: Using local extracted text")
                contents_payload = build_payload(file_name, sample_text, use_upload=False)
            elif can_upload_full:
                print(f"  Strategy 1: Uploading full PDF ({file_size_mb:.1f} MB)")
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                    temp_pdf = tmp.name
                shutil.copyfile(file_path, temp_pdf)
                uploaded_file = client.files.upload(file=temp_pdf)
                contents_payload = build_payload(file_name, "", use_upload=True, uploaded_file=uploaded_file)
            else:
                print(f"  File too large ({file_size_mb:.1f} MB), using local text only")
                contents_payload = build_payload(file_name, sample_text, use_upload=False)

            try:
                response = call_gemini(contents_payload)
                new_book = extract_json_object(response.text)
            except ApiUnavailableError:
                api_unavailable = True
                continue

            if is_generic_response(new_book, file_name):
                print("  Generic response. Trying fallback strategy...")

                if not uploaded_file and can_upload_full:
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                        temp_pdf = tmp.name
                    shutil.copyfile(file_path, temp_pdf)
                    uploaded_file = client.files.upload(file=temp_pdf)

                if uploaded_file:
                    fallback_payload = build_payload(file_name, "", use_upload=True, uploaded_file=uploaded_file)
                else:
                    fallback_payload = build_payload(file_name, sample_text, use_upload=False)

                try:
                    response = call_gemini(fallback_payload)
                    new_book = extract_json_object(response.text)
                except ApiUnavailableError:
                    api_unavailable = True
                    continue

                if is_generic_response(new_book, file_name):
                    print(f"  Gemini could not identify the book. Using filename as fallback.")
                    new_book = build_fallback_book(file_name)

            if not isinstance(new_book, dict):
                raise ValueError("Invalid JSON object response.")

            max_id = max((book.get("id", 0) for book in books_data), default=0)
            new_book["id"] = max_id + 1

            new_book["pages"] = pages_count if pages_count else new_book.get("pages", "")
            new_book["file_size"] = file_size_str
            new_book["file_type"] = "PDF"
            new_book["file_path"] = file_path
            new_book["cover_image"] = f"covers/{new_book['id']}.png"

            books_data.append(new_book)
            existing_files.add(normalized_path)

            with open(JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(books_data, f, ensure_ascii=False, indent=2)

            print(f"  Successfully added: {new_book.get('title')}")

        except Exception as e:
            print(f"Error processing file {file_name}: {type(e).__name__}: {e}")

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

if not api_unavailable:
    print("\nProcessing completed successfully.")
else:
    print("\nProcessing completed with API availability issues. Skipped files will be retried.")
