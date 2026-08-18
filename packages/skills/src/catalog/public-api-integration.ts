// Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
// SPDX-License-Identifier: Apache-2.0

import type { SkillManifest } from '../manifest.js'

/**
 * "Find an API for this" looks like a lookup and is actually a selection problem with a
 * verification step, and every failure mode in agent-written integrations comes from
 * treating it as the former.
 *
 * The public-apis catalog is a hand-maintained Markdown table — 1,683 entries across 52
 * categories, with five columns and no sixth. There is no rate limit column, no uptime
 * column, no licence column, and no last-verified column, because a directory is not a
 * registry. An agent that reads a row and starts writing a fetch call has silently
 * assumed all four of the missing facts, and the row it read may describe a service that
 * stopped answering two years ago.
 *
 * Two numbers from the table generate most of the rules below. **CORS is `Unknown` for
 * 977 of the 1,683 entries and `No` for another 150**, so a browser-direct call is
 * unsupported or unverified for roughly two thirds of the catalog; only 297 entries are
 * simultaneously no-auth, HTTPS, and CORS `Yes`. The default architecture is therefore a
 * server-side route, and browser-direct is the exception that has to earn itself with a
 * preflight probe. And **728 entries require an `apiKey`** — which means a signup, a
 * secret, and a class of mistake (key in client bundle, key in git) that is trivially
 * avoidable at integration time and expensive afterwards.
 *
 * So the shape of the work is: state what the interface actually needs, shortlist from the
 * table, *probe the live endpoint before writing any code against it*, pick the
 * architecture from the verified CORS answer rather than the claimed one, put the call
 * behind an adapter so the provider is one file rather than fifty call sites, and design
 * the failure state before the success state — because a third-party API that a project
 * does not pay for is not a dependency it can hold to any promise.
 */
export const publicApiIntegration: SkillManifest = {
  vsm: '1.0',
  id: 'public-api-integration',
  name: 'Public API Integration',
  description:
    'Use when an interface needs live third-party data and no API is chosen yet: selecting from public-apis, probing it, and wiring it safely.',
  version: '1.0.0',
  license: 'Apache-2.0',
  category: 'integration',
  tags: ['api', 'integration', 'public-apis', 'http', 'data-fetching', 'cors', 'secrets'],

  activation: {
    intents: [
      'the interface needs real data from some third-party service and no API has been chosen yet',
      'finding a free or public API for weather, currency, geocoding, sports, images, or similar',
      'wiring a REST endpoint into an app and deciding whether it can be called from the browser',
      'a fetch to a third-party API is failing with a CORS error',
      'an API key needs to be introduced into a project without leaking it',
      'replacing mock or hardcoded data in a prototype with a live source',
      'a third-party API the app depends on has started failing, rate-limiting, or returning a changed shape',
      'evaluating several candidate APIs for the same job and needing to pick one',
    ],
    globs: [
      '**/lib/api/**',
      '**/services/**/*.{ts,tsx,js,jsx}',
      '**/app/api/**/route.{ts,js}',
      '**/pages/api/**/*.{ts,js}',
      '**/*.{adapter,client,provider}.{ts,js}',
      '**/.env*',
    ],
    keywords: [
      'public api',
      'public-apis',
      'free api',
      'third-party api',
      'rest api',
      'api key',
      'cors',
      'preflight',
      'rate limit',
      'fetch',
      'endpoint',
      'proxy route',
      'integrate an api',
    ],
  },

  content: {
    summary:
      'Use when no API is chosen yet: shortlist from the public-apis catalog, probe the endpoint before writing code, route through the server unless verified CORS says otherwise, keep keys off the client, and design the failure state first.',

    body: `# Public API Integration

The source catalog is \`github.com/public-apis/public-apis\` — a Markdown table at
\`README.md\`, fetchable raw from
\`raw.githubusercontent.com/public-apis/public-apis/master/README.md\`. **1,683 entries,
52 categories, five columns: API, Description, Auth, HTTPS, CORS.**

There is no rate-limit column, no uptime column, no licence column, and no
last-verified column. Reading a row and writing a fetch call against it assumes all
four. Treat the table as a *shortlist generator*, never as an integration spec.

> The old \`api.publicapis.org\` JSON service is unreliable and should not be depended on.
> Parse the Markdown; it is the artefact the project actually maintains.

---

## 1. What the columns actually say

| Column | Values in the table | What it means for you |
|---|---|---|
| **Auth** | \`No\` (782) · \`apiKey\` (728) · \`OAuth\` (150) | \`No\` = usable immediately. \`apiKey\` = signup + a secret. \`OAuth\` = a full consent flow; rarely worth it for read-only display data. |
| **HTTPS** | Yes (1,580) · No (92) | \`No\` is disqualifying. Not a preference — a plaintext dependency in a TLS page is a mixed-content block and a tampering surface. |
| **CORS** | Unknown (977) · Yes (545) · No (150) | \`Unknown\` means *nobody checked*, not "probably fine". |

**Only 297 of 1,683 entries are simultaneously no-auth, HTTPS, and CORS \`Yes\`** — under
one in five. That single number decides the architecture below.

Parsing note: rows are not perfectly uniform. Some carry trailing pipes, a few wrap the
Auth value in backticks or embed a Postman button in the cell. Match on
\`^\\|\\s*\\[(name)\\]\\((url)\\)\\s*\\|\` and split the remainder on \`|\`, then normalise —
strip backticks, trim, and treat anything unrecognised as \`Unknown\`.

---

## 2. The pipeline

**Frame → Shortlist → Probe → Architect → Adapt → Degrade → Record.**

### Frame
Write one sentence: *what field does the interface render, at what freshness, for how many
users?* "A weather API" is not a requirement. "Current temperature and condition icon for
one city, refreshed every 10 minutes, on a page with maybe 200 daily views" is — and it
rules out three quarters of the candidates immediately.

### Shortlist
Fetch the raw README, filter to the category, then rank: HTTPS \`Yes\` is a hard filter;
Auth \`No\` beats \`apiKey\` beats \`OAuth\`; CORS \`Yes\` beats \`Unknown\` beats \`No\`. Keep
**three** candidates, not one. The top choice fails the probe often enough that having a
second costs nothing now and saves a round trip later.

### Probe — the step that is always skipped
Before writing a line of integration code, call the real endpoint:

\`\`\`bash
curl -s -o /tmp/probe.json -w '%{http_code} %{time_total}s %{size_download}B\\n' \\
  'https://api.example.com/v1/thing?q=test'
curl -sI 'https://api.example.com/v1/thing?q=test' | grep -iE 'access-control|ratelimit|retry-after'
\`\`\`

You are answering five questions the table cannot: does it still exist, what is the real
response shape, how slow is it, what rate limit headers come back, and does
\`Access-Control-Allow-Origin\` actually appear. **A CORS header that is absent here
overrides a \`Yes\` in the table.** The table drifts; the response does not.

### Architect
- \`Access-Control-Allow-Origin\` present **and** auth is \`No\` → browser-direct is allowed.
- Anything else → **server-side route**. This is the default, and it is the right default
  for two thirds of the catalog. A proxy route also gives you the only place to put
  caching, the key, and a timeout.

### Adapt
One module per provider, exporting a function that returns *your* domain type, not theirs:

\`\`\`ts
export interface Weather { tempC: number; condition: string; observedAt: Date }
export async function getWeather(city: string): Promise<Weather> { /* map here */ }
\`\`\`

Provider fields never leak past this file. Swapping APIs then edits one module instead of
every component that touched \`data.main.temp\`.

### Degrade
Every call gets a timeout, a bounded retry with jitter on 429/5xx only, and a defined
state for *failed* as well as *loading* and *empty*. A free API you do not pay for owes
you nothing; treat unavailability as a normal state, not an exception.

### Record
Note which API was chosen, which two were rejected and why, and what the probe measured.
The next person to hit a failure needs to know whether the alternatives were already
tried.

---

## 3. Running it

The three steps above ship as scripts, so this is a pipeline rather than a reading
exercise. Run them; do not reimplement them.

\`\`\`bash
python3 scripts/find_api.py --need "weather forecast" --no-auth
python3 scripts/probe_api.py --url '<endpoint from the shortlist>' --name weather \\
  --out probe-report.json
python3 scripts/scaffold_client.py --report probe-report.json --out ./src \\
  --env-key WEATHER_API_KEY
\`\`\`

\`find_api.py\` returns candidates, never a decision — it filters HTTPS hard, ranks
relevance from term hits alone, and refuses to let a key-free API look like a match
just because it is convenient. \`probe_api.py\` answers what the table cannot and
writes the report. \`scaffold_client.py\` builds the client from the payload that was
actually observed, so the types describe the response rather than the documentation.

Scaffolding refuses to overwrite without \`--force\`, and \`--dry-run\` prints the plan
first. When the probe verdict is \`server-side-only\` the generated client points at a
route handler rather than the third party, because that is the only arrangement in
which the credential stays off the client.

## 4. Secrets

An \`apiKey\` entry means a secret exists from that moment. It goes in \`.env.local\`,
is read **only** in server code, and \`.env*\` is in \`.gitignore\` before the key is pasted
anywhere. \`NEXT_PUBLIC_\`, \`VITE_\`, and every equivalent prefix ship the value to the
browser — a key behind one of those is public, and rotating it is the only fix.
`,

    references: [
      {
        id: 'catalog-parsing',
        title: 'Parsing and filtering the public-apis catalog',
        answers:
          'How do I turn the README table into a filtered, ranked candidate list, and what does the messy real-world markup look like?',
        content: `# Parsing the public-apis catalog

Source: \`https://raw.githubusercontent.com/public-apis/public-apis/master/README.md\`

## Structure

\`### <Category>\` headings open a section; each is followed by a header row, a separator
row, and one row per API:

\`\`\`
### Animals
API | Description | Auth | HTTPS | CORS
|:---|:---|:---|:---|:---|
| [Cat Facts](https://catfact.ninja/) | Random cat facts | No | Yes | Yes |
| [Cats](https://docs.thecatapi.com/) | Pictures of cats from Tumblr | \`apiKey\` | Yes | No |
\`\`\`

## Reference extractor

\`\`\`python
import re, urllib.request

URL = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"
ROW = re.compile(r"^\\|\\s*\\[([^\\]]+)\\]\\(([^)]+)\\)\\s*\\|(.*)$")

def norm(v):
    v = v.strip().strip("\`").strip()
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
\`\`\`

## Ranking

\`\`\`python
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
\`\`\`

## Known messiness

- Trailing empty cells produce a spurious sixth column. Index defensively.
- A handful of Auth cells contain a "Run In Postman" image link instead of a value.
- \`No\` appears both bare and backticked; \`apiKey\` likewise.
- Eleven rows have an empty HTTPS cell — treat as \`Unknown\` and let the probe decide.
- The APILayer promotional section near the top of the file is not a category. Start
  parsing from the first \`### \` heading that has a table under it, and ignore rows whose
  URL host is a tracking or referral domain.

## What the table cannot tell you

Rate limits, quotas, uptime, licence and terms of use, response schema, pagination style,
whether the service still exists. Every one of those is answered by the probe or by the
provider's own docs, and none of them by the row.
`,
      },
    ],
    assets: [
      {
        path: 'scripts/find_api.py',
        description:
          'Fetch and parse the public-apis catalog, filter by need, auth, HTTPS and CORS, and rank the survivors. Emits a shortlist as JSON; never an integration decision.',
        executable: true,
        content: `#!/usr/bin/env python3
"""
Shortlist candidate APIs from the public-apis catalog.

Fetches the catalog README, parses its Markdown tables, filters by your
constraints, and ranks what survives. The output is a shortlist, never an
integration decision: the catalog has no rate-limit, uptime, licence, or
last-verified column, so a row can be years stale while still reading \`Yes\`.
Every candidate must go through probe_api.py before any code is written.

Usage
  find_api.py --need "weather forecast"
  find_api.py --need "currency rates" --no-auth --cors --json
  find_api.py --category Weather --limit 20

Exit codes
  0  candidates found
  1  nothing matched the constraints
  2  catalog could not be fetched or parsed

Machine-readable JSON on stdout; human status on stderr.

Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
SPDX-License-Identifier: Apache-2.0
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request

CATALOG_URL = "https://raw.githubusercontent.com/public-apis/public-apis/master/README.md"

# A catalog row is: | [Name](url) | Description | Auth | HTTPS | CORS |
ROW = re.compile(
    r"^\\|\\s*\\[(?P<name>[^\\]]+)\\]\\((?P<url>[^)]+)\\)\\s*\\|"
    r"\\s*(?P<desc>[^|]*)\\|"
    r"\\s*(?P<auth>[^|]*)\\|"
    r"\\s*(?P<https>[^|]*)\\|"
    r"\\s*(?P<cors>[^|]*)\\|"
)
HEADING = re.compile(r"^###\\s+(?P<category>.+?)\\s*$")


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": "vishwakarma-find-api"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="replace")


def parse(markdown):
    """Walk the document so each row inherits the ### heading above it."""
    entries, category = [], None
    for line in markdown.splitlines():
        h = HEADING.match(line)
        if h:
            category = h.group("category").strip()
            continue
        m = ROW.match(line)
        if not m:
            continue
        auth = m.group("auth").strip().strip("\`")
        entries.append({
            "name": m.group("name").strip(),
            "url": m.group("url").strip(),
            "description": " ".join(m.group("desc").split()),
            # The catalog writes "No" for none, else apiKey / OAuth / X-Mashape-Key.
            "auth": "none" if auth.lower() in ("no", "") else auth,
            "https": m.group("https").strip().lower() == "yes",
            "cors": m.group("cors").strip().lower(),   # yes | no | unknown
            "category": category or "Uncategorised",
        })
    return entries


def score(entry, terms):
    """
    Rank by where the match landed. Name beats category beats description.

    Relevance is computed from term hits alone. The convenience bonuses below are
    a tiebreak among entries that already matched — folding them into the base
    score would let an unrelated key-free API outrank nothing at all and survive
    the \`> 0\` filter, which is how a search for one thing returns another.
    """
    name = entry["name"].lower()
    desc = entry["description"].lower()
    cat = entry["category"].lower()
    relevance = 0
    for t in terms:
        if t in name:
            relevance += 10
        if t in cat:
            relevance += 5
        if t in desc:
            relevance += 3

    if relevance == 0:
        return 0

    if entry["auth"] == "none":
        relevance += 2
    if entry["cors"] == "yes":
        relevance += 1
    return relevance


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\\n")[1])
    p.add_argument("--need", help="what the interface needs, in your own words")
    p.add_argument("--category", help="restrict to one catalog category")
    p.add_argument("--no-auth", action="store_true", help="only APIs needing no key")
    p.add_argument("--cors", action="store_true", help="only APIs the catalog marks CORS yes")
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--json", action="store_true", help="suppress the human table on stderr")
    args = p.parse_args()

    if not args.need and not args.category:
        p.error("give --need and/or --category")

    try:
        entries = parse(fetch(CATALOG_URL))
    except (urllib.error.URLError, OSError, TimeoutError) as e:
        print(json.dumps({"error": f"catalog fetch failed: {e}"}))
        print(f"error: could not fetch the catalog: {e}", file=sys.stderr)
        return 2

    if not entries:
        print(json.dumps({"error": "catalog parsed to zero entries"}))
        print("error: parsed 0 entries - the catalog format has probably changed",
              file=sys.stderr)
        return 2

    total = len(entries)
    pool = entries

    if args.category:
        c = args.category.lower()
        pool = [e for e in pool if c in e["category"].lower()]
    # HTTPS is not a preference. An API that cannot do TLS is not a candidate.
    pool = [e for e in pool if e["https"]]
    if args.no_auth:
        pool = [e for e in pool if e["auth"] == "none"]
    if args.cors:
        pool = [e for e in pool if e["cors"] == "yes"]

    if args.need:
        terms = [t for t in re.split(r"\\W+", args.need.lower()) if len(t) > 2]
        scored = [(score(e, terms), e) for e in pool]
        pool = [e for s, e in sorted(scored, key=lambda x: -x[0]) if s > 0]

    shortlist = pool[: args.limit]
    out = {
        "catalog_entries": total,
        "after_filters": len(pool),
        "returned": len(shortlist),
        "next_step": "probe_api.py --url <endpoint> before writing any code",
        "candidates": shortlist,
    }
    print(json.dumps(out, indent=2))

    if not args.json:
        print(f"\\ncatalog: {total} entries -> {len(pool)} match -> showing {len(shortlist)}\\n",
              file=sys.stderr)
        for e in shortlist:
            flags = []
            if e["auth"] == "none":
                flags.append("no-key")
            else:
                flags.append(e["auth"])
            flags.append(f"cors:{e['cors']}")
            print(f"  {e['name']:<28} [{', '.join(flags)}]  {e['category']}", file=sys.stderr)
            print(f"    {e['description'][:96]}", file=sys.stderr)
            print(f"    {e['url']}", file=sys.stderr)
        print("\\nThe catalog has no rate-limit, uptime, or last-verified column.",
              file=sys.stderr)
        print("Probe before you integrate: probe_api.py --url <endpoint>", file=sys.stderr)

    if not shortlist:
        print("nothing matched - loosen the filters", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      },
      {
        path: 'scripts/probe_api.py',
        description:
          'Call a candidate endpoint for real: status, latency spread, observed CORS header, rate-limit headers, and an inferred schema of the actual payload. Emits the probe report the scaffolder consumes.',
        executable: true,
        content: `#!/usr/bin/env python3
"""
Probe a candidate endpoint before any integration code is written.

Answers the five questions the public-apis table cannot: does it still exist,
what is the real response shape, how slow is it, what rate-limit headers come
back, and does Access-Control-Allow-Origin actually appear. A CORS header that
is absent here overrides a \`Yes\` in the catalog — the table drifts, the
response does not.

Emits a probe report that scaffold_client.py consumes, so the generated types
come from the observed payload rather than from documentation.

Usage
  probe_api.py --url 'https://api.example.com/v1/thing?q=test'
  probe_api.py --url '...' --header 'X-API-Key: abc' --name weather
  probe_api.py --url '...' --runs 3 --out probe-report.json

Exit codes
  0  endpoint answered 2xx with a parseable JSON body
  1  endpoint reachable but unusable (non-2xx, non-JSON, or empty)
  2  endpoint unreachable

Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
SPDX-License-Identifier: Apache-2.0
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

RATE_HEADERS = re.compile(r"^(x-)?rate-?limit|^retry-after|^x-ratelimit", re.I)


def infer(value, depth=0):
    """
    Describe a JSON value as a type tree scaffold_client can render.

    Arrays are described by their first element and a homogeneity flag, because a
    generated type that claims T[] when the array is heterogeneous produces code
    that type-checks and then fails at runtime on element two.
    """
    if depth > 6:
        return {"type": "unknown", "note": "nesting deeper than 6 levels not inferred"}
    if value is None:
        return {"type": "null", "nullable": True}
    if isinstance(value, bool):
        return {"type": "boolean"}
    if isinstance(value, int):
        return {"type": "number", "format": "integer"}
    if isinstance(value, float):
        return {"type": "number"}
    if isinstance(value, str):
        fmt = None
        if re.match(r"^\\d{4}-\\d{2}-\\d{2}([T ]\\d{2}:\\d{2})?", value):
            fmt = "date-time"
        elif re.match(r"^https?://", value):
            fmt = "uri"
        return {"type": "string", **({"format": fmt} if fmt else {}), "example": value[:60]}
    if isinstance(value, list):
        if not value:
            return {"type": "array", "items": {"type": "unknown"}, "empty_in_sample": True}
        kinds = {type(v).__name__ for v in value}
        return {
            "type": "array",
            "items": infer(value[0], depth + 1),
            "homogeneous": len(kinds) == 1,
            "sample_length": len(value),
        }
    if isinstance(value, dict):
        return {
            "type": "object",
            "properties": {k: infer(v, depth + 1) for k, v in list(value.items())[:40]},
            "truncated": len(value) > 40,
        }
    return {"type": "unknown"}


def call(url, headers, method, timeout):
    req = urllib.request.Request(url, method=method)
    req.add_header("User-Agent", "vishwakarma-probe")
    req.add_header("Origin", "https://vishwakarma.probe.invalid")   # provoke a CORS header
    for h in headers:
        if ":" in h:
            k, v = h.split(":", 1)
            req.add_header(k.strip(), v.strip())
    t0 = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read()
            return {
                "status": r.status,
                "elapsed_ms": round((time.monotonic() - t0) * 1000),
                "headers": {k.lower(): v for k, v in r.headers.items()},
                "body": body,
            }
    except urllib.error.HTTPError as e:
        return {
            "status": e.code,
            "elapsed_ms": round((time.monotonic() - t0) * 1000),
            "headers": {k.lower(): v for k, v in (e.headers or {}).items()},
            "body": e.read(),
        }


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\\n")[1])
    p.add_argument("--url", required=True)
    p.add_argument("--header", action="append", default=[], help="repeatable, 'K: V'")
    p.add_argument("--method", default="GET")
    p.add_argument("--timeout", type=float, default=10.0)
    p.add_argument("--runs", type=int, default=2, help="repeat to see latency spread")
    p.add_argument("--name", help="short identifier used by the scaffolder")
    p.add_argument("--out", help="write the report here as well as stdout")
    args = p.parse_args()

    if not args.url.startswith("https://"):
        print(json.dumps({"error": "refusing a non-HTTPS endpoint"}))
        print("error: endpoint is not https - not a candidate", file=sys.stderr)
        return 1

    attempts = []
    for _ in range(max(1, args.runs)):
        try:
            attempts.append(call(args.url, args.header, args.method, args.timeout))
        except (urllib.error.URLError, OSError, TimeoutError) as e:
            print(json.dumps({"error": f"unreachable: {e}", "url": args.url}))
            print(f"error: unreachable - {e}", file=sys.stderr)
            return 2

    last = attempts[-1]
    latencies = sorted(a["elapsed_ms"] for a in attempts)
    hdrs = last["headers"]

    parsed, parse_error = None, None
    try:
        parsed = json.loads(last["body"].decode("utf-8", errors="replace"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        parse_error = str(e)

    acao = hdrs.get("access-control-allow-origin")
    rate = {k: v for k, v in hdrs.items() if RATE_HEADERS.match(k)}
    ok = 200 <= last["status"] < 300 and parsed is not None

    name = args.name or re.sub(r"\\W+", "-", urllib.parse.urlparse(args.url).netloc).strip("-")

    report = {
        "name": name,
        "url": args.url,
        "method": args.method,
        "ok": ok,
        "status": last["status"],
        "latency_ms": {"min": latencies[0], "max": latencies[-1], "runs": len(latencies)},
        "content_type": hdrs.get("content-type", ""),
        "bytes": len(last["body"]),
        "cors": {
            "allow_origin": acao,
            # The catalog's CORS column is a claim. This is the observation.
            "browser_callable": acao in ("*", "https://vishwakarma.probe.invalid"),
        },
        "rate_limit_headers": rate,
        "auth_used": bool(args.header),
        "schema": infer(parsed) if parsed is not None else None,
        "parse_error": parse_error,
        "verdict": (
            "unusable" if not ok
            else "client-callable" if acao in ("*", "https://vishwakarma.probe.invalid") and not args.header
            else "server-side-only"
        ),
    }
    print(json.dumps(report, indent=2))
    if args.out:
        with open(args.out, "w") as f:
            json.dump(report, f, indent=2)

    v = report["verdict"]
    print(f"\\n{name}: HTTP {report['status']}  "
          f"{latencies[0]}-{latencies[-1]}ms  {report['bytes']}B", file=sys.stderr)
    print(f"  CORS allow-origin: {acao or 'absent'}  -> {v}", file=sys.stderr)
    if rate:
        print(f"  rate-limit headers: {', '.join(rate)}", file=sys.stderr)
    else:
        print("  rate-limit headers: none advertised - assume a low unpublished quota",
              file=sys.stderr)
    if v == "server-side-only":
        print("  route this through a server handler; a browser call will be blocked "
              "or would expose the key", file=sys.stderr)
    if not ok:
        print(f"  unusable: {parse_error or 'non-2xx status'}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      },
      {
        path: 'scripts/scaffold_client.py',
        description:
          'Generate a typed TypeScript client, a React hook with loading/error/empty states, and — when the probe says server-side-only — a route handler that keeps the credential off the client.',
        executable: true,
        content: `#!/usr/bin/env python3
"""
Generate a typed TypeScript client and React hook from a probe report.

The types come from the payload probe_api.py actually observed, not from the
provider's documentation, because documentation drifts and the response does
not. The generated client returns a domain type you own, so no provider-shaped
field reaches a component and swapping providers later touches one file.

When the probe says \`server-side-only\` the browser cannot call the endpoint —
either CORS is absent or a key is involved — so a route handler is emitted and
the client points at that instead of at the third party.

Usage
  scaffold_client.py --report probe-report.json --out ./src
  scaffold_client.py --report probe-report.json --out ./src --dry-run
  scaffold_client.py --report probe-report.json --out ./src --force

Exit codes
  0  files written (or, with --dry-run, would be written)
  1  refused: a target exists and --force was not given
  2  bad or unusable report

Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
SPDX-License-Identifier: Apache-2.0
"""

import argparse
import json
import os
import re
import sys

RESERVED = {"default", "function", "class", "interface", "return", "new", "delete"}


def pascal(s):
    parts = [p for p in re.split(r"[^A-Za-z0-9]+", s) if p]
    return "".join(p[:1].upper() + p[1:] for p in parts) or "Resource"


def camel(s):
    p = pascal(s)
    return p[:1].lower() + p[1:]


def prop_key(k):
    """Quote any key that is not a plain identifier, so the emitted TS parses."""
    return k if re.match(r"^[A-Za-z_$][A-Za-z0-9_$]*$", k) and k not in RESERVED else f'"{k}"'


def ts_type(node, name, interfaces, depth=0):
    """
    Render a schema node as a TS type, hoisting nested objects into named
    interfaces so the result is readable rather than one deep inline literal.
    """
    t = node.get("type")
    if t == "string":
        return "string"
    if t == "number":
        return "number"
    if t == "boolean":
        return "boolean"
    if t == "null":
        return "null"
    if t == "array":
        items = node.get("items", {})
        if items.get("type") == "unknown":
            return "unknown[]"
        inner = ts_type(items, name + "Item", interfaces, depth + 1)
        # A heterogeneous sample means T[] would be a lie.
        return f"{inner}[]" if node.get("homogeneous", True) else "unknown[]"
    if t == "object":
        iface = pascal(name)
        lines = []
        for k, v in node.get("properties", {}).items():
            child = ts_type(v, f"{name}-{k}", interfaces, depth + 1)
            optional = "?" if v.get("nullable") else ""
            fmt = v.get("format")
            if fmt == "date-time":
                lines.append(f"  /** ISO 8601 in the observed payload. */")
            elif fmt == "uri":
                lines.append(f"  /** URL in the observed payload. */")
            lines.append(f"  {prop_key(k)}{optional}: {child}")
        if node.get("truncated"):
            lines.append("  // Probe sampled the first 40 keys; more may exist.")
        body = "\\n".join(lines) or "  [key: string]: unknown"
        interfaces[iface] = f"export interface {iface} {{\\n{body}\\n}}"
        return iface
    return "unknown"


CLIENT = '''// Generated by Vishwakarma scaffold_client.py from a live probe of:
//   {url}
// Probed {status} in {lat}ms, {bytes} bytes. Verdict: {verdict}.
// Types describe the payload as observed, not as documented. Re-probe and
// regenerate if the provider changes shape.

{interfaces}
{root_decl}

export class {root}Error extends Error {{
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {{
    super(message)
    this.name = '{root}Error'
  }}
}}

const ENDPOINT = {endpoint}
const TIMEOUT_MS = 5_000
const MAX_ATTEMPTS = 3

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Retry only what retrying can fix. A 404 or a 401 will answer the same way
 * every time, so repeating it just multiplies latency before the same failure.
 */
function retryable(status: number): boolean {{
  return status === 429 || status >= 500
}}

export async function fetch{root}(init?: RequestInit): Promise<{root}> {{
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {{
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {{
      const response = await fetch(ENDPOINT, {{
        ...init,
        signal: controller.signal,
        headers: {{ Accept: 'application/json', ...init?.headers }},
      }})

      if (!response.ok) {{
        const canRetry = retryable(response.status)
        if (canRetry && attempt < MAX_ATTEMPTS) {{
          // Honour Retry-After when the server sends one; it knows better than we do.
          const after = Number(response.headers.get('retry-after'))
          const backoff = Number.isFinite(after) && after > 0
            ? after * 1000
            : 2 ** attempt * 100 + Math.random() * 100
          await sleep(backoff)
          continue
        }}
        throw new {root}Error(
          \`{name} responded \${{response.status}}\`,
          response.status,
          canRetry,
        )
      }}

      return (await response.json()) as {root}
    }} catch (error) {{
      lastError = error
      if (error instanceof {root}Error) throw error
      // An abort is a timeout here, and a timeout is worth one more try.
      if (attempt < MAX_ATTEMPTS) {{
        await sleep(2 ** attempt * 100 + Math.random() * 100)
        continue
      }}
    }} finally {{
      clearTimeout(timer)
    }}
  }}

  throw new {root}Error(
    \`{name} unreachable after \${{MAX_ATTEMPTS}} attempts: \${{String(lastError)}}\`,
    undefined,
    true,
  )
}}
'''

HOOK = '''// Generated by Vishwakarma scaffold_client.py.
'use client'

import {{ useCallback, useEffect, useRef, useState }} from 'react'
import {{ fetch{root}, {root}Error, type {root} }} from '{import_path}'

/**
 * Every state a caller must render. \`isEmpty\` is separate from \`data === null\`
 * because a successful response carrying nothing is a different screen from a
 * request that has not resolved, and collapsing them produces a spinner that
 * never stops.
 */
export interface Use{root}Result {{
  data: {root} | null
  error: {root}Error | null
  isLoading: boolean
  isEmpty: boolean
  refetch: () => void
}}

function isEmptyPayload(value: {root} | null): boolean {{
  if (value === null) return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}}

export function use{root}(): Use{root}Result {{
  const [data, setData] = useState<{root} | null>(null)
  const [error, setError] = useState<{root}Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  // Guards against setting state after unmount, and against an earlier slow
  // response overwriting a later fast one.
  const current = useRef(0)

  useEffect(() => {{
    const run = ++current.current
    setIsLoading(true)
    setError(null)

    fetch{root}()
      .then((result) => {{
        if (current.current !== run) return
        setData(result)
      }})
      .catch((cause) => {{
        if (current.current !== run) return
        setError(
          cause instanceof {root}Error
            ? cause
            : new {root}Error(String(cause)),
        )
      }})
      .finally(() => {{
        if (current.current !== run) return
        setIsLoading(false)
      }})

    return () => {{
      current.current++
    }}
  }}, [nonce])

  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  return {{ data, error, isLoading, isEmpty: !isLoading && isEmptyPayload(data), refetch }}
}}
'''

ROUTE = '''// Generated by Vishwakarma scaffold_client.py.
// The probe found no usable Access-Control-Allow-Origin{key_clause}, so the
// browser cannot call this endpoint directly. This handler keeps the call —
// and any credential — on the server.

import {{ NextResponse }} from 'next/server'

const UPSTREAM = '{url}'

export async function GET() {{
  try {{
    const response = await fetch(UPSTREAM, {{
      headers: {{
        Accept: 'application/json',{auth_header}
      }},
      // Cache briefly so a burst of readers costs the provider one call.
      next: {{ revalidate: 60 }},
    }})

    if (!response.ok) {{
      return NextResponse.json(
        {{ error: '{name} upstream error' }},
        {{ status: response.status === 429 ? 429 : 502 }},
      )
    }}

    return NextResponse.json(await response.json())
  }} catch {{
    return NextResponse.json({{ error: '{name} unreachable' }}, {{ status: 504 }})
  }}
}}
'''


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\\n")[1])
    p.add_argument("--report", required=True)
    p.add_argument("--out", default="./src", help="source root to write into")
    p.add_argument("--env-key", help="env var name holding the API key")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--force", action="store_true", help="overwrite existing files")
    args = p.parse_args()

    try:
        with open(args.report) as f:
            r = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(json.dumps({"error": f"cannot read report: {e}"}))
        print(f"error: {e}", file=sys.stderr)
        return 2

    if not r.get("ok") or not r.get("schema"):
        print(json.dumps({"error": "report is not ok - probe the endpoint successfully first"}))
        print(f"error: probe verdict was '{r.get('verdict')}' - nothing to scaffold",
              file=sys.stderr)
        return 2

    name = r["name"]
    root = pascal(name)
    server_only = r["verdict"] == "server-side-only"

    interfaces = {}
    root_src = ts_type(r["schema"], name, interfaces)

    # ts_type names a root object interface after the skill, so emitting an alias
    # as well would declare the same identifier twice. Alias only when the root is
    # an array or a primitive, where there is no interface to collide with.
    iface_block = "\\n\\n".join(interfaces.values())
    if root_src == root:
        root_decl = ""
    else:
        root_decl = (
            "\\n/** What this module promises callers. "
            "Rename fields here, not at call sites. */\\n"
            f"export type {root} = {root_src}\\n"
        )

    route_path = f"/api/{re.sub(r'[^a-z0-9-]+', '-', name.lower()).strip('-')}"
    endpoint = f"'{route_path}'" if server_only else f"'{r['url']}'"

    client = CLIENT.format(
        url=r["url"], status=r["status"], lat=r["latency_ms"]["max"],
        bytes=r["bytes"], verdict=r["verdict"], interfaces=iface_block,
        root=root, root_decl=root_decl, name=name, endpoint=endpoint,
    )
    hook = HOOK.format(root=root, import_path=f"@/lib/api/{name}")

    planned = {
        os.path.join(args.out, "lib", "api", f"{name}.ts"): client,
        os.path.join(args.out, "hooks", f"use{root}.ts"): hook,
    }

    if server_only:
        auth = ""
        key_clause = ""
        if args.env_key:
            auth = f"\\n        Authorization: \`Bearer \${{process.env.{args.env_key}}}\`,"
            key_clause = " and a key is required"
        planned[os.path.join(args.out, "app", "api",
                             route_path.split("/")[-1], "route.ts")] = ROUTE.format(
            url=r["url"], name=name, auth_header=auth, key_clause=key_clause)

    existing = [p for p in planned if os.path.exists(p)]
    if existing and not args.force and not args.dry_run:
        print(json.dumps({"error": "targets exist", "paths": existing}))
        print("refusing to overwrite:", file=sys.stderr)
        for e in existing:
            print(f"  {e}", file=sys.stderr)
        print("re-run with --force, or --dry-run to see the output first", file=sys.stderr)
        return 1

    written = []
    for path, contents in planned.items():
        if args.dry_run:
            written.append(path)
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(contents)
        written.append(path)

    env_line = None
    if args.env_key:
        env_line = f"{args.env_key}="
        env_path = os.path.join(os.path.dirname(args.out.rstrip("/")) or ".", ".env.example")
        if not args.dry_run:
            prior = ""
            if os.path.exists(env_path):
                with open(env_path) as f:
                    prior = f.read()
            if args.env_key not in prior:
                with open(env_path, "a") as f:
                    f.write(("" if prior.endswith("\\n") or not prior else "\\n") + env_line + "\\n")
                written.append(env_path)

    out = {
        "name": name, "root_type": root, "verdict": r["verdict"],
        "server_side_only": server_only, "dry_run": args.dry_run,
        "written": written, "env_entry": env_line,
        "interfaces": sorted(interfaces),
    }
    print(json.dumps(out, indent=2))

    verb = "would write" if args.dry_run else "wrote"
    print(f"\\n{verb} {len(written)} file(s) for '{name}' ({root}):", file=sys.stderr)
    for w in written:
        print(f"  {w}", file=sys.stderr)
    if server_only:
        print(f"\\n  Probe said server-side-only, so calls go through {route_path}",
              file=sys.stderr)
        if not args.env_key:
            print("  No --env-key given: add the credential to the route handler yourself.",
                  file=sys.stderr)
    print(f"\\n  Import:  import {{ use{root} }} from '@/hooks/use{root}'", file=sys.stderr)
    print("  Render loading, error, and empty before shipping - all three are in the hook.",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
`,
      },
    ],
  },

  rules: [
    {
      id: 'public-api/reject-plaintext',
      strength: 'must-not',
      statement:
        'Integrate an API whose HTTPS column is `No`, or any endpoint that answers only over http://.',
      evidence: {
        rationale:
          'A plaintext dependency inside an HTTPS page is blocked as mixed content by every current browser, so it fails outright in production even when it works in local development. Where it is not blocked — a server-side call — the response is modifiable in transit by anything on the path, which means the interface renders attacker-controlled data.',
        confidence: 'established',
      },
      examples: {
        language: 'text',
        bad: 'Row: | [SomeAPI](http://api.example.com) | ... | No | No | Unknown |  → integrated anyway',
        good: 'HTTPS column is `No` → discard the candidate and take the next one on the shortlist.',
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/probe-before-integrating',
      strength: 'must',
      statement:
        'Call the live endpoint and inspect status, body shape, latency, and response headers before writing any integration code against it.',
      evidence: {
        rationale:
          'The catalog carries no last-verified field, so a row is evidence that an API existed when someone added it and nothing more. The probe is also the only source for the four facts the table omits entirely — real response shape, rate limit headers, latency, and whether CORS headers are actually sent — and each of those changes the code you would write.',
        confidence: 'established',
      },
      examples: {
        language: 'bash',
        bad: '// table says CORS: Yes\nconst r = await fetch(url)  // written before anyone called the endpoint',
        good: "curl -s -o /tmp/p.json -w '%{http_code} %{time_total}s\\n' 'https://api.example.com/v1/thing'\ncurl -sI 'https://api.example.com/v1/thing' | grep -i 'access-control\\|ratelimit'",
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/server-side-by-default',
      strength: 'must',
      statement:
        'Route third-party calls through a server-side handler unless the probe showed an `Access-Control-Allow-Origin` header and the API needs no key.',
      evidence: {
        rationale:
          'CORS is Unknown for 977 of the 1,683 catalogued entries and No for 150, so browser-direct is unsupported or unverified for roughly two thirds of the catalog and a Yes in the table is a claim rather than a measurement. The server route is also the only place that can hold the key, the cache, and the timeout, so choosing it by default collapses four decisions into one.',
        confidence: 'established',
      },
      exceptions: [
        'A probe confirmed the CORS header and the API requires no credential — then browser-direct removes a hop and a server dependency.',
      ],
      verifiedBy: 'security-review',
    },
    {
      id: 'public-api/never-expose-keys',
      strength: 'must-not',
      statement:
        'Place an API key in client-side code, in a client-exposed environment variable (NEXT_PUBLIC_, VITE_, REACT_APP_), or in a committed file.',
      evidence: {
        rationale:
          'Build-time inlining means a prefixed variable is a literal string in the shipped bundle, readable by anyone who opens the network tab — the prefix is an explicit declaration that the value is public, not a naming convention. A committed key stays in git history after deletion, so the only real remediation is rotation, and that is a task nobody schedules until the quota is already exhausted by someone else.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'const key = process.env.NEXT_PUBLIC_WEATHER_KEY  // shipped to the browser',
        good: '// app/api/weather/route.ts — server only\nconst key = process.env.WEATHER_API_KEY',
      },
      verifiedBy: 'security-review',
    },
    {
      id: 'public-api/adapter-boundary',
      strength: 'must',
      statement:
        'Wrap every third-party call in one module that returns a domain type you define, so no provider-shaped field reaches a component.',
      evidence: {
        rationale:
          'Free APIs are the dependencies most likely to disappear, rate-limit, or change shape without notice, and the cost of that event is set entirely by how many files mention their field names. An adapter makes the swap a single-file edit and makes the response shape mockable in tests without a network.',
        confidence: 'strong',
      },
      examples: {
        language: 'ts',
        bad: "<span>{data.main.temp}</span>  // OpenWeather's shape, in a component",
        good: 'const weather = await getWeather(city)   // Weather { tempC, condition, observedAt }\n<span>{weather.tempC}</span>',
      },
      verifiedBy: 'resilience-review',
    },
    {
      id: 'public-api/design-the-failure-state',
      strength: 'must',
      statement:
        'Give every third-party call an explicit timeout, a bounded retry with jitter on 429 and 5xx only, and a designed failed state alongside loading and empty.',
      evidence: {
        rationale:
          'An unpaid third-party API owes the project no availability, so failure is a normal operating state rather than an exception, and an interface with no failed state renders a spinner forever when it occurs. Retrying on 4xx other than 429 cannot succeed — the request is wrong, not unlucky — and retrying without jitter synchronises every client into a thundering herd against a service that is already struggling.',
        confidence: 'established',
      },
      examples: {
        language: 'ts',
        bad: 'const r = await fetch(url)          // no timeout, no retry policy, no failed state',
        good: 'const r = await fetch(url, { signal: AbortSignal.timeout(5000) })\n// retry 429/5xx only, 2 attempts, backoff * (1 + Math.random() * 0.3)',
      },
      verifiedBy: 'resilience-review',
    },
    {
      id: 'public-api/verify-terms-before-shipping',
      strength: 'must',
      statement:
        "Read the provider's own terms, quota, and attribution requirements before shipping, and record what they say.",
      evidence: {
        rationale:
          'The catalog has no licence or rate-limit column, so a row cannot tell you whether commercial use is permitted, whether attribution is required, or how many requests a day are free. Discovering any of those after launch means either a takedown or an unplanned migration, and both cost more than the ten minutes the check takes.',
        confidence: 'strong',
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/shortlist-three',
      strength: 'should',
      statement:
        'Carry three candidates through the probe rather than committing to the first matching row.',
      evidence: {
        rationale:
          'Probes fail often enough on a directory with no liveness checking that a single candidate turns a routine step into a restart of the whole selection. The marginal cost of two extra probes is seconds; the cost of re-deriving the shortlist later is the whole task.',
        confidence: 'strong',
      },
      verifiedBy: 'selection-review',
    },
    {
      id: 'public-api/no-speculative-fanout',
      strength: 'must-not',
      statement:
        'Integrate several APIs for the same field "for redundancy" before one has been shown to be insufficient.',
      evidence: {
        rationale:
          'Each additional provider multiplies the failure surface, the response shapes to reconcile, and the secrets to manage, in exchange for redundancy the interface has not yet been shown to need. Fallback chains are also the code least likely to be exercised, so the second provider is usually broken by the time the first one fails.',
        confidence: 'opinion',
      },
      exceptions: [
        'A measured availability requirement exists and the primary has been observed to miss it.',
      ],
      verifiedBy: 'resilience-review',
    },
    {
      id: 'public-api/trust-the-response-over-the-table',
      strength: 'should-not',
      statement:
        'Treat the Auth, HTTPS, or CORS columns as authoritative once a live response contradicts them.',
      evidence: {
        rationale:
          'The table is community-maintained with no automated re-verification, so its columns record what was true when a contributor last looked. Where the observed response and the row disagree, the response is the current fact and the row is history.',
        confidence: 'established',
      },
      verifiedBy: 'selection-review',
    },
  ],

  verification: [
    {
      id: 'probe-before-code',
      kind: 'command',
      description:
        'Probe the endpoint and fail if it is unreachable, non-2xx, or not JSON. Writes the report the scaffolder needs.',
      command:
        "python3 scripts/probe_api.py --url '<endpoint>' --name '<name>' --out probe-report.json",
      blocking: true,
    },
    {
      id: 'scaffold-dry-run',
      kind: 'command',
      description: 'Show every file the scaffolder would write, before it writes any of them.',
      command:
        'python3 scripts/scaffold_client.py --report probe-report.json --out ./src --dry-run',
    },
    {
      id: 'selection-review',
      kind: 'self-review',
      description:
        'Confirm the API was chosen from evidence rather than from the first matching row.',
      blocking: true,
      questions: [
        'Was the live endpoint actually called before integration code was written, and what were the status, latency, and response shape?',
        'Did the probe show an Access-Control-Allow-Origin header, and does that agree with the CORS column? If they disagree, which one did the architecture follow?',
        'Is the HTTPS column `Yes` for the chosen API, and does the endpoint refuse plaintext?',
        'Were three candidates shortlisted, and is it written down which two were rejected and why?',
        'Have the provider’s terms, quota, and attribution requirements been read, and is what they say recorded somewhere the next person will find it?',
      ],
    },
    {
      id: 'security-review',
      kind: 'self-review',
      description: 'Confirm no credential reaches the client and the call path is deliberate.',
      blocking: true,
      questions: [
        'Grep the built client bundle for the key value itself, not the variable name. Does it appear?',
        'Is every environment variable holding a secret free of a client-exposed prefix (NEXT_PUBLIC_, VITE_, REACT_APP_, PUBLIC_)?',
        'Was `.env*` in `.gitignore` before any real key was written to disk, and does `git log -S "<key prefix>"` come back empty?',
        'If the call is browser-direct, was that chosen because a probe confirmed CORS and no credential is needed — or because it was simply easier?',
        'Does the server route validate and constrain its own input, so it cannot be used as an open proxy to arbitrary upstream URLs?',
      ],
    },
    {
      id: 'resilience-review',
      kind: 'self-review',
      description:
        'Confirm the integration behaves when the third party is slow, rate-limited, or gone.',
      blocking: true,
      questions: [
        'Block the endpoint in DevTools and reload. Does the interface reach a designed failed state, or does it spin forever?',
        'Does every call carry an explicit timeout, and is the retry policy limited to 429 and 5xx with jitter on the backoff?',
        'Does any provider-shaped field name appear outside the adapter module?',
        'What happens on a 429 specifically — is Retry-After read, and is the user told something more useful than "error"?',
        'Can the whole integration be tested without a network, by mocking the adapter rather than the HTTP layer?',
      ],
    },
  ],

  relatedSkills: ['engineering-discipline', 'interface-states', 'code-quality', 'interface-copy'],
}
