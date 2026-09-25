# Pre-launch checklist

Run the gates in order. Each gate has a machine check where one exists and an eyeball check where
it does not. A gate that fails blocks the "finished" claim; it does not block progress on the
others, so run the whole sweep and report once.

Commands assume a POSIX shell at the project root and a build served locally at
`http://localhost:3000`. Adjust the port and the source directory; do not skip a gate because
its command did not fit the stack.

---

## Gate 1 — Fabrication sweep (blocking, always)

Nothing on the page claims something that is not true.

    grep -rniE "testimonial|review|rating|trusted by|as seen in|customers|awards" src/ \
      --include="*.tsx" --include="*.jsx" --include="*.vue" --include="*.svelte" -l

For every file returned, answer per item: **who said this, and where did the number come from?**
Any item without an answer is fabricated and comes out. Then sweep the numeric claims, which hide
better than quotes do:

    grep -rnE "[0-9]+(,[0-9]{3})*\+? (users|customers|teams|companies|downloads)" src/
    grep -rniE "99\.9|uptime|SOC ?2|ISO ?27001|HIPAA|GDPR compliant|PCI" src/
    grep -rniE "[0-9]+x (faster|cheaper)|fastest|most secure|industry.leading" src/

Each hit is either owner-supplied, measured in this session with the method stated, or deleted.

---

## Gate 2 — Placeholder sweep (blocking)

    grep -rniE "lorem ipsum|dolor sit amet|jane doe|john doe|acme|example\.com|\
555-?[0-9]{4}|your company|company name|TODO|FIXME|placeholder|coming soon" src/ public/

Expect false positives in comments and fixtures; check whether each one reaches a visitor. Then
look for the visual placeholders grep cannot see: grey avatar circles, generic stock photography
standing in for the product, an icon set where two icons are obviously stand-ins.

---

## Gate 3 — Every link resolves (blocking)

Collect hrefs, then check them.

    grep -rhoE 'href="[^"]+"' src/ | sort -u

Internal: each path has a corresponding route file or static file. Anchors: each `#id` has an
element with that id **on the same page**. External: fetch them.

    grep -rhoE 'https?://[^" <)]+' src/ | tr -d "'" | sort -u | while read -r u; do
      code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$u")
      [ "$code" = "200" ] || echo "$code $u"
    done

Zero rows of output is the pass condition. Treat a 403 from a site that blocks bots as a manual
check, not a pass.

---

## Gate 4 — No dead controls (blocking)

    grep -rnE 'href="#"|href=""|onClick=\{\(\) *=> *\{ *\}\}|onSubmit=\{\(\) *=> *\{ *\}\}' src/
    grep -rnE 'alert\(|console\.log\(' src/ --include="*.tsx" --include="*.jsx"

Every interactive element ends in one of three states: it does its thing, it is disabled with a
visible reason, or it is deleted. There is no fourth state.

For each form: name the endpoint, name the success rendering, name the failure rendering. A form
whose endpoint is "to be wired up later" is a placeholder and belongs in the handback list, not
in the shipped page.

---

## Gate 5 — Error pages and states (blocking)

    curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/definitely-not-a-real-path

Expect 404, and expect the response body to use the site's own layout with navigation and a route
back. Force a 500 from one route and look at it. Then, for every view that fetches: throttle the
network to a slow profile and reload — a view that flashes from blank to populated has no loading
state. Block the request and reload — a view that shows nothing has no error state. `interface-states`
governs what those states should look like; this gate only establishes that they exist.

---

## Gate 6 — Site furniture (blocking)

    ls public/ | grep -iE "favicon|apple-touch-icon|icon-|og-|opengraph"
    grep -rn "<title>\|title:" src/app src/pages 2>/dev/null | head -40

Present and correct: favicon, apple-touch-icon, a distinct title per route, a meta description,
`theme-color`, and a share image that actually renders at 1200x630 — open the image file and look
at it, because a 1200x630 canvas with 14px text is technically present and useless. Confirm
`robots.txt` does not disallow the whole site, a leftover of many staging deployments.
`seo-and-metadata` governs correctness; this gate establishes presence.

---

## Gate 7 — Legal surfaces, by trigger (blocking when triggered)

Determine what the page actually does before deciding what it owes.

    grep -rniE "gtag|googletagmanager|analytics|posthog|mixpanel|hotjar|clarity|segment|\
plausible|fathom|fbq|pixel" src/ public/
    grep -rniE "document\.cookie|localStorage|sessionStorage|setCookie" src/
    grep -rnE '<iframe|src="https://(fonts|maps|www\.youtube|player\.vimeo)' src/
    grep -rniE 'type="email"|name="email"|<form' src/

No hits in any of the four and no forms: no notice is required, and adding one invents a
relationship that does not exist. Hits in the first three: a privacy notice, and consent for the
non-essential parts in several jurisdictions. Hits in the fourth: a privacy notice naming
controller, data, purpose, retention and a contact route. Accounts, payments or user content:
terms as well. Then confirm every legal link in the footer resolves — a 404 on `/privacy` is
worse than no link, because it asserts a document exists.

**The agent does not write any of these documents.** Name the requirement, name the trigger you
found and its file, hand it over.

---

## Gate 8 — The completion report (blocking, always)

Three lists, no prose summary in place of them.

    ## Real
    - Pricing table — 3 tiers, figures from brief section 4 — src/components/Pricing.tsx:12
    - Product screenshots — captured from the running build at /app — public/shots/*.png

    ## Placeholder (visible, marked, safe to ship or not)
    - Team photos — generic silhouettes, marked "replace" — src/components/Team.tsx:28
      Safe to ship: no. Reads as a real team of four.
    - Blog index — three posts of real copy, no further posts — src/app/blog/page.tsx

    ## Needs a human
    - Privacy policy — triggered by the Plausible script (src/app/layout.tsx:19) and the
      newsletter form (src/components/Signup.tsx:8). Counsel or the owner must write it.
      Footer link currently points at /privacy, which returns a pending-document page.
    - Testimonials — section removed. Supply 3 quotes with name, role, company, and
      permission to publish; slot markup kept at src/components/Social.tsx:1.
    - Uptime claim "99.9%" — removed from the hero. Reinstate only with a measurement or an SLA.

If the "Needs a human" list is empty on a first generation of a commercial site, the sweep was
not run properly. That list is almost never empty, and its emptiness is a stronger signal of a
missed gate than of a complete site.
