# Legal surface triggers

This reference maps **what the page technically does** to **what it therefore owes**, so the
decision is read off the code rather than guessed from the page's genre. It does not state the
requirements of any named statute, and it is not legal advice. Which rules apply, how they apply,
and what the documents must say vary by jurisdiction, by where the visitors are, and by what the
business does. Those questions belong to the owner's counsel.

What an agent can do reliably is detect the trigger and refuse to write the document.

---

## The trigger table

| What the page does | What it commonly owes |
| --- | --- |
| Static content, no forms, no cookies, no analytics, no third-party requests | Nothing. Do not add a policy. |
| Sets a cookie or writes to `localStorage` for non-essential purposes | Privacy notice; in several jurisdictions, prior consent for the non-essential parts |
| Loads analytics, a session recorder, a heat-mapper, or an ad pixel | Privacy notice covering it by name; consent where the jurisdiction requires it |
| Embeds a third-party font, map, video player, or widget | Disclosure that a third party receives the visitor's IP and request data |
| Collects an email address or any personal data | Privacy notice: who controls the data, what is collected, why, retention, contact route |
| Offers accounts, payment, or user-submitted content | Terms of service in addition to the privacy notice |
| Sends marketing email | A lawful basis or consent mechanism, and an unsubscribe route that works |
| Serves children, health, financial, or biometric data | Additional regimes apply. Stop and escalate; do not reason about these from first principles. |

Two properties of this table matter more than its rows. First, **the trigger is in the code you
just wrote** — an agent that adds an analytics snippet has created the obligation in the same edit,
which is why the check belongs in the ship sweep and not in a later review. Second, **the
obligations are cumulative**: a page with a signup form, a pixel and an embedded player owes the
union of three rows, not the most demanding one.

---

## Detecting each trigger

    # analytics, pixels, session recording
    grep -rniE "gtag|googletagmanager|google-analytics|posthog|mixpanel|amplitude|\
segment|hotjar|clarity|fullstory|fbq|facebook\.net|linkedin\.com/px" src/ public/

    # client-side storage
    grep -rniE "document\.cookie|localStorage|sessionStorage|js-cookie|setCookie" src/

    # third-party embeds that observe the visitor
    grep -rnE '<iframe|<script src="https://|href="https://fonts\.googleapis' src/

    # personal data intake
    grep -rniE '<form|type="email"|type="tel"|name="(email|phone|name|address)"' src/

    # payment
    grep -rniE "stripe|paddle|lemonsqueezy|paypal|checkout" src/

Report each hit with its file and line in the handback list. The file and line are what let the
owner's counsel answer the question in minutes instead of reading the site.

---

## Consent surfaces, if one is required

An agent may build the **mechanism** and must not write the **text**. A mechanism that is
technically correct:

- **Nothing non-essential fires before a choice is made.** A banner that appears while the
  analytics script has already loaded and set its cookie is decoration; it records a decision that
  was already taken. This is the single most common implementation error, and it is verifiable:
  load the page with the network tab open and confirm no non-essential request precedes the choice.
- **Refusal is as easy as acceptance** — same level, same prominence, one interaction. An "Accept
  all" button beside a "Manage preferences" link is not symmetrical.
- **The choice persists and is revocable** from a durable place, usually a footer link, so a
  visitor can change it after the banner is gone.
- **Essential and non-essential are separated**, and the categories describe what the scripts
  actually do rather than a generic three-tier list copied from another site.

Verify the first property by measurement, not by reading the code. Tag managers commonly load
their own dependencies in an order the source does not show.

---

## What the agent writes, and what it never writes

**Writes:** the trigger report, the route and the page shell, the footer link, the consent
mechanism, the retention behaviour the code actually implements, and a plain sentence on any
pending page stating that the document is not yet written and commits to nothing.

**Never writes, adapts, fills in, or copies from another site:** privacy policies, terms of
service, cookie notices, data processing terms, subprocessor lists, refund and cancellation terms,
SLAs, security or compliance statements, certification claims, accessibility conformance
statements, or any pricing that becomes an offer.

The mechanism is the visibility asymmetry. A missing privacy policy is a to-do the owner sees on
the first walkthrough. A generated one is a document that reads correctly, appears complete,
binds the owner to promises nobody at the company made — retention periods the systems do not
honour, subprocessors that are not used, rights procedures nobody staffs — and removes the only
signal that counsel was never involved. **The omission is loud and the invention is silent, which
is why the omission is the safe failure.**

---

## The handback entry

One entry per triggered document. Enough that a non-technical owner can act on it without reading
the codebase.

    ### Privacy notice — required, not written
    Triggered by:
      - Plausible analytics script — src/app/layout.tsx:19
      - Newsletter form collecting email — src/components/Signup.tsx:8
      - Embedded YouTube player on /product — src/app/product/page.tsx:64
    Who must act: the owner, or counsel if visitors are outside the home jurisdiction.
    Current state: /privacy returns 200 with a page stating the document is pending.
    Blocking launch: yes, while the analytics script and the form are live.
    Not done by the agent: the text of the notice. Requesting it is the whole action.

    ### Consent mechanism — built, unconfigured
    Non-essential scripts are gated and do not fire before a choice. Categories and copy
    are placeholders and must be replaced by the owner. Revocation link present in footer.

An owner who reads that knows what to do. An owner handed a generated policy does not know there
is anything to do, which is the outcome this reference exists to prevent.
