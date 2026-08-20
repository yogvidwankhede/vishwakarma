#!/usr/bin/env python3
"""
Shortlist candidate APIs from the public-apis catalog.

Fetches the catalog README, parses its Markdown tables, filters by your
constraints, and ranks what survives. The output is a shortlist, never an
integration decision: the catalog has no rate-limit, uptime, licence, or
last-verified column, so a row can be years stale while still reading `Yes`.
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
    r"^\|\s*\[(?P<name>[^\]]+)\]\((?P<url>[^)]+)\)\s*\|"
    r"\s*(?P<desc>[^|]*)\|"
    r"\s*(?P<auth>[^|]*)\|"
    r"\s*(?P<https>[^|]*)\|"
    r"\s*(?P<cors>[^|]*)\|"
)
HEADING = re.compile(r"^###\s+(?P<category>.+?)\s*$")


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
        auth = m.group("auth").strip().strip("`")
        entries.append({
            "name": m.group("name").strip(),
            # The catalog's link column is the project's documentation or homepage, never a
            # callable endpoint. Naming it "url" invited probing an HTML docs page and
            # scaffolding a client for it, so the name states what it is.
            "docs_url": m.group("url").strip(),
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
    the `> 0` filter, which is how a search for one thing returns another.
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
    p = argparse.ArgumentParser(description=__doc__.split("\n")[1])
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
        terms = [t for t in re.split(r"\W+", args.need.lower()) if len(t) > 2]
        scored = [(score(e, terms), e) for e in pool]
        pool = [e for s, e in sorted(scored, key=lambda x: -x[0]) if s > 0]

    shortlist = pool[: args.limit]
    out = {
        "catalog_entries": total,
        "after_filters": len(pool),
        "returned": len(shortlist),
        "next_step": (
            "Open docs_url, find the actual request URL, then: "
            "probe_api.py --url <endpoint>. docs_url is documentation, not an endpoint."
        ),
        "candidates": shortlist,
    }
    print(json.dumps(out, indent=2))

    if not args.json:
        print(f"\ncatalog: {total} entries -> {len(pool)} match -> showing {len(shortlist)}\n",
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
            print(f"    docs: {e['docs_url']}", file=sys.stderr)
        print("\nThe catalog has no rate-limit, uptime, or last-verified column.",
              file=sys.stderr)
        print("Those are documentation links, not endpoints. Open one, find the request",
              file=sys.stderr)
        print("URL in its docs, and probe that: probe_api.py --url <endpoint>",
              file=sys.stderr)

    if not shortlist:
        print("nothing matched - loosen the filters", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
