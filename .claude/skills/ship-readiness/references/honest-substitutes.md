# Honest substitutes

Every fabrication exists because a layout has a slot and the slot has nothing to put in it. The
answer is never to fill the slot with an invention, and it is rarely to leave a visibly broken
gap. It is to change what the slot is for, so the page is honest at full strength rather than
dishonest at full strength or honest at half.

The test for every substitute below: **a stranger reading the page forms no belief that is
false.** Not "technically defensible" — no belief that is false.

---

## Social proof with no customers

**Do not** invent quotes, generate faces, place logos of companies that are not customers, or
render star ratings and review counts.

**Instead**, pick whichever of these is true:

- **Cut the band entirely.** An early product with a clear value proposition and no testimonial
  section reads as early. That is accurate, and accuracy is a positioning choice a founder is
  allowed to make.
- **Substitute a different kind of evidence that is real.** A screenshot of the product doing the
  thing. A worked example with real numbers. A published changelog. An open-source repository and
  its star count. A named founder with a real bio and a reachable address. Each of these does the
  job a testimonial does — reducing the reader's risk — without a claim about a third party.
- **Say what stage it is.** "Currently in private beta with eight teams" is social proof if it is
  true, and it is a sentence the owner can confirm or correct in one word. Put it in the handback
  list as a claim awaiting confirmation rather than shipping it unconfirmed.
- **Keep the slot, remove the content.** Leave the markup, the spacing and the responsive
  behaviour in place behind a flag or a comment block that states exactly what is required: three
  quotes, each with name, role, company, and permission to publish. The owner then fills a form,
  not a design problem.

A fabricated testimonial removed from the page costs one section. A fabricated testimonial noticed
by a reader costs every other claim on the page, because the reader now has no way to tell which
of them were also generated.

---

## A hero for a product nobody can see

Rank by how much the visitor can verify:

1. **The product itself, embedded or linked.** A live sandbox, a public URL, a playable state.
2. **A recording of the real product.** A 20-second screen capture beats a polished animation of
   an interface that does not exist, because the capture cannot be made without the thing.
3. **Annotated screenshots of a real build.** Real pixels, real data shapes, callouts explaining
   what is on screen.
4. **A concept mock, labelled as one.** "Concept — the product is in development" in text a
   visitor will actually read, not 11px grey under the fold.

Everything above the line is evidence. Number four is honest intent. A number four with the label
removed is a fabrication, and the label is the only thing separating them.

**When there is nothing to show,** change the page's job. A waitlist page that says what is being
built, who it is for, and when it will be ready needs no demo: it promises nothing visible and
therefore misleads nobody. Announce the constraint instead of papering over it, and tell the owner
plainly that the page currently sells a promise.

**A "Watch demo" button with no demo** gets deleted, not disabled. A disabled primary CTA still
asserts that a demo exists and is temporarily unavailable.

---

## Numbers that were never measured

Uptime, latency, throughput, conversion lift, time saved, users, revenue, growth rate,
certifications. Three legitimate sources, and no fourth:

- **Owner-supplied**, recorded as such in the handback list so it is traceable later.
- **Measured in this session**, published with the method and conditions in the same breath — "1.2s
  first load on a throttled 4G profile, cold cache, Moto G4 class device" — because a number
  without conditions is a different claim from the one that was measured.
- **Cited to a public source** that the visitor can follow, with the link on the page.

Where none of the three applies, write the mechanism instead of the magnitude. "Deploys run on
every push, so a fix reaches production in one step" makes a checkable structural claim. "10x
faster deploys" makes an unfalsifiable numeric one, and it is the numeric one a regulator or a
disappointed customer quotes back.

---

## Content slots with no content

- **Body copy.** Write the shortest true version, not filler to the length of the mock. A card
  with one accurate sentence is finished; the same card with three sentences of invented detail
  about a feature set nobody specified is a fabrication with good rhythm.
- **People.** No generated faces, no stock portraits presented as staff. Initials in a coloured
  circle, or no team section.
- **Logos and brand marks.** A wordmark in the site's own type is honest. A generated logo the
  owner has not seen is a brand decision an agent is making silently; flag it as provisional.
- **Blog and changelog indexes.** Three real entries beat twelve invented ones. An empty index
  with a line explaining what will appear is better than either.
- **Contact details.** No invented addresses, phone numbers or support emails. A form that posts
  somewhere real, or the owner's actual address, or nothing.
- **Case studies and metrics dashboards.** If the data is sample data, label it sample data
  **inside the component**, where a reader sees it, not only in a code comment.

---

## The framing that makes this easy to accept

An agent that omits is easy to correct: the owner sees the gap, fills it, and ships. An agent that
invents produces an artefact that looks finished and is a liability, and the person who discovers
the difference is a customer, a journalist, or a regulator rather than the owner.

So the default is always the same. **Omit, mark, and hand back.** A site that is visibly 90 per
cent done is a working relationship. A site that is invisibly 70 per cent fabricated is a problem
with the owner's name on it.
