#!/usr/bin/env python3
"""
Probe a candidate endpoint before any integration code is written.

Answers the five questions the public-apis table cannot: does it still exist,
what is the real response shape, how slow is it, what rate-limit headers come
back, and does Access-Control-Allow-Origin actually appear. A CORS header that
is absent here overrides a `Yes` in the catalog — the table drifts, the
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
        if re.match(r"^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2})?", value):
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
    p = argparse.ArgumentParser(description=__doc__.split("\n")[1])
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

    name = args.name or re.sub(r"\W+", "-", urllib.parse.urlparse(args.url).netloc).strip("-")

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
    print(f"\n{name}: HTTP {report['status']}  "
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
