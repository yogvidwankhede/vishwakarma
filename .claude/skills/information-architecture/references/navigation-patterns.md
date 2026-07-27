# Choosing a navigation pattern and knowing where it breaks

Every navigation pattern is a trade between how much it shows and how much room it costs.
Choosing well means knowing each one's ceiling before you hit it, because the symptom of an
exceeded ceiling is not an error — it is users quietly failing to find things.

## Top navigation bar

**Holds:** 4-7 items comfortably, 8 at a stretch.
**Costs:** one horizontal band, always visible.
**Best for:** marketing sites, products with few genuinely top-level areas, and anything where
the content area needs full width.

The ceiling is typographic, not cognitive: item labels are words of varying length, and past
seven the bar either wraps, shrinks below comfortable tap targets, or forces one-word labels
that lose scent. The common repair — a mega-menu — changes the pattern rather than extending
it, and should be a deliberate choice.

**Fails when** a section needs children. A hover-triggered dropdown is unreachable on touch
without a tap-to-open compromise, and hover menus that close on a diagonal mouse path are a
recurring, entirely avoidable frustration. If more than one or two top items need children,
you want a sidebar.

## Sidebar navigation

**Holds:** 15-30 items across 2-4 labelled groups; more with a scroll and collapsible sections.
**Costs:** 200-280px of horizontal room permanently.
**Best for:** applications — anything where the user stays for a working session and returns to
the same few destinations repeatedly.

A sidebar is the only common pattern that shows breadth and depth simultaneously, which is why
it suits the shallow-wide hierarchies the research favours. Group headings within it are what
make 25 items legible; without them, 25 links is a wall.

**Fails when** the item count exceeds roughly 30, at which point the list scrolls independently
of the page and the user loses the overview that justified the sidebar's cost. It also fails on
narrow viewports, where it must become a drawer — acceptable on mobile, where there is no room
to do otherwise, and a mistake on desktop, where there is.

## Tabs

**Holds:** 2-6.
**Costs:** one band inside the content region.
**Best for:** alternative views of *one* object — a project's Overview, Activity, Settings.

Tabs assert that their contents are peers and mutually exclusive. Two conditions must hold: the
user should not need two tabs at once (if they do, use columns), and the tabs must not be
sequential (if they are, use a stepper — a wizard rendered as tabs hides progress, permits
out-of-order entry into a flow that assumes order, and breaks the back button).

Tab state belongs in the URL. A tab that is not addressable cannot be linked in a support reply.

**Fails when** labels wrap or the row scrolls horizontally. A scrolling tab row hides its own
options, which is the opposite of what tabs are for.

## Breadcrumbs

**Holds:** 3-5 levels.
**Costs:** one line above the page title.
**Best for:** hierarchies at least three levels deep, especially where users arrive from search
or a deep link and have no context.

Breadcrumbs answer "where am I in the structure", not "how did I get here". Rendering navigation
history is a distinct pattern with a distinct failure mode: it changes between visits, so it
cannot be learned.

**Fails when** the hierarchy is two levels deep — the trail then restates the nav — or when the
structure is a graph rather than a tree, so an item has several legitimate parents. In that case
pick a canonical path and use it consistently, because an inconsistent breadcrumb is worse than
none.

## Command palette

**Holds:** unbounded.
**Costs:** nothing visually; a discoverability problem instead.
**Best for:** products with more than about 30 destinations and returning users.

A palette collapses arbitrary depth to a keystroke and is the correct answer to "power users
need faster access" — a far better one than adding another nav tier. It must be additive: an
interface reachable *only* by palette is undiscoverable, and the entry point needs a visible
affordance alongside the shortcut.

## Search

**Holds:** unbounded.
**Costs:** an index, a ranking problem, and an empty state.
**Best for:** large content collections where users know what they want by name.

The trap is treating search as an IA substitute. Users search with the vocabulary they already
have; if your labels do not match it, neither will your index unless you invest in synonyms.
Search also cannot answer "what is available here", which is the question a novice actually has.

## Combining them

The reliable combination for an application is a sidebar for top-level areas, tabs for views of
the current object, breadcrumbs only where depth exceeds two, and a command palette above 30
destinations. The reliable combination for a content site is a top bar, an in-page table of
contents, and search.

Two rules govern the combination. Every destination must be reachable from at least two routes —
browse and search, or nav and cross-link — because a single route is a single point of failure.
And every screen must answer three questions without interaction: where am I, what else is here,
and how do I get back.
