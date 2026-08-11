# Dashboard information hierarchy

Most dashboards fail the same way: every metric is rendered in an identically sized card, so
the screen carries no ranking, and the user must perform the prioritisation the dashboard was
supposed to do for them. The result is a page that is looked at, admired, and never used to
decide anything.

## Start with the decision, not the data

A dashboard exists to answer a question that leads to an action. Write the question down before
choosing a chart.

- "Is anything wrong right now?" — an operational dashboard. Optimise for anomaly detection:
  current state, thresholds, and deviation from normal.
- "Are we on track this quarter?" — an analytical dashboard. Optimise for trend and comparison
  against target.
- "What happened and why?" — an exploratory tool, not a dashboard. It needs filters, drill-down
  and raw access, and forcing it into a fixed grid of tiles serves nobody.

Mixing these on one screen is the second most common failure. A page that must simultaneously
alert and explain does neither well.

## The inverted pyramid

Structure the page as a news article: the conclusion first, then the supporting evidence, then
the detail.

**Tier 1 — one number.** There is always a single metric that best answers the question. Give
it the top-left position (in left-to-right locales, where the reading path begins) and make it
visually dominant — two to three times the type size of anything else. If you cannot choose,
the dashboard has no purpose yet, and the choosing is the design work. A dashboard with six
equal hero numbers has zero.

**Tier 2 — three to five supporting metrics.** These explain or qualify Tier 1. They are
smaller, arranged in one row or a compact grid, and each carries the context that makes it
interpretable: a comparison, a trend, or a target.

**Tier 3 — breakdowns.** Charts and tables that decompose Tier 2 by dimension. Below the fold
is acceptable here; these are for the user who has already been alerted by Tier 1.

**Tier 4 — raw detail and export.** Reachable, not displayed.

## A number alone is not information

`1,284` is unusable. Every metric needs at least one of three kinds of context, and preferably
two:

**Comparison** — against the previous period, the same period last year, or a peer segment.
State the basis explicitly: "vs. previous 30 days", not a bare arrow.
**Target** — the value that constitutes success, ideally rendered as a reference line rather
than a separate figure.
**Trend** — direction and shape over time. A sparkline costs one line of height and converts a
snapshot into a story.

The sign convention must be semantic, not arithmetic. Churn rising is bad and refunds falling
is good; colouring every increase green is a defect that produces confident wrong readings.

## Sizing, ordering, and the grid

Tile size should encode importance, and a uniform grid therefore encodes that nothing is more
important than anything else. Break it: let the primary metric span two columns, and let a
critical trend chart span the full width.

Order by decision relevance, not by data availability or by which team owns the metric. The
most common ordering defect is that tiles appear in the order the queries were written.

Density should rise as you descend the page. The top is sparse and legible from across a room;
the bottom can be a dense table, because by then the user is leaning in.

## Alerting

If a metric can be *wrong* rather than merely low, it needs a threshold and a state — not a
number the user must evaluate against remembered norms. Reserve saturated colour for these
states exclusively. A dashboard where every tile is coloured has no alerting channel left,
which is why heavily-branded dashboards often cannot signal an emergency.

Pair every alert state with an icon or label. Red and green are the pairing most affected by
colour vision deficiency, and a status dashboard read incorrectly is worse than no dashboard.

## States and time

Design the empty state — a new account has no data, and "0" across every tile looks like an
outage. Say what will appear here and when.

Show the data's freshness and range near the top, not in a footer. "Last updated 4 minutes ago"
and "Last 30 days" are load-bearing: without them, every number is unfalsifiable. If a tile has
a different range from its neighbours, label it on the tile, because users assume a shared
range and will not check.

Reserve tile space during loading so numbers do not shift into place; a dashboard that reflows
as each query resolves makes the user re-find the metric they were already reading.

## What to remove

Cut any metric that no one can act on. Cut any chart whose only function is to look
sophisticated — the pie chart with eleven slices, the dual-axis line chart whose correlation is
an artefact of axis scaling, the 3-D bar chart. And cut any metric that always looks the same:
a number that has not changed materially in a year is documentation, not a dashboard tile.
