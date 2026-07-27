# React render-performance patterns

Most React performance work is misdirected because it starts from a suspicion rather than a
profile. The Profiler in React DevTools records a commit and shows exactly which components
rendered and why. Record first.

## The three costs

A React update costs **render** (running component functions and diffing), **commit**
(applying DOM mutations), and **browser work** (style, layout, paint on the mutated
subtree). These respond to different fixes. A component that renders 400 times cheaply may
be irrelevant; one that renders twice and commits 3,000 nodes is the problem. The Profiler's
flame chart shows render cost; the commit cost shows up in the Performance panel as layout
and paint.

## The React Compiler changes the default advice

React Compiler 1.0 shipped in October 2025. It analyses components and inserts memoisation
automatically, at a granularity finer than hand-written hooks — it can memoise individual
JSX subtrees, not just whole components. In a compiled codebase:

- Hand-written `useMemo`/`useCallback` are usually redundant. They still cost a
  dependency comparison per render and retain their captured values, so removing them is a
  small win, not a neutral change.
- `memo()` on components is largely unnecessary for the same reason.
- The compiler only optimises code that follows the Rules of React. Components that mutate
  props or state in place, or read refs during render, are bailed out silently. Run the
  ESLint plugin and treat bailouts as bugs, because a bailed-out component gets no
  optimisation at all while you believe it is covered.

Without the compiler, the calculus is the classic one: memoisation costs a comparison and
memory on every render and pays only when it prevents work that is more expensive than
that.

## When manual memoisation genuinely pays

1. **Referential identity that something else depends on.** An object or callback passed to
   a memoised child, used in a `useEffect` dependency array, or given to a context
   provider. Here `useMemo` is not an optimisation but a correctness tool — without it the
   effect re-runs every render.
2. **Genuinely expensive computation.** Sorting or filtering thousands of items, parsing,
   date formatting in a loop. The threshold is real work, not "a function call".
3. **A wide subtree under a frequently-rendering parent.** `memo` on a heavy sibling of a
   fast-changing element.

When it does not pay: primitives, small object literals, functions passed to DOM elements,
and components that re-render anyway because their props change every time. A `memo`
around a component receiving `style={{ margin: 8 }}` never hits, because the object is
new every render — it adds a comparison and prevents nothing.

## Context cascades

Every consumer of a context re-renders when the provider's `value` changes by reference.
Two failure modes follow:

**Inline value objects.** `<Ctx.Provider value={{ user, setUser }}>` creates a new object
on every parent render, so every consumer re-renders even when `user` is unchanged.

**Mixed change frequencies.** A single context holding theme, user, and a live search string
re-renders every theme consumer on every keystroke. Split by frequency: one provider per
independently-changing concern. A state manager with selector-based subscriptions is the
alternative when the shape genuinely cannot be split.

## Transitions and deferred values

`useTransition` marks an update as non-urgent. React renders the urgent update first,
paints it, and can interrupt and restart the non-urgent one if another input arrives:

    const [isPending, startTransition] = useTransition()
    function onChange(e) {
      setQuery(e.target.value)                          // urgent: the input's own value
      startTransition(() => setResults(filter(e.target.value)))  // non-urgent
    }

`useDeferredValue` is the same idea expressed downstream, useful when you do not own the
setter: `const deferredQuery = useDeferredValue(query)`, then derive the expensive view
from `deferredQuery`. Both keep the caret responsive while the heavy list lags by a frame
or two, which is what users actually want.

Note what this does *not* do: it does not make the filtering cheaper. If a single filter
pass exceeds the frame budget, the transition cannot interrupt it — interruption happens
between component renders, not inside one long synchronous function.

## Lists

Virtualise when the number of *rendered* rows is large — roughly 100 as a starting point,
lower for rows containing images or charts. Below that, virtualisation costs more than it
saves and brings real defects: browser find-in-page misses off-screen rows, anchor links to
hidden items break, and screen reader users get an inconsistent item count unless you
manage `aria-setsize` and `aria-posinset` yourself.

Two things matter more than virtualisation for medium lists:

- **Stable keys.** Index keys cause React to reuse the wrong DOM nodes when the list
  reorders, producing both incorrect state and unnecessary mutation. Use a stable id.
- **Memoised rows.** With a stable row component and stable props, a list of 500 items that
  changes one item commits one row rather than 500.

Use `content-visibility: auto` with `contain-intrinsic-size` on rows as a cheap
alternative to virtualisation: the DOM stays complete, so find-in-page and accessibility
still work, but off-screen rows skip layout and paint entirely.

## Effects that cause a second render

An effect that sets state runs after commit, forcing another render-and-commit cycle before
the browser paints if it is a layout effect, or a visible flash if it is not. State that can
be derived during render should be derived during render, not synchronised in an effect.
