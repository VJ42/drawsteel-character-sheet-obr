# Handoff — Draw Steel Character Sheet (Owlbear Rodeo Extension)

Status as of this handoff: **both vanilla-TS/DOM spikes are done and verified,
React is settled as the framework for the whole sheet, and the full core-sheet
UI has been planned in concrete detail — section list, order, editing scope,
and a visual design direction.** No React component code exists yet. This
supersedes the previous `handoff.md` — that one covered the vendoring session
(derivation engine wired up, licensing housekeeping); this one covers a
planning-heavy session that started with the vitals spike and ended with a
committed, reviewable UI spec ready to build against.

Repo: https://github.com/VJ42/drawsteel-character-sheet-obr

For background, see the sibling project knowledge files (all committed under
`docs/` in the repo):
- `project-overview.md` — architecture decisions, stack, storage model, **now
  includes a full "Design" section and a concrete 13-section "Core sheet
  structure" table** — read this one first, it changed the most this session
- `ds-hero-format.md` — the `.ds-hero` data format
- `porting-notes.md` — the Forge Steel `HeroLogic` port (pin, stub, bundle size)
- This file's predecessor, `handoff.md` (superseded, but still has useful
  detail on the vendoring judgment calls and the React-vs-vanilla debate setup)

---

## What's already decided (do not re-litigate)

Everything from the previous handoff still holds, plus:

- No backend, static site, localStorage as source of truth, JSON export/import
  (the `.ds-hero` shape) as the sync story — **and this format is now also the
  extension's own native save/export format**, not just a Forge Steel import
  target (see `project-overview.md`'s "Editing model").
- Port Forge Steel's logic directly, GPL-3.0, pinned at
  `andyaiken/forgesteel@cf4dd8d181df48eed006b39192ac64afc1164112`.
- Vite + TypeScript, multi-page build eventually (one HTML entry per OBR surface).
- Two-tier editing model, expanded this session: session `state` **and now
  structural data too** are directly editable in-app (fix-up editing, scope
  (1) — not a rules-guided build wizard, scope (2), which stays out).

**New decisions from this session:**

- **React, for the whole sheet — settled, no longer open.** Decided after two
  vanilla spikes (see below) plus the editing-scope clarification. Full
  reasoning is in `project-overview.md`'s "Architecture decisions."
- **Visual design direction — settled.** Close to MCDM's own book styling in
  *structure*, restrained/monochrome in *execution*, following OBR's own
  light/dark theme rather than a fixed brand palette. System fonts, no custom
  icon font for v1 (the official Draw Steel Glyphs font is a cheap optional
  upgrade later, not a dependency). The whole styling layer is almost entirely
  CSS custom properties + native `<details>`/`<summary>` for collapsible
  sections — one small token file, one tiny bit of JS to sync with OBR's
  theme SDK, nothing else. Hard rule going forward: **no hardcoded colors in
  component files, only the token variables** — this is what keeps "restyle
  later" cheap, and it's easy to erode by accident if not enforced from the
  first component onward.
- **Concrete core-sheet section list and order — settled.** Taken directly
  from MCDM's own Expanded character sheet PDF (verified by fetching and
  reading it, not assumed from memory), 13 sections top to bottom. Full table
  is in `project-overview.md`. Build order is **top to bottom, matching the
  sheet itself** — the earlier vitals-then-features spike order was for
  de-risking the framework decision, not a build-order commitment, and there's
  no reason to keep it now that React is settled.
- **Both master-class bolt-ons (Beastheart, Summoner) are realistically v1**,
  not deferred. Checked directly against rules text (steelcompendium.io), not
  inferred from code:
  - **Beastheart companion** is cheap — a build-time pick from a fixed list
    (not the random `Collections.draw` the vendored update-logic does, which
    is just Forge Steel's own default-fill behavior), swappable in-play via a
    respite action, tracked with the same vitals/conditions UI as the hero
    itself (its `MonsterState` shape matches the hero's own `state` almost
    exactly), just pointed at `MonsterLogic` instead of `HeroLogic`.
  - **Summoner is three distinct things**, not one: (1) portfolio selection —
    a proper multi-select (`FeatureType.SummonChoice`, confirmed in code,
    same shape as `Skill Choice`), (2) minion/fixture reference cards — same
    `Monster`/`MonsterLogic` rendering as the companion, and (3) squad-pooled
    stamina tracking with a death-cascade rule, which is the one genuinely
    new piece of game logic in the whole project (not in the vendored code
    anywhere, since Forge Steel is a builder, not a combat tracker). Initially
    flagged as maybe-out-of-scope (conflated with on-token tracking, which
    *is* explicitly out of scope), but corrected: squad stamina is the player
    editing numbers on their own sheet, same category as the hero's own
    stamina track, not GM/token tracking — so it's in scope for v1 after all.
- **Draw Steel Tools sync is a named v2+ direction, not vague "later."**
  Specifically: investigate reading/writing DST's token metadata (repo
  `SeamusFinlayson/draw-steel-tools-2`, store name `draw-steel-tools`) for
  stamina/condition sync instead of building parallel on-token tracking.
  Confirmed this cross-extension-augmentation pattern is proven, not
  hypothetical, elsewhere in the same author's own ecosystem (Connected Dice
  augments DST when both are installed in the same room; Token Labels already
  ships a built-in Draw Steel condition library). The actual metadata schema
  isn't confirmed yet — next concrete step when this becomes active work is
  `git clone https://github.com/SeamusFinlayson/draw-steel-tools-2` and read
  it directly, same technique used to vendor Forge Steel. Worth reaching out
  to Seamus directly given how active/responsive he is and that his own
  extensions already interoperate.

---

## Current repo state (verified, not just reported)

Commit sequence, most recent first, each independently verified by pulling
fresh in a sandbox and diffing/building rather than trusting a pasted report:

1. `Add Design section and concrete core-sheet structure to project-overview.md`
   — docs only, verified byte-identical to the generated file, no other files
   touched.
2. `Update project-overview.md and ds-hero-format.md: expand editing model,
   settle React decision` — docs only, same verification.
3. `Features-list spike: render HeroLogic.getFeatures(), no React` — verified:
   `npm run build` zero errors, bundle ~765KB gzipped (matches the vitals
   build, since no new heavy deps), 35 features render against the fixture
   with the exact type mix independently reproduced via the derivation
   pipeline directly (not just trusting the browser screenshot, though a real
   one was also provided and matches).
4. `Vitals spike: vanilla TS/DOM hero loader, no React` — verified: zero
   build errors, bundle jump to ~764KB gzipped (matches `porting-notes.md`'s
   prediction exactly, since `HeroLogic` is now actually referenced), browser
   screenshot confirms all six vitals values exactly.
5. `Replace handoff.md with post-vendoring session handoff` — the previous
   handoff, now superseded by this one.
6. `Add license attribution and project README` — from the prior session.

**No React code exists yet.** `src/main.ts` and `src/features-panel.ts` are
both vanilla TS/DOM, deliberately — they were spikes to settle the framework
question, not the start of the real build. The actual React port hasn't
started.

**Verified working, from a clean pull:**

```
npm install
npm run build    # passes, zero errors
```

---

## The spike verdict, for context (already acted on, don't re-relitigate)

Two spikes were built specifically to settle React vs. vanilla honestly rather
than by preference:

- **Vitals spike** (stamina/recoveries/speed/stability, load-a-file-and-render):
  frictionless in vanilla. Inconclusive by design — flat, non-repeating values
  don't stress any UI approach.
- **Features-list spike** (`HeroLogic.getFeatures()`, a ~15-type discriminated
  union with recursion and a nested section-type switch inside `Ability`):
  real but manageable friction, concentrated specifically in the
  recursive/nested cases — correct, but verbose, repetitive DOM-subtree-
  building code where JSX would be terser and less error-prone.
- **The actual deciding factor wasn't the rendering friction, though** — it
  was the editing-scope clarification (any field, not just session state,
  needs to be directly editable). Once most of the sheet is a genuinely
  editable form, that's squarely React's strength, and running two rendering
  models side by side would cost more than it saves. React won on that basis,
  with the features-spike friction as corroborating evidence, not the primary
  reason.

---

## Immediate next action

**Start the React port, top to bottom, per `project-overview.md`'s "Core
sheet structure" table.** Suggested first chunk: **Header + Characteristics +
Kit** (sections 1–3) — none of these have a spike to port, so this is the
right place to establish the shared patterns everything else will reuse:

- The editable-field pattern (how a fix-up-editable structural field looks
  and behaves in React, since this is the first time we're building one)
- The design-token CSS file (colors, spacing, type scale) and the OBR-theme
  sync JS, since this is the first real UI and nothing has consumed the
  design direction yet
- Confirming the `<details>`/`<summary>` collapsible-section pattern works
  cleanly with React content inside

After that, continue straight down the table: Progression → Vitals (port the
spike) → Conditions → Resources → Features (port the spike) → Culture →
Career → Skills → Abilities → Inventory.

**Skills note for whoever builds section 11:** don't overbuild this. It's a
fixed category checklist (Crafting/Exploration/Interpersonal/Intrigue/Lore),
not traced back to whichever scattered `Skill Choice` feature granted it —
toggling a box writes to a single hero-level manual-overrides bucket layered
on top of `HeroLogic.getSkills()`. This was explicitly corrected mid-session
after an earlier, overcomplicated design (tracing skills back to their
granting feature) was rightly pushed back on — the paper sheet is just a
checklist, and ours should be too.

---

## Working process established (carry forward, unchanged from before)

- **Checkpointed prompts, not one-shot.** Each Claude Code session should end
  in an independently verifiable state — a passing build, a matching terminal
  output — not just a self-report of a long task list completed.
- **Verify independently, every time.** Clone/pull fresh, run the actual
  commands (`npm run build`, `npm run dev`, `git diff`) rather than trusting
  a pasted report, even when the report looks detailed and honest (it has
  been, consistently — but verify anyway). This session caught one real gap
  this way: a docs commit that existed locally but hadn't been merged to
  `main` yet — worth double-checking `git log` on the actual remote, not just
  trusting "done."
- **Ask Claude Code to surface judgment calls explicitly** rather than
  silently picking a path when instructions don't cover something. Every
  judgment call reported so far has held up under independent checking.
- **Docs get committed into `docs/` in the repo**, verbatim-replaced when
  updated, not just attached to a chat session — future sessions won't have
  the attachment, only what's in the repo.
- **When rules details matter (master-class mechanics, edge cases), check the
  actual rules text (steelcompendium.io) rather than inferring from the
  vendored code alone.** The vendored code's own defaults (e.g. companion
  `Collections.draw`) can be Forge Steel's own placeholder behavior, not the
  actual rule — this distinction mattered concretely this session.

---

## Session note (context, not a project fact)

This session was almost entirely planning/design, prompted by "let's think
through the UI" before writing any React code. It's worth a future session
knowing the UI plan is a deliberate, checked-against-real-sources spec
(the actual MCDM PDFs, the actual steelcompendium.io rules text, the actual
vendored `feature.ts`/`monster.ts` model shapes), not a guess — so it should
be trusted and built against directly rather than re-derived from scratch.
