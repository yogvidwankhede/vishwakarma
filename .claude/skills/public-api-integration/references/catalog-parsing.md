# Parsing the public-apis catalog

Source: `https://raw.githubusercontent.com/public-apis/public-apis/master/README.md`

## Structure

`### <Category>` headings open a section; each is followed by a header row, a separator
row, and one row per API:

```
### Animals
API | Description | Auth | HTTPS | CORS
|:---|:---|:---|:---|:---|
| [Cat Facts](https://catfact.ninja/) | Random cat facts | No | Yes | Yes |
| [Cats](https://docs.thecatapi.com/) | Pictures of cats from Tumblr | `apiKey` | Yes | No |
```

## Reference extractor

```python
import re, urllib.request

URL = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
ROW = re.compile(r"^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|(.*)$")

def norm(v):
    v = v.strip().strip("`").strip()
    return v if v else "Unknown"

def load():
    md = urllib.request.urlopen(URL).read().decode("utf-8")
    category, out = None, []
    for line in md.splitlines():
        if line.startswith("### "):
            category = line[4:].strip()
            continue
        m = ROW.match(line)
        if not (m and category):
            continue
        cells = [c.strip() for c in m.group(3).split("|")]
        # cells: description, auth, https, cors, (possibly empty trailing cells)
        out.append({
            "category": category,
            "name": m.group(1),
            "url": m.group(2),
            "description": cells[0] if cells else "",
            "auth": norm(cells[1]) if len(cells) > 1 else "Unknown",
            "https": norm(cells[2]) if len(cells) > 2 else "Unknown",
            "cors": norm(cells[3]) if len(cells) > 3 else "Unknown",
        })
    return out
```

## Ranking

```python
AUTH_RANK  = {"No": 0, "apiKey": 1, "X-Mashape-Key": 1, "OAuth": 2}
CORS_RANK  = {"Yes": 0, "Unknown": 1, "No": 2}

def shortlist(rows, category=None, query=None, allow_key=True):
    c = [r for r in rows if r["https"] == "Yes"]                       # hard filter
    if not allow_key:
        c = [r for r in c if r["auth"] == "No"]
    else:
        c = [r for r in c if AUTH_RANK.get(r["auth"], 3) <= 1]         # drop OAuth
    if category:
        c = [r for r in c if r["category"].lower() == category.lower()]
    if query:
        q = query.lower()
        c = [r for r in c if q in r["name"].lower() or q in r["description"].lower()]
    return sorted(c, key=lambda r: (AUTH_RANK.get(r["auth"], 3), CORS_RANK.get(r["cors"], 3)))[:3]
```

## Known messiness

- Trailing empty cells produce a spurious sixth column. Index defensively.
- A handful of Auth cells contain a "Run In Postman" image link instead of a value.
- `No` appears both bare and backticked; `apiKey` likewise.
- Eleven rows have an empty HTTPS cell — treat as `Unknown` and let the probe decide.
- The APILayer promotional section near the top of the file is not a category. Start
  parsing from the first `### ` heading that has a table under it, and ignore rows whose
  URL host is a tracking or referral domain.

## What the table cannot tell you

Rate limits, quotas, uptime, licence and terms of use, response schema, pagination style,
whether the service still exists. Every one of those is answered by the probe or by the
provider's own docs, and none of them by the row.
