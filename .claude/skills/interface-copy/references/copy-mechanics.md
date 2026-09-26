# Settled copy mechanics

Each decision below is made once for a codebase and then applied mechanically. They are
gathered out of the body because none of them needs judgment at the point of use — only
consistency, which is exactly what drifts when the reasoning is not written down.

## 7. Mechanics to decide once

**Case.** Sentence case ("Save changes") or title case ("Save Changes") — pick one for every
button, heading, tab, and menu item. Sentence case is safer: title case has no agreed rule
set across English variants, so a codebase using it drifts within weeks.

**Numerals.** Digits, not words: "3 files". A non-breaking space between value and unit
("24 MB") so they never wrap apart. Format with `Intl.NumberFormat`.

**Time.** Relative time ("3 minutes ago") is right when recency is the point and precision is
not. Absolute time is right when the moment may be referenced, compared, or reported — audit
logs, receipts, scheduled events — and relative time decays, so "2 years ago" is worse than
the date. Ship relative text inside `<time datetime="2026-07-25T10:00:00Z">` with the
absolute value on hover.

**Plurals.** Never "1 items", never "item(s)". English has two plural forms, Arabic six and
Polish four, and the form is chosen by the numeral itself, so appending an `s` is a bug, not
a shortcut. Use `Intl.PluralRules` or ICU syntax, and write the zero case as its own branch:
"No results" beats "0 results" — zero reports absence, not quantity.

---

## 8. Truncation, placeholders, translation

Truncate where the information stops being useful and keep the full value reachable:
filenames truncate in the middle so the extension survives ("annual-report…-final.pdf"),
sentences truncate at the end, and any value the user must act on needs the whole string
exposed on hover, focus, or in a detail view.

Placeholder text is not a label. It disappears on focus, so the field's name vanishes exactly
while it is being filled, it usually fails contrast, and it is not a reliable accessible
name. Ship a visible `<label>`; let the placeholder carry only a format example.

Copy-driven layout needs headroom. German running text averages roughly 30% longer than
English and short labels can more than double, so never size a button to its English string.
Use logical properties (`padding-inline`, `text-align: start`) so right-to-left locales
mirror correctly, and remember that RTL flips more than text: icon order, progress direction,
back arrows and slider polarity mirror, while clocks and numerals do not.
