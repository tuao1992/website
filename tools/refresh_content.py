#!/usr/bin/env python3
"""Refreshes the app's bundled content from the live weldrite.in site.

Usage:
    python3 -I tools/refresh_content.py           # fetch live data and rewrite the seed
    python3 -I tools/refresh_content.py --check   # report changes only; exit 1 if stale

Products and categories come from the public WooCommerce Store API and are parsed
by a line-for-line port of app/src/main/java/com/weldrite/app/core/HtmlUtil.kt.
Company info, contact details and the brochure list are curated in app_data.json and
kept as they are (brochure links are checked). The trimmed API responses are written
as unit-test fixtures, and SeedConsistencyTest proves the app's own parser reproduces
this seed exactly, so the two implementations cannot silently drift apart.
"""
import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parent.parent
SEED = ROOT / "app/src/main/assets/app_data.json"
FIXTURES = ROOT / "app/src/test/resources"
STORE_API = "https://weldrite.in/wp-json/wc/store/v1/"
PAGE_SIZE = 100  # the Store API caps per_page at 100
MAX_PAGES = 20
USER_AGENT = "WeldriteAppContentRefresh/1.0"

# --------------------------------------------------------------------------------------
# Port of HtmlUtil.kt — keep the two in step; SeedConsistencyTest enforces it.
# --------------------------------------------------------------------------------------
DEFAULT_HEADERS = ["Size", "Inner Carton", "Master Carton"]
MAX_POINTS = 12

SCRIPT_STYLE = re.compile(r'(?is)<(script|style)\b[^>]*>.*?</\1[ \t\r\n\f]*>')
LI_OPEN = re.compile(r'(?i)<li\b[^>]*>')
BREAK = re.compile(r'(?i)<br\b[^>]*>|</?(?:p|div|ul|ol|li|h[1-6]|tr|table|tbody|thead|tfoot|blockquote)\b[^>]*>')
TAG = re.compile(r'(?s)<[^>]*>')
ENTITY = re.compile(r'&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);')
SPACE_RUN = re.compile(r'[ \t\n\r\f\x0B \u0085 -     　]+')

DESCRIPTION_LABEL = re.compile(r'(?i)^description *(?::|$) *')
USAGE_HEADING = re.compile(r'(?i)^(?:how to (?:apply|use)|directions(?: for use)?|method of (?:application|use)|application method)[ :.\-]*$')
LABEL = re.compile(r'^.{1,40}:$')
BULLET = re.compile(r'^(?:[•·▪●]+ *|[*\-] +)')
SPACE_BEFORE_PUNCT = re.compile(r' +([,;])')
TRAILING = re.compile(r'[ ,;]+$')

ESCAPED_TABLE = re.compile(r'(?i)&lt;table\b')
TABLE = re.compile(r'(?is)<table\b[^>]*>(.*?)(?:</table[ \t\r\n\f]*>|$)')
ROW_BOUNDARY = re.compile(r'(?i)</?tr\b[^>]*>')
CELL = re.compile(r'(?is)<t[dh]\b[^>]*>(.*?)(?=</t[dh][ \t\r\n\f]*>|<t[dh]\b|$)')

NAMED_ENTITIES = {
    "amp": "&", "lt": "<", "gt": ">", "quot": "\"", "apos": "'", "nbsp": " ",
    "ndash": "–", "mdash": "—", "lsquo": "‘", "rsquo": "’", "sbquo": "‚",
    "ldquo": "“", "rdquo": "”", "bdquo": "„", "hellip": "…", "bull": "•", "middot": "·",
    "deg": "°", "prime": "′", "Prime": "″", "times": "×", "divide": "÷", "plusmn": "±",
    "frac12": "½", "frac14": "¼", "frac34": "¾", "sup2": "²", "sup3": "³", "micro": "µ",
    "reg": "®", "trade": "™", "copy": "©", "laquo": "«", "raquo": "»",
}


class Line(NamedTuple):
    text: str
    list_item: bool


class ShortDescription(NamedTuple):
    text: str
    benefits: list
    usage: list


class Table(NamedTuple):
    headers: list
    rows: list


EMPTY_TABLE = Table([], [])


class Description(NamedTuple):
    packaging: Table
    prose: str


def decode_entities(s):
    def repl(m):
        e = m.group(1)
        if e[0] != '#':
            return NAMED_ENTITIES.get(e, m.group(0))
        try:
            cp = int(e[2:], 16) if e[1] in 'xX' else int(e[1:])
        except ValueError:
            return m.group(0)
        if 1 <= cp <= 0x10FFFF and not 0xD800 <= cp <= 0xDFFF:
            return chr(cp)
        return m.group(0)
    return ENTITY.sub(repl, s)


def lines(html):
    if not html or not html.strip():
        return []
    s = SCRIPT_STYLE.sub('', html).replace('\n', ' ')
    s = LI_OPEN.sub('\n\x01', s)
    s = BREAK.sub('\n', s)
    s = decode_entities(TAG.sub('', s))
    out = []
    for raw in s.split('\n'):
        text = normalize_space(raw.replace('\x01', ''))
        if text:
            out.append(Line(text, '\x01' in raw))
    return out


def text(html):
    return ' '.join(line.text for line in lines(html))


def parse_short_description(html):
    benefits, usage, items = [], [], []
    in_usage = False
    label = None

    def flush_label():
        nonlocal label
        if label is None:
            return
        if items:
            benefits.append(f"{label}: {', '.join(items)}")
        label = None
        items.clear()

    for line in lines(html):
        point = clean_point(DESCRIPTION_LABEL.sub('', line.text))
        if not point:
            continue
        if USAGE_HEADING.fullmatch(point):
            flush_label()
            in_usage = True
        elif in_usage:
            usage.append(point)
        elif not line.list_item and LABEL.fullmatch(point):
            flush_label()
            label = point[:-1].strip(' ')
        elif label is not None and line.list_item:
            items.append(point)
        elif label is not None and not items:
            items.append(point)
            flush_label()
        else:
            flush_label()
            benefits.append(point)
    flush_label()
    b = list(dict.fromkeys(benefits))[:MAX_POINTS]
    u = list(dict.fromkeys(usage))[:MAX_POINTS]
    return ShortDescription('\n'.join(b + u), b, u)


def parse_description(html):
    if not html or not html.strip():
        return Description(EMPTY_TABLE, '')
    src = decode_entities(html) if ESCAPED_TABLE.search(html) else html
    match = TABLE.search(src)
    if match is None:
        return Description(EMPTY_TABLE, prose(chunks(src)))
    table = parse_table(match.group(1))
    recovered, leftover = [], []
    for chunk in chunks(src[:match.start()]):
        row = orphan_row(chunk, table)
        if row is not None:
            recovered.append(row)
        else:
            leftover.append(chunk)
    leftover += chunks(src[match.end():])
    packaging = Table(table.headers, recovered + table.rows) if recovered else table
    return Description(packaging, prose(leftover))


def parse_table(inner):
    rows = []
    for chunk in ROW_BOUNDARY.split(inner):
        cells = [cell_text(m.group(1)) for m in CELL.finditer(chunk)]
        if any(cells):
            rows.append(cells)
    if not rows:
        return EMPTY_TABLE
    has_header = any(c.lower() == 'size' for c in rows[0])
    headers = rows[0] if has_header else DEFAULT_HEADERS[:len(rows[0])]
    body = [r for r in (rows[1:] if has_header else rows) if r != headers]
    body = [[r[i] if i < len(r) else '' for i in range(len(headers))] for r in body]
    return Table(headers, body) if body else EMPTY_TABLE


def orphan_row(chunk, table):
    if len(table.headers) != 3:
        return None
    nodes = [n for n in (normalize_space(decode_entities(p)) for p in TAG.split(chunk)) if n]
    if len(nodes) != 2:
        return None
    size, digits = nodes
    if not '0' <= size[0] <= '9' or len(digits) > 12 or any(not '0' <= c <= '9' for c in digits):
        return None
    inner_values = {r[1] for r in table.rows}
    candidates = []
    for i in range(1, len(digits)):
        inner, master = digits[:i], digits[i:]
        if inner not in inner_values or master[0] == '0':
            continue
        a, b = int(inner), int(master)
        if a > 0 and b >= a and b % a == 0:
            candidates.append([size, inner, master])
    return candidates[0] if len(candidates) == 1 else None


def prose(chunk_list):
    kept = []
    for c in chunk_list:
        t = normalize_space(decode_entities(TAG.sub('', c)))
        if len([w for w in t.split(' ') if w]) >= 4 and sum(1 for ch in t if ch.isalpha()) >= 15:
            kept.append(t)
    return '\n'.join(kept)


def chunks(html):
    return BREAK.split(SCRIPT_STYLE.sub('', html).replace('\n', ' '))


def cell_text(html):
    return normalize_space(decode_entities(TAG.sub(' ', html))).strip('` ')


def clean_point(s):
    return TRAILING.sub('', SPACE_BEFORE_PUNCT.sub(r'\1', BULLET.sub('', s))).strip(' ')


def normalize_space(s):
    return SPACE_RUN.sub(' ', s).strip(' ')


# --------------------------------------------------------------------------------------
# Mappers — mirror StoreDto.kt (StoreProductDto/StoreCategoryDto.toDomain).
# --------------------------------------------------------------------------------------
def icon_for_slug(slug):  # mirrors CategoryIcons.forSlug
    if slug in ("abs", "cpvc", "pvc", "upvc"):
        return "solvent"
    return {
        "adhesives": "adhesive", "ball-valve": "valve", "cleaner": "cleaner", "primer": "primer",
        "rubber-lubricant": "lubricant", "teflon-tape": "tape", "waterproofing": "waterproof",
    }.get(slug, "product")


def to_product(p):
    cats = [c for c in (text(t.get("name")) for t in (p.get("categories") or []) if t) if c]
    short = parse_short_description(p.get("short_description"))
    desc = parse_description(p.get("description"))
    images = p.get("images") or []
    return {
        "id": p["id"],
        "name": text(p.get("name")),
        "slug": p.get("slug") or "",
        "sku": p.get("sku") or "",
        "category": cats[0] if cats else "Other",
        "categories": cats,
        "imageUrl": ((images[0] or {}).get("src") or "") if images else "",
        "permalink": p.get("permalink") or "",
        "shortDescription": short.text,
        "benefits": short.benefits,
        "usage": short.usage,
        "packaging": {"headers": desc.packaging.headers, "rows": desc.packaging.rows},
        "description": desc.prose,
    }


def to_category(c):
    slug = c.get("slug") or ""
    return {
        "id": c["id"],
        "name": text(c.get("name")),
        "slug": slug,
        "productCount": c.get("count") or 0,
        "icon": icon_for_slug(slug),
        "imageUrl": (c.get("image") or {}).get("src") or "",
    }


# --------------------------------------------------------------------------------------
# Fetching, fixtures and reporting.
# --------------------------------------------------------------------------------------
def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_products():
    products = []
    for page in range(1, MAX_PAGES + 1):
        batch = fetch_json(f"{STORE_API}products?per_page={PAGE_SIZE}&page={page}")
        products += batch
        if len(batch) < PAGE_SIZE:
            break
    return products


def link_ok(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Range": "bytes=0-0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status in (200, 206)
    except Exception:  # noqa: BLE001 — any failure means the link is unusable
        return False


def trim_product(p):
    """Keeps only the fields StoreProductDto reads, so fixtures stay small and stable."""
    return {
        "id": p["id"], "name": p.get("name"), "slug": p.get("slug"), "sku": p.get("sku"),
        "permalink": p.get("permalink"), "short_description": p.get("short_description"),
        "description": p.get("description"),
        "images": [{"src": i.get("src"), "thumbnail": i.get("thumbnail")} for i in (p.get("images") or []) if i],
        "categories": [{"id": c.get("id"), "name": c.get("name"), "slug": c.get("slug")}
                       for c in (p.get("categories") or []) if c],
    }


def trim_category(c):
    image = c.get("image") or None
    return {
        "id": c["id"], "name": c.get("name"), "slug": c.get("slug"), "count": c.get("count"),
        "image": {"src": image.get("src"), "thumbnail": image.get("thumbnail")} if image else None,
    }


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def report(old, new):
    before = {p["id"]: p for p in old.get("products", [])}
    after = {p["id"]: p for p in new["products"]}
    changes = []
    for pid, p in after.items():
        if pid not in before:
            changes.append(f"  + added    {p['name']} (#{pid})")
        else:
            fields = [k for k in p if p[k] != before[pid].get(k)]
            if fields:
                changes.append(f"  ~ changed  {p['name']} (#{pid}): {', '.join(fields)}")
    for pid, p in before.items():
        if pid not in after:
            changes.append(f"  - removed  {p['name']} (#{pid})")
    if old.get("categories") != new["categories"]:
        changes.append("  ~ categories updated")
    return changes


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="report changes only; exit 1 if the seed is stale")
    args = ap.parse_args()

    old = json.loads(SEED.read_text(encoding="utf-8"))
    raw_products = [trim_product(p) for p in fetch_products()]
    raw_categories = [trim_category(c) for c in fetch_json(f"{STORE_API}products/categories?per_page={PAGE_SIZE}")]
    if not raw_products:
        sys.exit("error: the Store API returned no products — refusing to write an empty seed")

    new = {
        "company": old["company"],
        "contact": old["contact"],
        "categories": [c for c in map(to_category, raw_categories) if c["productCount"] > 0],
        "products": [to_product(p) for p in raw_products],
        "downloads": old["downloads"],
    }
    print(f"Live catalogue: {len(new['products'])} products in {len(new['categories'])} categories")
    for d in new["downloads"]:
        print(f"  brochure {'ok  ' if link_ok(d['url']) else 'DEAD'} {d['url']}")
    changes = report(old, new)
    print("Changes vs bundled seed:" if changes else "Bundled seed is already up to date.")
    print("\n".join(changes))

    if args.check:
        sys.exit(1 if changes else 0)
    dump(SEED, new)
    dump(FIXTURES / "store_products.json", raw_products)
    dump(FIXTURES / "store_categories.json", raw_categories)
    print(f"Wrote {SEED.relative_to(ROOT)} and test fixtures in {FIXTURES.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
