#!/usr/bin/env python3
"""
Motion contract checker for the Vishwakarma skill.

Extracts animation durations and easing functions from a source tree and
grades them against the motion contract: UI feedback under 300ms, ease-out
for enters and exits, ease-in never on UI, and a reduced-motion branch for
every motion path.

Usage
  check_motion.py PATH [--max-ui-ms 300] [--json]

Exit codes
  0  no violations
  1  violations found
  2  bad input, or no motion sites found (nothing was checked)

Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
SPDX-License-Identifier: Apache-2.0
"""

import argparse
import json
import os
import re
import sys

EXTS = {".css", ".scss", ".sass", ".less", ".ts", ".tsx", ".js", ".jsx",
        ".vue", ".svelte", ".kt", ".swift"}

SKIP_DIRS = {"node_modules", ".git", "build", "dist", ".next", "vendor",
             "Pods", ".gradle", "__pycache__", "out", "target"}

# Sanctioned curves from the motion contract.
SANCTIONED = {
    "cubic-bezier(0.23,1,0.32,1)": "ease-out",
    "cubic-bezier(0.77,0,0.175,1)": "ease-in-out",
    "cubic-bezier(0.32,0.72,0,1)": "ease-drawer",
    # Material 3 emphasised set.
    "cubic-bezier(0.05,0.7,0.1,1)": "m3-emphasised-decelerate",
    "cubic-bezier(0.3,0,0.8,0.15)": "m3-emphasised-accelerate",
    "cubic-bezier(0.2,0,0,1)": "m3-standard",
}

DURATION_RE = re.compile(
    r"(?:transition[^;{}]*?|animation[^;{}]*?|duration\s*[:=]\s*)"
    r"(\d+(?:\.\d+)?)(ms|s)\b", re.I)
BEZIER_RE = re.compile(r"cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,"
                       r"\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)", re.I)
EASE_IN_RE = re.compile(r"\bease-in\b(?!-out)", re.I)
MOTION_SITE_RE = re.compile(
    r"transition\s*:|animation\s*:|@keyframes|\.animate\(|animate\s*=|"
    r"withAnimation|AnimatedVisibility|animateTo|Animated\.", re.I)
REDUCED_RE = re.compile(
    r"prefers-reduced-motion|isReduceMotionEnabled|prefersCrossFadeTransitions|"
    r"ANIMATOR_DURATION_SCALE|useReducedMotion|reduceMotion", re.I)


def walk(root):
    if os.path.isfile(root):
        yield root
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() in EXTS:
                yield os.path.join(dirpath, fn)


def norm_bezier(m):
    """Normalise a cubic-bezier to a comparable key (trailing zeros dropped)."""
    parts = []
    for g in m.groups():
        f = float(g)
        parts.append(str(int(f)) if f == int(f) else str(f))
    return "cubic-bezier(" + ",".join(parts) + ")"


def check(root, max_ui_ms):
    findings = []
    motion_sites = 0
    reduced_hits = 0
    files = 0

    for path in walk(root):
        try:
            with open(path, encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except OSError:
            continue
        files += 1

        for i, line in enumerate(lines, 1):
            if MOTION_SITE_RE.search(line):
                motion_sites += 1
            if REDUCED_RE.search(line):
                reduced_hits += 1

            for m in DURATION_RE.finditer(line):
                value, unit = float(m.group(1)), m.group(2).lower()
                ms = value * 1000 if unit == "s" else value
                if ms > max_ui_ms:
                    findings.append({
                        "severity": "WARN", "rule": "duration-over-budget",
                        "file": path, "line": i, "value": f"{m.group(1)}{unit}",
                        "message": (
                            f"{ms:.0f}ms exceeds the {max_ui_ms}ms UI ceiling. "
                            "Past this the animation stops reading as a response "
                            "to the action and starts reading as a wait."),
                    })

            if EASE_IN_RE.search(line):
                findings.append({
                    "severity": "ERROR", "rule": "ease-in-on-ui",
                    "file": path, "line": i, "value": "ease-in",
                    "message": (
                        "ease-in begins slow, so the interface feels unresponsive "
                        "at the moment the user is looking for confirmation. Enters "
                        "and exits take ease-out."),
                })

            for m in BEZIER_RE.finditer(line):
                key = norm_bezier(m)
                if key not in SANCTIONED:
                    x1, y1 = float(m.group(1)), float(m.group(2))
                    # A curve whose first control point sits below the diagonal
                    # accelerates out of rest - the ease-in failure by another name.
                    if y1 < x1:
                        findings.append({
                            "severity": "WARN", "rule": "unsanctioned-easing",
                            "file": path, "line": i, "value": key,
                            "message": (
                                "Curve accelerates from rest, which reads as "
                                "unresponsive. Use one of the sanctioned curves "
                                "or state why this one is correct here."),
                        })

    if motion_sites > 0 and reduced_hits == 0:
        findings.append({
            "severity": "ERROR", "rule": "no-reduced-motion",
            "file": str(root), "line": 0, "value": f"{motion_sites} sites",
            "message": (
                f"Found {motion_sites} animation sites and no reduced-motion "
                "handling. Every motion path needs a branch that degrades to a "
                "short cross-fade; reduced motion means gentler and fewer, not zero."),
        })

    return findings, {"files": files, "motion_sites": motion_sites,
                      "reduced_motion_sites": reduced_hits}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("path")
    ap.add_argument("--max-ui-ms", type=int, default=300)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.path):
        print(json.dumps({"error": f"no such path: {args.path}"}))
        print(f"error: no such path: {args.path}", file=sys.stderr)
        return 2

    findings, stats = check(args.path, args.max_ui_ms)

    errors = [f for f in findings if f["severity"] == "ERROR"]
    out = {"examined": stats, "findings": len(findings),
           "errors": len(errors), "results": findings}
    print(json.dumps(out, indent=2))

    if not args.json:
        for f in findings:
            loc = f"{f['file']}:{f['line']}" if f["line"] else f["file"]
            print(f"  [{f['severity']}] {f['rule']}  {loc}", file=sys.stderr)
            print(f"      {f['value']} - {f['message']}", file=sys.stderr)

    print(f"\nfiles={stats['files']}  motion sites={stats['motion_sites']}  "
          f"findings={len(findings)} ({len(errors)} errors)", file=sys.stderr)

    if stats["motion_sites"] == 0:
        print("found 0 motion sites - nothing was checked, so this is not a pass",
              file=sys.stderr)
        return 2
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
