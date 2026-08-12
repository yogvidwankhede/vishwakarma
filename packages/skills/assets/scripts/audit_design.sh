#!/usr/bin/env bash
#
# Design contract audit for the Vishwakarma skill.
#
# Greps a source tree for the violations that are mechanically detectable:
# hardcoded colour literals where a token belongs, fixed insets on platforms
# that negotiate them at run time, banned easing, and missing reduced-motion
# branches.
#
# A finding here is a candidate, not a verdict. The script cannot tell a
# deliberate one-off from an oversight, so every hit needs a human decision.
# What it does guarantee is that no hit goes unseen.
#
# Usage
#   audit_design.sh PATH [--platform web|android|apple] [--json]
#
# Exit codes
#   0  no findings
#   1  findings present
#   2  bad input or no files examined
#
# Copyright 2026 Yogvid Wankhede and the Vishwakarma project authors
# SPDX-License-Identifier: Apache-2.0

set -uo pipefail

TARGET=""
PLATFORM="auto"
JSON=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="${2:-auto}"; shift 2 ;;
    --json)     JSON=1; shift ;;
    -h|--help)  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)          TARGET="$1"; shift ;;
  esac
done

if [[ -z "$TARGET" || ! -e "$TARGET" ]]; then
  echo "error: give a path to audit" >&2
  exit 2
fi

# Prefer ripgrep; fall back to grep -r so the script works on a bare image.
if command -v rg >/dev/null 2>&1; then
  SEARCH() { rg --no-heading --line-number --color=never "$@" 2>/dev/null; }
else
  SEARCH() {
    local pat="$1"; shift
    local globs=() a
    for a in "$@"; do [[ "$a" == "-g" ]] || globs+=("--include=$a"); done
    grep -rn --color=never "${globs[@]}" -E "$pat" "$TARGET" 2>/dev/null
  }
fi

FINDINGS=0
EXAMINED=0
declare -a REPORT

note() {  # note <severity> <rule> <message> <hits>
  local sev="$1" rule="$2" msg="$3" hits="$4"
  local count; count=$(printf '%s' "$hits" | grep -c . || true)
  [[ "$count" -eq 0 ]] && return 0
  FINDINGS=$((FINDINGS + count))
  REPORT+=("$sev|$rule|$count|$msg")
  if [[ "$JSON" -eq 0 ]]; then
    printf '\n[%s] %s  (%s)\n' "$sev" "$rule" "$count" >&2
    printf '  %s\n' "$msg" >&2
    printf '%s\n' "$hits" | head -12 | sed 's/^/    /' >&2
    [[ "$count" -gt 12 ]] && printf '    ... %s more\n' "$((count - 12))" >&2
  fi
}

if [[ "$PLATFORM" == "auto" ]]; then
  if   [[ -n "$(find "$TARGET" -name '*.kt' -o -name 'build.gradle*' 2>/dev/null | head -1)" ]]; then PLATFORM=android
  elif [[ -n "$(find "$TARGET" -name '*.swift' 2>/dev/null | head -1)" ]]; then PLATFORM=apple
  else PLATFORM=web
  fi
fi

EXAMINED=$(find "$TARGET" -type f \
  \( -name '*.kt' -o -name '*.swift' -o -name '*.css' -o -name '*.scss' \
     -o -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \
     -o -name '*.vue' -o -name '*.svelte' -o -name '*.xml' \) 2>/dev/null | wc -l | tr -d ' ')

# ---------------------------------------------------------------- universal

note ERROR "ease-in on UI" \
  "ease-in starts slow, so the interface feels unresponsive at the moment the user looks for confirmation. Use ease-out for enters and exits." \
  "$(SEARCH 'transition[^;]*ease-in[^-]|animation[^;]*ease-in[^-]|easing:\s*.ease-in.' -g '*.css' -g '*.scss' -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' "$TARGET")"

note WARN "scale(0) entrance" \
  "Entering from zero scale reads as a pop rather than an arrival. Enter from 0.90-0.97 with opacity 0." \
  "$(SEARCH 'scale\(0\)|scale\(0\.0\)|scaleX\(0\)|scaleY\(0\)' -g '*.css' -g '*.scss' -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' "$TARGET")"

note WARN "long UI transition" \
  "UI feedback over 300ms stops reading as a response and starts reading as a wait." \
  "$(SEARCH 'transition[^;]*[^0-9](3[5-9][0-9]|[4-9][0-9]{2}|[0-9]{4,})ms' -g '*.css' -g '*.scss' "$TARGET")"

# ------------------------------------------------------------------ per platform

case "$PLATFORM" in
  web)
    note ERROR "100vh" \
      "100vh measures the viewport with browser chrome hidden, so content clips at rest on mobile. Use 100dvh, or svh/lvh when you specifically need one variant." \
      "$(SEARCH '\b100vh\b' -g '*.css' -g '*.scss' -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '*.vue' -g '*.svelte' "$TARGET")"

    note WARN "hardcoded hex" \
      "Hex literals in components bypass the token layer, so a theme change misses them. Author in OKLCh and reference tokens." \
      "$(SEARCH '#[0-9a-fA-F]{6}\b' -g '*.tsx' -g '*.jsx' -g '*.vue' -g '*.svelte' "$TARGET")"

    note WARN ":focus without :focus-visible" \
      "Styling :focus alone shows a ring on mouse click as well as keyboard. Use :focus-visible." \
      "$(SEARCH ':focus\b(?!-visible)' -g '*.css' -g '*.scss' "$TARGET")"

    note WARN "hover without modality gate" \
      "On touch, :hover sticks after tap. Gate hover affordances behind @media (hover: hover) and (pointer: fine)." \
      "$(SEARCH ':hover' -g '*.css' -g '*.scss' "$TARGET" | head -40)"
    ;;

  android)
    note ERROR "hardcoded Color()" \
      "A literal colour cannot participate in dynamic colour, which is resolved from the wallpaper at run time and is not known at build time. Use a Material 3 role." \
      "$(SEARCH 'Color\(0x[0-9a-fA-F]{8}\)' -g '*.kt' "$TARGET")"

    note ERROR "Material 2 import" \
      "androidx.compose.material is M2. Mixing M2 and M3 gives two token systems in one tree." \
      "$(SEARCH '^import androidx\.compose\.material\.' -g '*.kt' "$TARGET")"

    note WARN "fixed system-bar padding" \
      "Insets are negotiated at run time under edge-to-edge, so a fixed constant puts content under the status or navigation bar. Use systemBarsPadding()." \
      "$(SEARCH 'padding\(\s*top\s*=\s*(2[0-9]|[3-9][0-9])\.dp|statusBarHeight|navigationBarHeight' -g '*.kt' "$TARGET")"

    note WARN "sp missing on text" \
      "Text sized in dp ignores the user's font-scale setting." \
      "$(SEARCH 'fontSize\s*=\s*[0-9]+\.dp' -g '*.kt' "$TARGET")"

    note WARN "lazy item without key" \
      "Without a stable key, a lazy list rebuilds items on reorder and loses scroll position and animation identity." \
      "$(SEARCH 'items\(\s*[a-zA-Z_][a-zA-Z0-9_.]*\s*\)\s*\{' -g '*.kt' "$TARGET")"
    ;;

  apple)
    note ERROR "hardcoded safe-area constant" \
      "Device inset values change per generation. Read safeAreaInsets rather than encoding 34 or 44." \
      "$(SEARCH '(34|44|47|54|59)\s*//\s*safe|safeArea[A-Za-z]*\s*=\s*(34|44|47)' -g '*.swift' "$TARGET")"

    note WARN "circular corner radius" \
      "A circular-arc corner has a curvature discontinuity where it meets the edge. Use RoundedRectangle(cornerRadius:style: .continuous)." \
      "$(SEARCH 'cornerRadius:\s*[0-9]+\s*\)' -g '*.swift' "$TARGET")"

    note WARN "literal UIColor" \
      "Literal colours do not adapt to dark mode or increased contrast. Use semantic colours such as .label and .systemBackground." \
      "$(SEARCH 'UIColor\(red:|Color\(red:' -g '*.swift' "$TARGET")"

    note WARN "fixed font size" \
      "A fixed point size does not scale with Dynamic Type. Use .font(.body) or UIFontMetrics." \
      "$(SEARCH '\.font\(\.system\(size:\s*[0-9]+' -g '*.swift' "$TARGET")"
    ;;
esac

# ------------------------------------------------------------- reduced motion

MOTION_HITS=$(SEARCH 'transition:|animation:|animate\(|withAnimation|AnimatedVisibility' \
  -g '*.css' -g '*.scss' -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '*.kt' -g '*.swift' "$TARGET" | grep -c . || true)
RM_HITS=$(SEARCH 'prefers-reduced-motion|isReduceMotionEnabled|ANIMATOR_DURATION_SCALE|useReducedMotion' \
  -g '*.css' -g '*.scss' -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '*.kt' -g '*.swift' "$TARGET" | grep -c . || true)

if [[ "$MOTION_HITS" -gt 0 && "$RM_HITS" -eq 0 ]]; then
  note ERROR "no reduced-motion branch" \
    "Found $MOTION_HITS animation sites and no reduced-motion handling. Every motion path needs a branch that degrades to a short cross-fade." \
    "(project-wide)"
fi

# ------------------------------------------------------------------- output

if [[ "$JSON" -eq 1 ]]; then
  printf '{\n  "platform": "%s",\n  "files_examined": %s,\n  "findings": %s,\n  "rules": [\n' \
    "$PLATFORM" "$EXAMINED" "$FINDINGS"
  for i in "${!REPORT[@]}"; do
    IFS='|' read -r sev rule count msg <<< "${REPORT[$i]}"
    printf '    {"severity": "%s", "rule": "%s", "count": %s, "message": "%s"}%s\n' \
      "$sev" "$rule" "$count" "${msg//\"/\\\"}" "$([[ $i -lt $((${#REPORT[@]} - 1)) ]] && echo ,)"
  done
  printf '  ]\n}\n'
fi

if [[ "$EXAMINED" -eq 0 ]]; then
  echo "examined 0 files - nothing was checked, so this is not a pass" >&2
  exit 2
fi

printf '\nplatform=%s  files=%s  findings=%s\n' "$PLATFORM" "$EXAMINED" "$FINDINGS" >&2
[[ "$FINDINGS" -gt 0 ]] && exit 1 || exit 0
