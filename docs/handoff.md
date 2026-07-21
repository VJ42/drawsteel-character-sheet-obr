# Handoff — Draw Steel Character Sheet (Owlbear Rodeo Extension)

Status as of this handoff: **the derivation engine is vendored, wired up, and
verified working inside the real Vite build.** Licensing/attribution
housekeeping is done. No UI/sheet code exists yet. This supersedes the
previous `handoff.md` in `docs/` — that one covered research/planning before
any code existed; this one covers the first real implementation session.

Repo: https://github.com/VJ42/drawsteel-character-sheet-obr

For background, see the sibling project knowledge files (all committed under
`docs/` in the repo):
- `project-overview.md` — architecture decisions, stack, storage model
- `ds-hero-format.md` — the `.ds-hero` data format
- `porting-notes.md` — the Forge Steel `HeroLogic` port (pin, stub, bundle size)
- This file's predecessor, `handoff.md` (superseded, but has the original
  build-plan phases 2–5 which are still accurate for later work)

---

## What's already decided (do not re-litigate)

Everything from the previous handoff still holds:
- No backend, static site, localStorage as source of truth, JSON export/import
  as the sync story.
- Port Forge Steel's logic directly, GPL-3.0, pinned at
  `andyaiken/forgesteel@cf4dd8d181df48eed006b39192ac64afc1164112`.
- Vite + TypeScript, multi-page build eventually (one HTML entry per OBR surface).
- Two-tier editing model: session `state` edited directly, structural data
  changed only by re-import, re-import preserves `state`.

**New decisions from this session:**

- **React stays installed as a dependency**, but this is *not* currently load-bearing
  for the vendored port (see "Loose thread" below) — it was a deliberate call
  to keep it around cheaply in case we want it later, not a requirement.
- **Whether the sheet UI itself uses React or plain vanilla TS/DOM is still
  open** — see "Immediate next action."
- **We do not need a second rules-data source (SteelCompendium or similar).**
  MCDM is the sole source of truth; Forge Steel is downstream of it for
  character-building (which is what we need), SteelCompendium is downstream
  of it for rules reference (which we don't need — see reasoning below).
- **Ability/feature rules text is fully self-contained in the `.ds-hero`
  export.** Every ability already carries its own description and effect
  text inline (verified against the sample). Nothing external is needed to
  render any ability or feature correctly.

---

## Current repo state (verified, not just reported)

Commit sequence so far, each independently verified by cloning fresh and
running the actual commands (not just trusting Claude Code's self-report):

1. `Initial commit`
2. `Add project planning docs` — `docs/` populated with the four files above
3. `Scaffold Vite + React + TypeScript project` — stock scaffold, builds clean
4. `Vendor Forge Steel logic/models/enums/utils/data` — wholesale copy of the
   pinned commit into `src/forgesteel/`, unmodified, build fails as expected
   (unresolved `@/` imports)
5. `Fix vendored port imports; get build to zero errors` — see judgment calls below
6. `Add pipeline verification script (awaiting sample fixture)`
7. `Add sample hero fixture; verify pipeline end-to-end`
8. Housekeeping commit — `CREDITS.md`, `src/forgesteel/README.md`, and a
   rewritten root `README.md` (was stock Vite boilerplate). User confirmed
   directly on GitHub; I could not independently verify this specific commit
   due to a tool outage (see "Session note" at the end).

**Verified working, by me, from a clean pull — not trusting any pasted output:**

```
npm install
npm run build    # passes, zero errors
npm run verify   # runs the vendored HeroLogic against fixtures/Unnamed_Hero.ds-hero
```

`npm run verify` output matches every expected value from `porting-notes.md`
exactly:

```
stamina: 21
windedThreshold: 10
recoveries: 12
recoveryValue: 7
speed.value: 6
stability: 0
disengage: 2
size.value: 1, size.mod: 'M'
skills.count: 9 (Blacksmithing, Carpentry, Empathize, Forgery, Heal, Lie, Persuade, Read Person, Swim)
languages: Caelian, Riojan, Vaslorian
kits: Arcane Archer
featureCount: 35
```

This is the real go/no-go gate the original handoff called for, and it's
passed — inside the actual bundler, not just the old standalone Node harness.

**Bundle size note:** current build is tiny (~60KB gzipped) because nothing
in `App.tsx` imports the vendored logic yet — it's all tree-shaken out.
The ~739KB gzipped figure from `porting-notes.md` only becomes real once the
UI actually references `HeroLogic` et al.

---

## Judgment calls made during vendoring (verified, reasoning sound)

Worth knowing so nobody re-litigates them or gets confused by the diff later:

- **`verbatimModuleSyntax` and `erasableSyntaxOnly` removed from
  `tsconfig.app.json`.** These are strictness flags in *our* scaffold, not
  upstream's. The vendored code uses real TS enums throughout `enums/`
  (disallowed under `erasableSyntaxOnly`) and non-verbatim type imports
  throughout `data/`/`models/` (882 errors under `verbatimModuleSyntax`).
  Turning them off was the only way to avoid hand-editing hundreds of
  vendored files, which the no-edits vendoring rule forbids.
- **Excluded from the TS program** (new `exclude` in `tsconfig.app.json`):
  all vendored `*.test.ts`/`*.test.tsx`, plus `logic/classic-sheet/`,
  `logic/hero-sheet/`, `logic/playbook-sheets/`, and `data/tip-data.ts`.
  These reach into Forge Steel's own React/Ant Design UI layer, which
  `project-overview.md` explicitly says we're not porting. Confirmed via
  grep that `hero-logic.ts`'s real import chain never touches any of them.
- **`guid()` uses `crypto.randomUUID()`**, not the `uuid` package — matches
  `porting-notes.md`'s explicit recommendation to keep `showdown` the only
  new runtime dependency.
- **`utils.ts`'s showdown import is a default-import-plus-destructure**, not
  a named import — showdown's UMD bundle isn't statically analyzable by
  Node's native ESM loader (used by `tsx` when running the verify script),
  even though it works fine under Vite/esbuild's bundler-time interop. The
  fix works identically under both.
- **`hashCode` copied verbatim** from upstream, as required (cyrb53-style,
  used for `FeatureFlags` — a reimplementation would silently break it).
- **`porting-notes.md`'s mention of a `debounce` utility is stale/inaccurate**
  — no such function exists anywhere in the actual pinned commit. Nothing
  references it, so nothing was lost by not inventing one.

### Loose thread worth resolving, not urgent

The reasoning for keeping `react`/`react-dom`/`@vitejs/plugin-react` installed
was "so the two vendored `.tsx` files in `logic/classic-sheet/` type-check."
But the fix that actually landed **excludes** `classic-sheet/` from the TS
program entirely (see above), rather than relying on React being installed.
So as things stand, **React is currently not structurally required for the
vendored port to build at all** — it's installed purely as a deliberate,
low-cost bet on possibly wanting it later (explicit user decision, not a
mistake). Worth being clear-eyed about this distinction if the
React-vs-vanilla UI question comes up again: keeping the dependency installed
and choosing to build the UI in React are two separate decisions, and only
the first one has been made.

---

## Big questions discussed and where they landed

### 1. React vs. vanilla TS/DOM for the sheet UI — open, has a plan

Real debate, not resolved by vibes: the user (rightly) pushed back on
defaulting to React just because it's familiar/common, when the actual
interaction requirements might not need it. Conclusion: **don't keep
debating it abstractly — spike it.**

**Agreed next step:** build the *vitals* section (stamina / recoveries /
speed / stability — the first, simplest piece of Phase 1 step 3 from the
original build plan) in plain vanilla TypeScript/DOM, wired to the now-proven
`HeroLogic` output. See if hand-syncing that small a UI feels fine or starts
to itch. If it itches, that's real evidence React earns its place for the
rest of the sheet. If it doesn't, we've saved a dependency and probably
know the rest of the sheet is fine too.

**Important scope correction made mid-discussion:** an earlier argument for
React (a live-updating stamina bar / winded indicator reacting to typed
input) was **invented, not spec'd**. Checked against `project-overview.md`
and `handoff.md` directly — the actual documented requirement for Phase 3 is
just "edited directly in the sheet, writes go to `state`, persisted to
localStorage." No cross-component live-reactivity is actually required by
anything written down. Don't reintroduce that assumption without noticing
it's an assumption.

### 2. GM-facing tools (NPC cards, negotiation/encounter/montage sheets) — confirmed feasible, real v2 scope

Checked directly against the vendored source rather than guessing:
Forge Steel's `logic/` (vendored wholesale) already contains
`monster-logic.ts` (820 lines, same `getX(monster)` pattern as `HeroLogic`),
`negotiation-logic.ts`, `encounter-logic.ts`, `montage-logic.ts`,
`session-logic.ts`, and a `playbook-sheets/` layer with dedicated sheet
builders. `data/monsters/` has 57 monster stat blocks already vendored
(~39.7k lines). **None of this needs re-vendoring — it's already sitting in
the repo, unused, because we vendored `logic/` and `data/` wholesale rather
than cherry-picking `hero-logic.ts` specifically.**

Honest framing: this is a genuine v2 (a different UI mode — GM creates/manages
encounters, not just imports one hero), not a small bolt-on. But whatever we
land on for state-handling in the vitals spike will likely generalize to
this too, since the derivation layer outputs plain data either way.

### 3. Master classes (Beastheart, Summoner) with alternate sheet structure

Checked directly: `hero-logic.ts` calls `SummonLogic.getSummonedMonster()`,
which attaches a full `Monster` object (a different model shape entirely)
onto a hero via a `Summon` feature. This is **not architecture-breaking** —
`HeroLogic.getFeatures()` already resolves it as just one more entry in the
flat feature list, and the existing plan already has the right shape of
answer (Phase 1 step 4: fallback to name+description for feature types
without a dedicated renderer yet). Concretely: **eventually needs one more
feature-type-specific component (a Monster stat-block renderer)**, same
pattern as ability cards or domain features, not a redesign.

### 4. SteelCompendium / external rules reference — resolved, not needed

User's framing, and it's correct: MCDM is the sole source of truth.
Forge Steel = character builder (what we need, already integrated).
SteelCompendium = rules reference (a different job we don't have). We
verified the `.ds-hero` export carries full rules text inline per ability, so
no external rules source is needed to render anything correctly. The only
gap: generic recurring terms not spelled out per-ability (what "winded"
means, potency thresholds like `[weak]`/`[average]`/`[strong]`, edge/bane).
A small static glossary would be the only thing worth building here, and
only as an optional, decoupled v2+ nicety — not planned, not blocking.

---

## Immediate next action

**Build the vitals-section spike in plain vanilla TypeScript/DOM** —
stamina, recoveries, speed, stability — reading from the already-verified
`HeroLogic` pipeline (reuse the pattern from `scripts/verify-pipeline.ts`,
but rendering to actual DOM elements instead of `console.log`). No framework
decision beyond "don't use React for this one section." This is a genuine
test, not a foregone conclusion — evaluate honestly afterward whether it
felt fine or started to hurt before deciding anything about the rest of the
sheet.

After that: continue Phase 1 step 3 section-by-section (characteristics →
skills/languages → features list → abilities), per the original build plan,
informed by whatever the spike shows.

---

## Working process established this session (carry forward)

- **Checkpointed prompts, not one-shot.** Each Claude Code session should
  end in a state that's independently verifiable — a passing build, a
  matching terminal output — not just a self-report of a long task list
  completed.
- **Verify independently, every time.** Clone fresh, run the actual commands
  (`npm run build`, `npm run verify`, `git diff`) rather than trusting
  Claude Code's pasted report, even when the report looks detailed and
  honest (it has been, consistently — but verify anyway).
- **Ask Claude Code to surface judgment calls explicitly** rather than
  silently picking a path when instructions don't cover something. This has
  worked well — every judgment call reported so far has held up under
  independent checking.
- **Docs get committed into `docs/` in the repo**, not just attached to a
  chat session, so future sessions (which won't have the attachment) can
  still read them.

---

## Session note (not a project fact, just context)

Partway through this session, the bash tool used for independent
verification stopped being available (`Tool 'bash_tool' not found`,
consistently, across retries). Best guess: opening a separate context window
to discuss licensing may have torn down the sandbox session backing this
one. Not a code/project issue — just means the final housekeeping commit
(`CREDITS.md`, `src/forgesteel/README.md`, `README.md` rewrite) was verified
by the user reading the files directly on GitHub rather than by me running
`git diff` myself, unlike every prior commit in this session.
