#!/usr/bin/env python3
"""IAR Archive — cover optimiser.

For every ``covers/<id>.png`` it writes

* ``covers/<id>.webp``      the cover for the site (default: 720 px wide, quality 78),
* ``covers/og/<id>.jpg``    a 1200x630 share card (cover on lapis, gilt edge) used by the
                            Open Graph pages (see ``scripts/generate-og-pages.mjs``),

and, with ``--update-json``, points ``cover_image`` in ``books.json`` to the ``.webp``
(text replace, so the file's formatting and key order are untouched).

It is idempotent: a file is rebuilt only when it is missing or older than its PNG
(use ``--force`` to rebuild all). Needs Pillow:  ``python -m pip install Pillow``.

    python scripts/optimize_covers.py --update-json          # everything
    python scripts/optimize_covers.py --only 12 40            # just these ids
    python scripts/optimize_covers.py --delete-png            # after verifying the .webp
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:  # pragma: no cover - friendly message instead of a traceback
    sys.exit("Pillow is required:  python -m pip install Pillow")

OG_SIZE = (1200, 630)
LAPIS_TOP = (10, 24, 66)
LAPIS_BOTTOM = (23, 52, 124)
GOLD = (226, 184, 78)


def human(size: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} GB"


def stale(target: Path, source: Path, force: bool) -> bool:
    return force or not target.exists() or target.stat().st_mtime < source.stat().st_mtime


def flatten(image: Image.Image) -> Image.Image:
    """RGB copy; transparent covers are put on white (JPEG has no alpha)."""
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        base = Image.new("RGB", image.size, (255, 255, 255))
        base.paste(image, mask=image.getchannel("A"))
        return base
    return image.convert("RGB")


def write_webp(image: Image.Image, target: Path, max_width: int, quality: int) -> None:
    out = image
    if out.width > max_width:
        out = out.resize((max_width, round(out.height * max_width / out.width)), Image.LANCZOS)
    out.save(target, "WEBP", quality=quality, method=6)


def lapis_background() -> Image.Image:
    width, height = OG_SIZE
    base = Image.new("RGB", OG_SIZE)
    pixels = base.load()
    for y in range(height):
        t = y / (height - 1)
        row = tuple(round(a + (b - a) * t) for a, b in zip(LAPIS_TOP, LAPIS_BOTTOM))
        for x in range(width):
            pixels[x, y] = row
    return base


def write_og(image: Image.Image, target: Path) -> None:
    """Cover centred on a lapis card with a gilt hairline and a soft shadow."""
    width, height = OG_SIZE
    card = lapis_background()
    pad = 48
    cover = image.copy()
    cover.thumbnail((width - 2 * pad, height - 2 * pad), Image.LANCZOS)
    x = (width - cover.width) // 2
    y = (height - cover.height) // 2

    shadow = Image.new("RGBA", OG_SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle(
        (x - 2, y + 10, x + cover.width + 2, y + cover.height + 14), fill=(0, 0, 0, 150)
    )
    blurred = shadow.filter(ImageFilter.GaussianBlur(16))
    card.paste(blurred, (0, 0), blurred)
    ImageDraw.Draw(card).rectangle(
        (x - 3, y - 3, x + cover.width + 2, y + cover.height + 2), outline=GOLD, width=2
    )
    card.paste(cover, (x, y))
    card.save(target, "JPEG", quality=84, optimize=True, progressive=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--covers", default="covers", help="covers folder (default: covers)")
    parser.add_argument("--books", default="books.json", help="books.json path (for --update-json)")
    parser.add_argument("--max-width", type=int, default=720)
    parser.add_argument("--quality", type=int, default=78)
    parser.add_argument("--only", nargs="*", help="process only these ids")
    parser.add_argument("--no-og", action="store_true", help="skip the 1200x630 share cards")
    parser.add_argument("--update-json", action="store_true", help="point cover_image to .webp")
    parser.add_argument("--delete-png", action="store_true", help="remove each PNG once its .webp exists")
    parser.add_argument("--force", action="store_true", help="rebuild even if up to date")
    args = parser.parse_args()

    covers = Path(args.covers)
    if not covers.is_dir():
        sys.exit(f"covers folder not found: {covers}")
    og_dir = covers / "og"
    if not args.no_og:
        og_dir.mkdir(exist_ok=True)

    wanted = set(args.only or [])
    sources = sorted(p for p in covers.glob("*.png") if not wanted or p.stem in wanted)
    before = after = made = 0
    failed: list[str] = []

    for png in sources:
        webp = png.with_suffix(".webp")
        og = og_dir / f"{png.stem}.jpg"
        need_webp = stale(webp, png, args.force)
        need_og = not args.no_og and stale(og, png, args.force)
        if need_webp or need_og:
            try:
                with Image.open(png) as raw:
                    flat = flatten(raw) if need_og else None
                    if need_webp:
                        write_webp(raw.convert("RGBA") if raw.mode in ("RGBA", "LA", "P") else raw.convert("RGB"), webp, args.max_width, args.quality)
                    if need_og and flat is not None:
                        write_og(flat, og)
                made += 1
            except Exception as error:  # a damaged PNG must not stop the batch
                failed.append(f"{png.name}: {error}")
                continue
        before += png.stat().st_size
        after += webp.stat().st_size if webp.exists() else png.stat().st_size

    if args.update_json:
        books = Path(args.books)
        text = books.read_text(encoding="utf-8")
        pattern = re.compile(r'("cover_image":\s*"covers/(\d+))\.png"')

        def swap(match: re.Match[str]) -> str:
            ok = (covers / f"{match.group(2)}.webp").exists()
            return f'{match.group(1)}.webp"' if ok else match.group(0)

        updated, count = pattern.subn(swap, text)
        if updated != text:
            books.write_text(updated, encoding="utf-8")
        print(f"books.json: {count} cover_image entries checked, {text != updated and 'updated' or 'unchanged'}")

    if args.delete_png:
        for png in sources:
            if png.with_suffix(".webp").exists():
                png.unlink()

    print(f"{len(sources)} covers, {made} (re)built: {human(before)} -> {human(after)}"
          + (f"  ({100 - after * 100 / before:.0f}% smaller)" if before else ""))
    for line in failed:
        print("FAILED", line, file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
