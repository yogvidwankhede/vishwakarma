# Accessible names

## How the name is computed

For most interactive elements the accessible name is resolved in this order, first match
winning:

1. `aria-labelledby` (concatenates the referenced elements' text)
2. `aria-label`
3. The element's own content — button text, link text, `alt` on an image inside it
4. `title` (a weak last resort; not announced by every combination)

Two consequences follow. First, `aria-label` silently discards visible text, so it is the
easiest way to make the interface say two different things at once. Second, an icon-only
button with no name at all is announced as just "button", which is a dead end.

## The Label in Name rule

WCAG 2.2 SC 2.5.3 requires that where a control has visible label text, the accessible name
contains that text. The mechanism is voice control: a user saying "click Save" has their
utterance matched against the accessible name, not the pixels. If the name is "Submit form"
the command fails silently, and the user has no way to discover why.

```html
<!-- Broken: voice command "click Save" does not match -->
<button aria-label="Submit form">Save</button>

<!-- Broken: word order differs; some matchers still fail -->
<button aria-label="Draft save">Save draft</button>

<!-- Correct: the name extends the visible text, in order -->
<button aria-label="Save draft to your workspace">Save draft</button>

<!-- Usually best: no aria-label at all -->
<button>Save draft</button>
```

The practical rule: if there is visible text, do not add `aria-label`. Reach for it only
when there is no visible text, or when the visible text is genuinely insufficient and the
extended name still begins with it.

## Icon-only controls

```html
<!-- Announced as "button" -->
<button><TrashIcon /></button>

<!-- Named, and the icon hidden from the tree so it is not announced twice -->
<button aria-label="Delete invoice">
  <TrashIcon aria-hidden="true" />
</button>
```

Name the action, not the icon. "Trash" describes the picture; "Delete invoice" describes
the outcome. Where the object matters and repeats — a delete button per table row — include
it: "Delete invoice INV-1042". Twelve buttons all named "Delete" are indistinguishable in a
screen reader's element list.

## Link text

Screen reader users commonly navigate by listing every link on a page, stripped of
surrounding context. WCAG 2.4.4 (Link Purpose, in Context) is the Level A floor; writing
links that stand alone satisfies the stricter 2.4.9 and is simply better copy.

- Bad: `To migrate, click here.`
- Good: `Read the migration guide.`
- Bad: five cards each ending `Read more`
- Good: `Read more about pricing`, or keep the visible "Read more" and extend the name:
  `<a aria-label="Read more about pricing">Read more</a>` — the visible text is preserved
  and leads the name, so 2.5.3 still holds.

Never write "link" into link text; the role is already announced.

## Alt text

Alt text is a substitute, not a description. Ask what the image is doing in the page.

- Informative image: state the information. `Revenue rose from 2.1M in Q1 to 3.4M in Q3.`
  Not `Chart`.
- Functional image (inside a link or button): describe the destination or action, not the
  picture. A logo linking home is `alt="Acme home"`, not `alt="Acme logo"`.
- Decorative image: `alt=""` — empty, present, not omitted. A missing `alt` attribute
  makes some screen readers announce the filename.
- Text in an image: reproduce the text exactly.

Do not begin with "Image of" or "Photo of"; the role is announced already. Keep it under
roughly 150 characters and move anything longer into visible body copy or a caption, which
benefits everyone.

## Names for structure

- Multiple `<nav>` landmarks need `aria-label` to distinguish them ("Primary",
  "Breadcrumb", "Footer"). Do not write "Navigation" — the role adds that word.
- Dialogs need an accessible name, ideally via `aria-labelledby` pointing at the visible
  heading, so it can never drift out of sync with what is on screen.
- Tables need a `<caption>` or a labelled region when there is more than one.
- Form fields need a `<label for>`; `aria-label` on an input hides the name from sighted
  users and removes the click-to-focus behaviour a real label provides.

## Announcing changes

Copy that appears without a page change — validation results, toasts, save status — needs a
live region, or it is written for nobody. Use `aria-live="polite"` for status and
`role="alert"` (implicitly assertive) for errors that block progress, and keep the message
short: assertive regions interrupt whatever is being read.

The region must exist in the DOM before the message is inserted. Mounting a live region and
its content in the same render frequently produces no announcement at all.

## Quick audit

1. Tab through the interface. Does every stop announce a name that is a verb phrase or a
   clear noun?
2. Does any control have an `aria-label` that does not begin with its visible text?
3. Are any two controls on the screen announced identically?
4. Does every image have an `alt` attribute, including the decorative ones?
5. Would the list of all links on the page make sense read on its own?
