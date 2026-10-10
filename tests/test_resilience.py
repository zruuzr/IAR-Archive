"""اختبارات طبقات الصمود: المزوّدون والحصص والسجلات الجزئية والإثراء"""
import time
from pathlib import Path

import pytest

import process_books as pb
import validate_books

GOOD = {
    "title": "إدارة الموارد",
    "description": "وصف",
    "category": "إدارة",
    "type": "كتاب",
    "year": 2019,
    "author": "أ",
    "keywords": ["a", "A", "b"],
}


class Err(Exception):
    def __init__(self, message, status=None, retry_after=None):
        super().__init__(message)
        self.status_code = status
        self.retry_after = retry_after


# ------------------------------------------------------------
# Fixtures / helpers
# ------------------------------------------------------------

@pytest.fixture(autouse=True)
def isolated(monkeypatch, tmp_path):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(pb, "AI_CACHE_DIR", tmp_path / "ai_cache")
    monkeypatch.setattr(pb, "ROUND_WAIT_MAX_SECONDS", 10)
    state = {"pool": None, "sleeps": []}

    def fake_sleep(seconds):
        state["sleeps"].append(seconds)
        if state["pool"]:  # time "passes": cool-downs end
            for backend in state["pool"].backends:
                backend.cooldown_until = 0

    monkeypatch.setattr(pb.time, "sleep", fake_sleep)
    return state


def make_backend(kind, name, behaviour):
    backend = pb.Backend(name, kind, "m", None)
    backend.behaviour = behaviour
    return backend


@pytest.fixture
def fake_calls(monkeypatch):
    calls = []

    def fake_call(backend, mode, ctx, sample):
        calls.append((backend.name, mode, sample))
        result = backend.behaviour(backend, mode, ctx, sample)
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr(pb, "call_backend", fake_call)
    return calls


def new_ctx(tmp_path, text="x" * 500, name="book.pdf"):
    path = tmp_path / name
    path.write_bytes(b"%PDF-1.4\n")
    return pb.DocContext(path, "h" * 64, text, pb.Deadline(30)), path


def run(pool, ctx):
    pb.run_ai_pipeline(pool, ctx, None)


# ------------------------------------------------------------
# Error classification
# ------------------------------------------------------------

class TestClassifyError:
    def test_plain_rate_limit(self):
        assert pb.classify_error(Err("x", 429)).kind == "rate"

    def test_daily_quota_from_message(self):
        info = pb.classify_error(Err(
            "Rate limit reached on tokens per day (TPD): "
            "try again in 14m23.5s", 429))
        assert info.kind == "quota_day"
        assert info.retry_after == pytest.approx(14 * 60 + 23.5)

    def test_gemini_daily_quota_marker(self):
        info = pb.classify_error(Err(
            "quota GenerateRequestsPerDayPerProjectPerModel-FreeTier"))
        assert info.kind == "quota_day"

    def test_retry_after_from_message_and_attribute(self):
        assert pb.parse_retry_after(Err("retryDelay': '34s'")) == 34
        assert pb.parse_retry_after(Err("x", retry_after=7)) == 7

    def test_server_errors_are_transient(self):
        assert pb.classify_error(Err("boom", 503)).kind == "transient"

    def test_auth_and_missing_model_are_fatal(self):
        assert pb.classify_error(Err("bad", 401)).kind == "fatal"
        assert pb.classify_error(Err("bad", 403)).kind == "fatal"
        assert pb.classify_error(Err("bad", 404)).kind == "fatal"

    def test_413_is_context(self):
        assert pb.classify_error(Err("Request too large", 413)).kind == "context"

    def test_output_errors(self):
        assert pb.classify_error(pb.AIOutputError("e")).kind == "output"
        assert pb.classify_error(pb.DocumentError("e")).kind == "output"

    def test_number_inside_message_is_not_a_status(self):
        # old code treated any "500" in the text as a server error
        assert pb.classify_error(Err("page 5001234 failed", 400)).kind == "request"


# ------------------------------------------------------------
# Provider chain
# ------------------------------------------------------------

class TestProviderChain:
    def test_outage_gives_no_complete_answer(self, tmp_path, fake_calls):
        pool = pb.BackendPool([
            make_backend("gemini", "g", lambda *a: Err("down", 503)),
            make_backend("groq", "q", lambda *a: Err("down", 503)),
        ])
        ctx, _ = new_ctx(tmp_path)
        run(pool, ctx)
        assert ctx.complete() is None

    def test_daily_quota_fails_over(self, tmp_path, fake_calls):
        pool = pb.BackendPool([
            make_backend("gemini", "g", lambda *a: Err("PerDay quota", 429)),
            make_backend("groq", "q", lambda *a: GOOD),
        ])
        ctx, _ = new_ctx(tmp_path)
        run(pool, ctx)
        assert ctx.complete()[0] == "groq-text"
        assert pool.backends[0].cooldown_until > time.time() + 3600

    def test_partial_answer_moves_to_next_provider(self, tmp_path, fake_calls):
        pool = pb.BackendPool([
            make_backend("gemini", "g", lambda *a: {"title": "T"}),
            make_backend("groq", "q", lambda *a: GOOD),
        ])
        ctx, _ = new_ctx(tmp_path)
        run(pool, ctx)
        assert ctx.complete()[0] == "groq-text"

    def test_best_partial_is_kept(self, tmp_path, fake_calls):
        pool = pb.BackendPool([
            make_backend("gemini", "g", lambda *a: {"title": "T"}),
            make_backend("groq", "q", lambda *a: {"title": "T2", "author": "A"}),
        ])
        ctx, _ = new_ctx(tmp_path)
        run(pool, ctx)
        assert ctx.complete() is None
        assert ctx.best_partial()[1]["title"] == "T2"

    def test_context_error_shrinks_sample(self, tmp_path, fake_calls):
        def behaviour(b, m, c, sample):
            return Err("Request too large", 413) if sample > 10_000 else GOOD

        pool = pb.BackendPool([make_backend("groq", "q", behaviour)])
        ctx, _ = new_ctx(tmp_path, text="y" * 60_000)
        run(pool, ctx)
        assert ctx.complete()
        assert [c[2] for c in fake_calls] == [25_000, 12_500, 6_250]

    def test_short_rate_limit_waits_then_succeeds(
        self, tmp_path, fake_calls, isolated
    ):
        attempts = {"n": 0}

        def flaky(*args):
            attempts["n"] += 1
            return Err("slow down", 429, retry_after=1) if attempts["n"] == 1 else GOOD

        pool = pb.BackendPool([make_backend("groq", "q", flaky)])
        isolated["pool"] = pool
        ctx, _ = new_ctx(tmp_path)
        run(pool, ctx)
        assert ctx.complete() and isolated["sleeps"]

    def test_long_cooldown_falls_back_without_waiting(
        self, tmp_path, fake_calls, isolated
    ):
        pool = pb.BackendPool([
            make_backend("groq", "q", lambda *a: Err("rate", 429, retry_after=900)),
        ])
        ctx, _ = new_ctx(tmp_path)
        run(pool, ctx)
        assert ctx.complete() is None and not isolated["sleeps"]

    def test_bad_key_disables_only_that_backend(self, tmp_path, fake_calls):
        pool = pb.BackendPool([
            make_backend("gemini", "g#1", lambda *a: Err("bad key", 403)),
            make_backend("gemini", "g#2", lambda *a: GOOD),
        ])
        ctx, _ = new_ctx(tmp_path)
        run(pool, ctx)
        assert pool.backends[0].disabled and ctx.complete()

    def test_expired_deadline_makes_no_calls(self, tmp_path, fake_calls):
        pool = pb.BackendPool([make_backend("groq", "q", lambda *a: GOOD)])
        ctx, _ = new_ctx(tmp_path)
        ctx.deadline = pb.Deadline(0)
        run(pool, ctx)
        assert ctx.calls_made == 0

    def test_transient_failures_trip_the_breaker(self, tmp_path, fake_calls):
        backend = make_backend("groq", "q", lambda *a: Err("down", 503))
        pool = pb.BackendPool([backend])
        pool.penalize(backend, pb.ErrorInfo("transient"))
        first = backend.cooldown_until
        pool.penalize(backend, pb.ErrorInfo("transient"))
        assert backend.failures == 2 and backend.cooldown_until > first


# ------------------------------------------------------------
# Heuristics (local, offline)
# ------------------------------------------------------------

class TestHeuristics:
    TEXT = (
        "# عنوان الكتاب الأول\n\nنص تمهيدي.\n\n"
        "الطبعة الأولى ٢٠١٨ ISBN 978-3-16-148410-0"
    )

    def test_title_year_isbn_from_text(self, tmp_path):
        meta = pb.heuristic_metadata(tmp_path / "a.pdf", "h" * 64, self.TEXT, {})
        assert meta["title"] == "عنوان الكتاب الأول"
        assert meta["year"] == 2018
        assert meta["isbn"] == "978-3-16-148410-0"

    def test_empty_fields_stay_empty(self, tmp_path):
        meta = pb.heuristic_metadata(tmp_path / "a.pdf", "h" * 64, self.TEXT, {})
        assert meta["category"] == "" and meta["description"] == ""
        assert meta["type"] == ""

    def test_year_is_not_guessed_without_context(self, tmp_path):
        meta = pb.heuristic_metadata(
            tmp_path / "a.pdf", "h" * 64, "سقطت بغداد عام 1258 وفي 1920 ...", {})
        assert meta["year"] == 0

    def test_pdf_metadata_title_is_cleaned(self, tmp_path):
        meta = pb.heuristic_metadata(
            tmp_path / "x.pdf", "h" * 64, "",
            {"title": "Microsoft Word - دليل الإجراءات.docx", "author": "admin"})
        assert meta["title"] == "دليل الإجراءات" and meta["author"] == ""

    def test_filename_is_the_last_resort(self, tmp_path):
        meta = pb.heuristic_metadata(tmp_path / "دليل_المالية.pdf", "h" * 64, "", {})
        assert meta["title"] == "دليل المالية"

    def test_ai_values_win_over_heuristics(self):
        merged = pb.combine_metadata({"title": "AI", "year": 0}, {"title": "H", "year": 2001})
        assert merged["title"] == "AI" and merged["year"] == 2001


# ------------------------------------------------------------
# process_one_book: never loses a book
# ------------------------------------------------------------

def fake_extraction(monkeypatch, text="# عنوان الكتاب\n\n" + "نص " * 100):
    monkeypatch.setattr(
        pb, "extract_document",
        lambda p: pb.Extraction(text=text, pages=7, meta={}, needs_file_analysis=False),
    )


class TestProcessOneBook:
    def test_total_outage_still_returns_valid_partial_book(
        self, tmp_path, fake_calls, monkeypatch
    ):
        fake_extraction(monkeypatch)
        src = tmp_path / "b.pdf"
        src.write_bytes(b"%PDF-1.4\n")
        pool = pb.BackendPool([make_backend("groq", "q", lambda *a: Err("down", 503))])

        book = pb.process_one_book(src, 5, "a" * 64, "pdf/b.pdf", pool)

        assert book.ai_status == "partial" and book.title == "عنوان الكتاب"
        assert book.ai_attempts == 1 and book.pages == 7
        validate_books.validate_book(book.to_json_dict(), 1, set())

    def test_no_usable_backend_does_not_count_an_attempt(
        self, tmp_path, fake_calls, monkeypatch
    ):
        fake_extraction(monkeypatch)
        src = tmp_path / "b.pdf"
        src.write_bytes(b"%PDF-1.4\n")
        backend = make_backend("groq", "q", lambda *a: GOOD)
        backend.disabled = True

        book = pb.process_one_book(src, 5, "a" * 64, "pdf/b.pdf", pb.BackendPool([backend]))

        assert book.ai_status == "partial" and book.ai_attempts == 0

    def test_complete_book_passes_strict_validation(
        self, tmp_path, fake_calls, monkeypatch
    ):
        fake_extraction(monkeypatch)
        src = tmp_path / "b.pdf"
        src.write_bytes(b"%PDF-1.4\n")
        pool = pb.BackendPool([make_backend("groq", "q", lambda *a: GOOD)])

        book = pb.process_one_book(src, 5, "a" * 64, "pdf/b.pdf", pool)

        assert book.ai_status == "complete" and book.file_type == "PDF"
        validate_books.validate_book(book.to_json_dict(), 1, set())

    def test_missing_type_keeps_record_partial(
        self, tmp_path, fake_calls, monkeypatch
    ):
        fake_extraction(monkeypatch)
        src = tmp_path / "b.pdf"
        src.write_bytes(b"%PDF-1.4\n")
        answer = {k: v for k, v in GOOD.items() if k != "type"}
        pool = pb.BackendPool([make_backend("groq", "q", lambda *a: answer)])

        book = pb.process_one_book(src, 5, "a" * 64, "pdf/b.pdf", pool)

        assert book.ai_status == "partial"
        validate_books.validate_book(book.to_json_dict(), 1, set())

    def test_cached_complete_answer_survives_a_later_outage(
        self, tmp_path, fake_calls, monkeypatch
    ):
        fake_extraction(monkeypatch)
        src = tmp_path / "b.pdf"
        src.write_bytes(b"%PDF-1.4\n")
        up = pb.BackendPool([make_backend("groq", "q", lambda *a: GOOD)])
        pb.process_one_book(src, 1, "c" * 64, "pdf/b.pdf", up)

        down = pb.BackendPool([make_backend("groq", "q", lambda *a: Err("down", 503))])
        book = pb.process_one_book(src, 1, "c" * 64, "pdf/b.pdf", down)

        assert book.ai_status == "complete"

    def test_oversized_file_is_indexed_from_filename_only(
        self, tmp_path, monkeypatch
    ):
        monkeypatch.setattr(pb, "MAX_DOCUMENT_SIZE_MB", 0)
        src = tmp_path / "huge_book.pdf"
        src.write_bytes(b"%PDF-1.4\n" + b"0" * 2048)

        book = pb.process_one_book(src, 3, "d" * 64, "pdf/huge_book.pdf", pb.BackendPool([]))

        assert book.title == "huge book" and book.ai_status == "partial"
        assert book.ai_attempts == pb.MAX_ENRICH_ATTEMPTS


# ------------------------------------------------------------
# Re-enrichment queue
# ------------------------------------------------------------

class TestEnrichmentQueue:
    def record(self, **extra):
        base = {"id": 7, "file_path": "pdf/a.pdf", "source_sha256": "aa",
                "ai_status": "partial", "ai_attempts": 2}
        base.update(extra)
        return base

    def test_partial_records_are_enriched(self):
        by_path, by_hash = pb.existing_book_maps([self.record()])
        assert pb.classify_file("pdf/a.pdf", "aa", by_path, by_hash)[0] == "enrich"

    def test_attempt_limit_and_override(self):
        by_path, by_hash = pb.existing_book_maps([self.record(ai_attempts=99)])
        assert pb.classify_file("pdf/a.pdf", "aa", by_path, by_hash)[0] == "skip"
        assert pb.classify_file(
            "pdf/a.pdf", "aa", by_path, by_hash, retry_partial=True)[0] == "enrich"

    def test_changed_content_is_an_update(self):
        by_path, by_hash = pb.existing_book_maps([self.record()])
        assert pb.classify_file("pdf/a.pdf", "bb", by_path, by_hash)[0] == "update"

    def test_legacy_and_complete_records_are_skipped(self):
        legacy = {"id": 1, "file_path": "pdf/l.pdf", "source_sha256": "ll"}
        by_path, by_hash = pb.existing_book_maps([legacy])
        assert pb.classify_file("pdf/l.pdf", "ll", by_path, by_hash)[0] == "skip"

    def test_enrichment_keeps_curated_fields(self):
        old = self.record(featured=True, title_en="Hand", cover_image="covers/7.png")
        merged = pb.merge_updated_record(old, {
            "id": 99, "featured": False, "title_en": "AI", "title": "new",
            "cover_image": "covers/99.png", "ai_status": "complete"})
        assert merged["id"] == 7 and merged["featured"] is True
        assert merged["title_en"] == "Hand" and merged["title"] == "new"
        assert merged["ai_status"] == "complete"


# ------------------------------------------------------------
# Utilities
# ------------------------------------------------------------

class TestMisc:
    def test_json_repair_free_extraction_of_noisy_answer(self):
        assert pb.extract_json_object('noise {"a": 1} tail') == {"a": 1}

    def test_truncated_json_is_an_output_error(self, monkeypatch):
        monkeypatch.setattr(pb, "json_repair", None)
        with pytest.raises(pb.AIOutputError):
            pb.extract_json_object('{"a": ')

    def test_secrets_are_redacted_in_logs(self, monkeypatch):
        monkeypatch.setattr(pb, "SECRETS", ["sk_secret_123456"])
        assert "sk_secret_123456" not in pb.safe_text("failed with sk_secret_123456!")

    def test_lock_prevents_double_run(self, tmp_path, monkeypatch):
        monkeypatch.setattr(pb, "LOCK_PATH", tmp_path / ".lock")
        pb.acquire_lock()
        with pytest.raises(RuntimeError):
            pb.acquire_lock()
        pb.release_lock()
        pb.acquire_lock()
        pb.release_lock()

    def test_sample_keeps_head_and_tail(self):
        text = "H" * 20_000 + "M" * 50_000 + "T" * 20_000
        block = pb.build_document_block(text)
        assert "H" in block and "T" in block and "omitted" in block
