#!/usr/bin/env python3
"""
Contrast checker for the Vishwakarma design contract.

Computes WCAG 2.x contrast ratios and reports AA/AAA verdicts. Accepts hex,
rgb(), and oklch() inputs so a token set authored in OKLCh can be audited
without first being flattened to hex.

Usage
  check_contrast.py FG BG                Compare two colours.
  check_contrast.py --palette FILE       Audit a JSON token file.
  check_contrast.py --large FG BG        Grade against the large-text threshold.

Exit codes
  0  every checked pair passes its threshold
  1  at least one pair fails
  2  bad input

Machine-readable JSON goes to stdout; human status goes to stderr.

Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
SPDX-License-Identifier: Apache-2.0
"""

import argparse
import json
import math
import re
import sys

# WCAG 2.x thresholds. Large text is >=18pt regular or >=14pt bold.
AA_NORMAL, AA_LARGE = 4.5, 3.0
AAA_NORMAL, AAA_LARGE = 7.0, 4.5
# Non-text UI components and graphical objects (WCAG 1.4.11).
UI_COMPONENT = 3.0


# --------------------------------------------------------------------------
# Colour parsing
# --------------------------------------------------------------------------

def _srgb_to_linear(c):
    """Undo the sRGB transfer function. Required before luminance."""
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def parse_hex(s):
    s = s.lstrip("#")
    if len(s) == 3:
        s = "".join(ch * 2 for ch in s)
    if len(s) == 8:          # #RRGGBBAA - alpha is dropped, not composited
        s = s[:6]
    if len(s) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", s):
        raise ValueError(f"not a hex colour: {s}")
    return tuple(int(s[i:i + 2], 16) / 255 for i in (0, 2, 4))


def parse_rgb(s):
    nums = re.findall(r"[\d.]+", s)
    if len(nums) < 3:
        raise ValueError(f"not an rgb colour: {s}")
    vals = []
    for n in nums[:3]:
        v = float(n)
        vals.append(v / 100 if "%" in s else (v / 255 if v > 1 else v))
    return tuple(vals)


def parse_oklch(s):
    """
    oklch(L C H) -> linear sRGB -> gamma sRGB.

    L is 0-1 perceived lightness (or a percentage), C is chroma, H is degrees.
    Conversion is OKLCh -> OKLab -> LMS -> linear sRGB, per Bjorn Ottosson.
    """
    nums = re.findall(r"-?[\d.]+", s)
    if len(nums) < 3:
        raise ValueError(f"not an oklch colour: {s}")
    L, C, H = float(nums[0]), float(nums[1]), float(nums[2])
    if L > 1.5:                      # written as a percentage
        L /= 100
    h = math.radians(H)
    a, b = C * math.cos(h), C * math.sin(h)

    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, sc = l_ ** 3, m_ ** 3, s_ ** 3

    r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * sc
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * sc
    bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * sc

    # Clamp: an out-of-gamut OKLCh value has no sRGB representation, so the
    # ratio computed after clamping is the ratio of what will actually render.
    return tuple(min(1.0, max(0.0, _linear_to_srgb(v))) for v in (r, g, bl))


def parse_colour(s):
    s = s.strip()
    if s.startswith("oklch"):
        return parse_oklch(s)
    if s.startswith("rgb"):
        return parse_rgb(s)
    return parse_hex(s)


# --------------------------------------------------------------------------
# Contrast
# --------------------------------------------------------------------------

def luminance(rgb):
    r, g, b = (_srgb_to_linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg, bg):
    a, b = luminance(fg), luminance(bg)
    lo, hi = sorted((a, b))
    return (hi + 0.05) / (lo + 0.05)


def grade(ratio, large=False):
    aa = AA_LARGE if large else AA_NORMAL
    aaa = AAA_LARGE if large else AAA_NORMAL
    if ratio >= aaa:
        return "AAA"
    if ratio >= aa:
        return "AA"
    if ratio >= UI_COMPONENT:
        return "UI-only"      # passes 1.4.11 for components, fails for text
    return "fail"


def check_pair(fg_s, bg_s, large=False, label=None):
    fg, bg = parse_colour(fg_s), parse_colour(bg_s)
    ratio = contrast(fg, bg)
    g = grade(ratio, large)
    return {
        "label": label,
        "foreground": fg_s,
        "background": bg_s,
        "ratio": round(ratio, 2),
        "large_text": large,
        "grade": g,
        "passes": g in ("AA", "AAA"),
        "required": AA_LARGE if large else AA_NORMAL,
    }


# --------------------------------------------------------------------------
# Palette auditing
# --------------------------------------------------------------------------

def audit_palette(path):
    """
    Audit a JSON token file. Two accepted shapes:

      {"pairs": [{"label": "body", "fg": "...", "bg": "...", "large": false}]}
      {"background": "#fff", "colours": {"text": "#333", "muted": "#777"}}

    The second form checks every colour against the named background, which is
    the common case for a single-surface token set.
    """
    with open(path) as f:
        data = json.load(f)

    results = []
    if "pairs" in data:
        for p in data["pairs"]:
            results.append(check_pair(
                p["fg"], p["bg"], p.get("large", False), p.get("label")
            ))
    else:
        bg = data.get("background") or data.get("bg")
        if not bg:
            raise ValueError("palette needs a 'background' key or a 'pairs' list")
        for name, value in (data.get("colours") or data.get("colors") or {}).items():
            results.append(check_pair(value, bg, False, name))
    return results


# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(add_help=True, description=__doc__.split("\n")[1])
    ap.add_argument("colours", nargs="*", metavar="FG BG")
    ap.add_argument("--palette", metavar="FILE")
    ap.add_argument("--large", action="store_true",
                    help="grade against the large-text threshold (3:1 AA)")
    args = ap.parse_args()

    try:
        if args.palette:
            results = audit_palette(args.palette)
        elif len(args.colours) == 2:
            results = [check_pair(args.colours[0], args.colours[1], args.large)]
        else:
            ap.print_help(sys.stderr)
            return 2
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as e:
        print(json.dumps({"error": str(e)}), flush=True)
        print(f"error: {e}", file=sys.stderr)
        return 2

    failures = [r for r in results if not r["passes"]]
    summary = {
        "examined": len(results),
        "passed": len(results) - len(failures),
        "failed": len(failures),
        "results": results,
    }
    print(json.dumps(summary, indent=2))

    for r in results:
        mark = "PASS" if r["passes"] else "FAIL"
        name = f"{r['label']}: " if r["label"] else ""
        print(f"  {mark}  {name}{r['foreground']} on {r['background']} "
              f"= {r['ratio']}:1 ({r['grade']}, needs {r['required']}:1)",
              file=sys.stderr)

    if not results:
        print("examined 0 pairs - nothing was checked", file=sys.stderr)
        return 2
    print(f"{summary['passed']}/{summary['examined']} passed", file=sys.stderr)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
