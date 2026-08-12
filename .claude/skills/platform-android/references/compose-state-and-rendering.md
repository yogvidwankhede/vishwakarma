# Compose state discipline and render performance

## 1. Compose state discipline

**One immutable `UiState` per screen, exposed as a single `StateFlow`.** Several flows for
one screen guarantee that some frame renders an impossible combination — a spinner over stale
content, an empty message beside a populated list — because two flows cannot emit atomically.

```kotlin
val uiState: StateFlow<CheckoutUiState> = repository.cart
    .map(::toUiState)
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CheckoutUiState.Loading)
```

`WhileSubscribed(5_000)` is load-bearing. Without the five-second grace the upstream is
cancelled and restarted on every configuration change, so a rotation re-issues the network call
the user already paid for. With `Eagerly` the flow runs while the screen is invisible, burning
battery and quota.

Model variants with a **sealed interface**, not a sealed class: an interface permits a state to
participate in more than one hierarchy and imposes no constructor, which matters when
`Loading` and `Empty` are shared objects.

Derived values belong in `get()` properties, never constructor parameters:

```kotlin
data class CheckoutUiState(val lines: List<Line>, val promo: Promo?) {
    val subtotal: Money get() = lines.sumOf { it.total }
    val canSubmit: Boolean get() = lines.isNotEmpty() && promo?.isExpired != true
}
```

If `subtotal` were a parameter, `copy(lines = newLines)` would produce a state whose total
contradicts its line items — the compiler accepts it and the UI shows it. A `get()` property
has no independent storage and therefore cannot desynchronise.

One-shot effects — navigation, a snackbar, a share sheet — are not state. Route them through a
`Channel(Channel.BUFFERED).receiveAsFlow()` collected under
`repeatOnLifecycle(Lifecycle.State.STARTED)`. The mechanism is buffering: a `SharedFlow` with
`replay = 0` drops an emission that occurs while the screen is backgrounded, so an effect fired
during a background refresh is lost, whereas a channel holds it until collection resumes. The
decision rule is one question — **does it need to survive rotation?** A selected tab does, so it
is state. A "copied to clipboard" message does not, so it is an effect.

Split each screen into a stateless `Screen(uiState, onAction)` and a `Route` wrapper owning
the ViewModel and effect collection: the stateless half is what `@Preview` and screenshot tests
can instantiate, whereas a composable calling `hiltViewModel()` internally cannot be previewed
in an error state without a running graph.

Past roughly **four or five lambda parameters**, promote them to a single
`@Stable interface CheckoutActions` carrying `onQuantityChange`, `onRemove`, `onSubmit`
and the rest. This is a readability change with a stability side-effect: one stable parameter
skips cleanly, where six separately-remembered lambdas give six chances for one to be recreated
and defeat skipping.

## 2. Compose render performance

Compose runs three phases per frame: **composition** (what to show), **layout** (where and how
big), **draw** (pixels). Reading a `State` binds the *reading phase* to that state, so a read
during composition invalidates the whole subtree, while the same read deferred into a lambda
that runs at layout or draw time re-runs only that phase.

```kotlin
Modifier.offset(x = scrollOffset.dp)                        // recomposes every scroll frame
Modifier.offset { IntOffset(scrollOffset.roundToInt(), 0) } // re-lays out only
```

The same holds for `Modifier.graphicsLayer { alpha = fade }` against a composition-time alpha
read, and `drawBehind { }` against a recomposing `Box` background. When a value changes far
less often than its inputs, wrap it in `derivedStateOf` so readers wake only when the result
changes — `remember { derivedStateOf { listState.firstVisibleItemIndex > 0 } }` driving a
scroll-to-top button flips twice per session rather than on every scroll pixel.

**Strong skipping has been on by default since Kotlin 2.0**, so unstable parameters no longer
break skipping by themselves and lambdas are memoised automatically. The remaining culprit is the
**captured reference**: a lambda closing over an unstable object still forces recomposition, and
a composable reading a mutable field on a plain class sees no invalidation at all. Check what a
lambda closes over before reaching for `@Immutable`.

Lazy lists need both a stable `key` and a `contentType`:

```kotlin
items(items = orders, key = { it.id }, contentType = { it.kind }) { OrderRow(it) }
```

Without a key, removing item 3 marks items 4..n as changed and destroys their state; without
`contentType`, a header's composition slot cannot be reused for another header, so a
heterogeneous list allocates fresh subtrees while scrolling. Never compute a key with
`indexOf()` — the lambda runs per visible item and `indexOf` is a linear scan, making layout
**O(n²)** in list length, so a 500-row list performs 250,000 comparisons per frame. Equally,
never place a `SubcomposeLayout` (including `BoxWithConstraints`) inside a lazy item:
subcomposition defers measurement to layout time, so the list cannot size items ahead of scroll
and prefetching stops working.

## Pass conditions

### State and rendering

- Does each screen expose exactly one `StateFlow<UiState>` created with `stateIn(..., WhileSubscribed(5_000), ...)`?
- Are state variants a sealed interface, with all derived values as `get()` properties rather than constructor parameters?
- Are one-shot effects delivered over a buffered `Channel` collected under `repeatOnLifecycle(STARTED)`, and is every screen split into a stateless composable and a ViewModel-owning `Route`?
- Does every lazy list item supply both a stable `key` and a `contentType`, with no `indexOf()` in any key lambda?
- Does any lazy item contain a `SubcomposeLayout` or `BoxWithConstraints`?
- Are scroll- and drag-driven values read inside `offset { }`, `graphicsLayer { }`, or `drawBehind { }` rather than at composition?
- Is any screen carrying more than four or five separate lambda parameters instead of one `@Stable` actions interface?
