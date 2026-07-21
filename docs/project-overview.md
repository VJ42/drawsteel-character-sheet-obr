# Draw Steel Character Sheet — Owlbear Rodeo Extension

## What this is

An Owlbear Rodeo (OBR) extension that displays a full Draw Steel character sheet
inside the VTT. Characters can either be imported from a `.ds-hero` file
exported by Forge Steel (https://forgesteel.net), or built and fully owned
from scratch inside the extension itself — see "Editing model" below, this
was clarified/expanded in a later session and is important context for
anyone picking this up.

Scope note: this is a **full sheet** (abilities, features, kit, characteristics),
not a token tracker. Draw Steel Tools already covers on-token stamina/resource
tracking well; this extension complements it rather than replacing it.

---

## Architecture decisions (settled — do not re-litigate)

**Static site, no backend.** The extension is a static web app. Every character
sheet extension in the OBR ecosystem works this way. Reasons:

- OBR gives extensions a player ID, but it is **not authenticated** — it's just a
  string handed to the iframe. Anyone could claim any player ID. A real backend
  would require building actual auth, which is disproportionate for a character
  sheet.
- Static hosting is free, trivial to deploy, and has no ongoing cost or ops burden.

**localStorage is the source of truth** for full hero objects. Multiple save
slots so one browser can hold several heroes.

**The extension's own export/import is the sync and backup story, and it uses
the `.ds-hero` JSON shape.** There is no cloud sync. Users move characters
between devices by exporting and re-importing. Reusing the `.ds-hero` shape
(rather than inventing a separate save format) means a character built
entirely inside the extension can, if a player later wants it, also be opened
in Forge Steel — free compatibility, not a requirement we're designing around.
This is the same general approach the Shadowdark sheet and Forge Steel itself
use for import/export.

**Player metadata is used only for GM visibility** — a summary (or the sheet) is
published to player metadata so the GM's client can read all players' sheets via
the party API. Not used as primary storage.

**Room metadata is not used for character data.** 16kB hard cap across all
extensions in the room. A bare level 1 `.ds-hero` export is **120 KB** — nearly
8× the cap — because the format embeds every unselected option. localStorage
(typically 5–10 MB) is fine, but consider storing the *parsed and filtered*
hero rather than the raw file, and keep the raw file only if re-parsing on
version upgrades turns out to matter.

**UI framework: React, for the whole sheet.** Settled after two spikes (vitals,
then the features list — both vanilla TS/DOM) plus a scope clarification on
editing (see below). Reasoning:

- The vitals spike (flat values, no repetition) was frictionless in vanilla —
  inconclusive by design, since it wasn't a fair test.
- The features-list spike (a ~15-type discriminated union, with recursion into
  nested features and a nested section-type switch inside `Ability`) found
  real, compounding friction in vanilla: correct behavior, but verbose,
  repetitive DOM-subtree-building code where JSX would be terser and less
  error-prone (forgetting to clear/rebuild a container, wrong append order).
- The decisive factor, though, was the editing-scope clarification below, not
  the rendering friction: once most of the sheet needs to be a genuinely
  editable form (not just re-render-on-reimport), that's squarely React's
  strength, and running two rendering models side by side (React for editable
  fields, vanilla for static structural display) would be more complexity than
  running one framework throughout.
- Practical bonus: `react`/`react-dom`/`@vitejs/plugin-react` were already kept
  installed as a deliberate low-cost bet during vendoring, specifically in case
  this decision landed here.

---

## Editing model

**Clarified and expanded in a later session — read this whole section, it
changes what "structural data" being re-import-only used to imply.**

Two tiers of data, same as before:

- **Session state** — everything under the export's `state` key: `staminaDamage`,
  `recoveriesUsed`, `surges`, `victories`, `heroTokens`, `conditions`,
  `inventory`, `projects`, `titles`, `notes`. Edited directly in the sheet.
- **Structural data** — everything else: class, ancestry, culture, career,
  abilities, features, kit, characteristics.

**What changed:** structural data is *not* exclusively re-import-only anymore.
Re-importing from a Forge Steel `.ds-hero` export remains the primary, common
path — it's a well-used community tool, and players who build there
shouldn't have to duplicate that work by hand. But it's a convenience
on-ramp, not the only door in. **Any field, structural or session-state,
must also be directly editable inside the extension itself**, so a player
can build and fully own a character from blank without ever touching Forge
Steel.

This is deliberately **scope (1), not scope (2)** — worth being precise about
the distinction, since it's easy to overscope this by accident:

1. **Fix-up / direct-field editing (this is what's in scope).** Every field
   the importer currently treats as read-only-until-reimport becomes directly
   editable — change a skill choice, correct a kit selection, add a homebrew
   feature, build a character from an empty shell. No rules-guided wizard, no
   enforcement of Draw Steel's build rules (prerequisites, level-gating,
   `selectAt` timing, primary characteristic legality) — the player is trusted
   to make legal choices, same as Forge Steel's own importer already assumes
   ("imported data may not be rules-legal," per `ds-hero-format.md`).
2. **Full guided character creation (explicitly NOT in scope).** Reimplementing
   Forge Steel's actual build wizard — step-by-step ancestry → culture → class
   → kit → ability selection with rules enforcement at each step. This would
   mean re-vendoring or reimplementing Forge Steel's own React/Ant Design UI
   selection logic, which `porting-notes.md`/the vendoring work deliberately
   excluded (`classic-sheet/`, `hero-sheet/`, `playbook-sheets/`). Not
   happening — if a player wants guided building, Forge Steel is that tool,
   and re-importing its output remains the fast path.

**Re-import rule (for the Forge Steel path specifically): replace everything,
preserve `state`.** Forge Steel stores session values as deltas (damage taken,
recoveries used) rather than current totals, so preserved state stays valid
even if max stamina changes. Because `inventory`, `projects` and `titles` live
under `state`, they are ours to edit, not Forge Steel's to overwrite. This rule
is unchanged — it only applies when a player chooses to re-import from Forge
Steel over an existing character; it says nothing about whether structural
fields can be hand-edited between re-imports, which they now can be.

**Skills are edited as a plain checklist, not traced back to their granting
feature.** Skills are scattered across many different `Skill Choice` features
(ancestry, culture, career, class), but the sheet doesn't need to model that
for editing purposes — the paper sheet is just a checklist, and ours should be
too. `SkillsPanel` renders the fixed category grid (Crafting, Exploration,
Interpersonal, Intrigue, Lore, from the vendored skill data), checks the boxes
that appear in `HeroLogic.getSkills(hero)`, and toggling a box writes to a
single hero-level manual-overrides bucket layered on top of whatever the build
features resolve — not into whichever scattered feature happens to "own" that
slot. Keeps the panel itself dumb (render grid, toggle box) and keeps
"which feature technically granted this" out of the UI entirely, consistent
with scope (1) not caring about build legality.

---

### Storage decision table

| Data | Where it lives |
| --- | --- |
| Full hero object (imported or built in-app) | localStorage (save slots) |
| Session state (stamina, recoveries, heroic resource, surges) | localStorage, merged on re-import |
| GM-visible summary | Player metadata |
| Anything token-attached | Item metadata (only if we add token features later) |
| Backup / cross-device | User-initiated export in `.ds-hero` shape |

---

## Design

**Reference is the actual MCDM character sheets, not just inspiration.**
https://www.mcdmproductions.com/draw-steel-resources lists five player sheet
types (Standard, Alternative, Expanded, Summoner, Beastheart). Checked
directly (PDF text extraction, not assumption): Standard/Alternative/Expanded
are the same underlying fields in different print layouts — Expanded's one
genuinely useful idea is grouping abilities by action type (Main Actions /
Maneuvers / Triggered Actions), which we're adopting. Summoner and Beastheart
add class-specific sections on top of the same core (see "Master class
bolt-ons" below). The section list and order in "Core sheet structure" below
is taken directly from the Expanded sheet, since it's the fullest and closest
match to what a digital sheet needs — this is the content spec, not
inspiration to riff on. Layout/field order on a TTRPG character sheet isn't
brand-protectable — many systems share this general shape — so following it
closely is fine license-wise. What we're deliberately *not* copying is MCDM's
specific visual trade dress (their exact typography, logo, color scheme,
page-as-object styling); see "Visual direction" below.

### Visual direction

Settled: **close to MCDM's book styling in structure, but restrained and
monochrome in execution, following the OBR theme rather than a fixed brand
palette.**

- **Near-monochrome.** The real paper sheets are mostly black-and-white line
  art (boxes, checkboxes, thin rules) — a restrained palette isn't a
  compromise from the book look, it's consistent with it.
- **Follow OBR's light/dark theme**, read via the SDK (`OBR.theme` /
  `OBR.theme.onChange`), rather than a fixed "brand" palette. The sheet
  shouldn't visually clash with the rest of the OBR chrome it's rendering
  inside.
- **System font stack, no custom display/serif faces.** Keeps it visually
  consistent with native OBR panels and keeps the whole styling layer small.
- **No custom icon font for v1.** MCDM does provide an official "Draw Steel
  Glyphs" font (on the same resources page) that the paper sheets use for
  action-type/keyword icons, but given the "keep it basic" direction, v1 uses
  plain text labels instead. Adopting the glyph font is a cheap, optional
  later upgrade, not a v1 dependency.
- **Mobile-friendly by construction, not as an afterthought.** Single-column
  at narrow widths; the collapsible section design (below) is what makes
  content fit in a narrow OBR popover without needing tabs or a second
  navigation layer.

**Why this is a good brief, not just a preference:** it's small and
well-defined — a handful of CSS custom properties, not a design system to
build. Restyling later (e.g. adding a steel-blue or MCDM-red accent, or the
glyph font) means editing the token file, not touching component code,
*provided* the no-hardcoded-colors rule below is actually followed.

### Implementation: mostly CSS

Given the above, the design layer is almost entirely CSS, not JS:

- A small set of **CSS custom properties** — a handful of color tokens
  (`--text`, `--bg`, `--border`, `--muted`, one restrained `--accent` for
  interactive/edit affordances), one spacing scale, one type scale. Defined
  once, consumed everywhere.
- **Layout** via flex/grid + media queries for the narrow-popover/mobile case.
- **Native `<details>`/`<summary>`** for collapsible sections, lightly styled
  — no custom accordion component, no JS state management for open/closed.
- The one non-CSS piece: reading OBR's theme via the SDK and toggling a
  `data-theme` attribute (or similar) that the CSS variables key off. Small,
  one-time, not repeated per component.

**Hard rule for anyone writing component code (including future Claude Code
sessions): no hardcoded colors in component files — only the CSS variables
from the token file.** This is what keeps "restyle later" cheap. Violating it
component-by-component is exactly how a small, clean token system quietly
erodes into an unmaintainable pile of one-off styles.

### Core sheet structure

Section list and order, top to bottom, taken directly from the Expanded
character sheet:

| # | Section | Component | Source |
| --- | --- | --- | --- |
| 1 | Character Name, Ancestry, Class, Career, Subclass | `HeaderPanel` | hero top-level fields |
| 2 | Characteristics (Might, Agility, Reason, Intuition, Presence), Size, Speed, Disengage, Stability | `CharacteristicsPanel` | `HeroLogic.getCharacteristic` (×5), `getSize`, `getSpeed`, `getStability` |
| 3 | Equipment and Modifiers (Kit) | `KitPanel` | `HeroLogic.getKits`, kit picker |
| 4 | Victories/Level, Wealth/Renown/XP | `ProgressionPanel` | `hero.state` |
| 5 | Stamina, Recoveries | `VitalsPanel` | **port of the verified vitals spike** |
| 6 | Conditions | `ConditionsPanel` | `hero.state.conditions`, fixed checklist |
| 7 | Heroic Resource, Surges, Potency | `ResourcesPanel` | `HeroLogic.getHeroicResources` |
| — | Spending Hero Tokens, Your Turn | static reference text, no component |
| 8 | Class Features, Ancestry Traits and Perks | `FeaturesPanel` | **port of the verified features-list spike** |
| 9 | Culture (Environment, Organization, Upbringing, Languages) | `CulturePanel` | culture fields |
| 10 | Career + Complication (Benefits, Details, Inciting Incident) | `CareerPanel` | career/complication fields |
| 11 | Skills | `SkillsPanel` | fixed grid — see "Editing model" above |
| 12 | Ability cards, grouped by action type (Main Action / Maneuver / Triggered Action / Free Strike) | `AbilitiesPanel` | `Ability` rendering from the features spike, re-bucketed by `ability.type.usage` |
| 13 | Titles, Trinkets, Treasures, Consumables, Projects | `InventoryPanel` (or split per type) | `hero.state` |

Two components carry over from work already done rather than being built
fresh: **Vitals** and **Features** already exist as verified vanilla-TS/DOM
spikes (see "Architecture decisions" above) — porting them to JSX is smaller,
lower-risk work than building sections 1–4/6/7/9–13 from scratch.

The **ability card format** is specific on the source sheet and should be
built against it directly: Action Type (with Free Strike / Signature /
Heroic / Other as distinct tags), Cost, Distance, Target, Keywords, then
either an effect line or power-roll tiers.

### Master class bolt-ons (Beastheart, Summoner)

Checked directly against rules text (steelcompendium.io), not assumed from
code alone. Both classes turn out to be extensions of the same core sheet,
not a redesign — but they're not symmetrical in effort:

**Beastheart companion — cheap, reuses everything.** Rules confirm the
companion is a **build-time choice from a fixed list** (not the random
`Collections.draw` the vendored `hero-update-logic.ts` does as its own
default-fill behavior — that's Forge Steel filling in *something* so its own
sheet isn't blank, not the actual rule). "Changing Your Companion" is an
explicit in-play action (a respite activity), so a "swap companion" control
belongs in the UI, not just an initial build step. The companion's Stamina
maximum equals the hero's own, but it tracks its own damage/temp/conditions
independently (`MonsterState`, structurally identical to the hero's own
`state`). Net: a companion is a picker (writing to
`FeatureCompanionData.selected: Monster | null`) plus one more instance of
the vitals/conditions UI we're already building, pointed at `MonsterLogic`
instead of `HeroLogic`.

**Summoner — three distinct things, not one:**
1. **Portfolio** (minion + fixture selection) — confirmed to be a proper
   multi-select shape (`FeatureType.SummonChoice`: `{ options: Summon[],
   count: number, selected: Summon[] }`), identical pattern to `Skill Choice`.
   `HeroLogic.getSummons(hero)` already flattens both granted (`FeatureType.
   Summon`) and chosen (`SummonChoice`) entries into one resolved, level-scaled
   list (via `SummonLogic.getSummonedMonster`) — same reuse story as
   `getCompanions`. Cheap.
2. **Minion/fixture reference cards** — same `Monster`/`MonsterLogic`
   rendering as the companion panel, just display-only, one card per
   portfolio entry.
3. **Squad-pooled stamina tracking** — minions summoned together pool their
   Stamina; damage against the pool kills minions one at a time (nearest
   first), with excess overflow hitting the summoner. This is the one piece
   of genuinely new game logic in the whole project — not in `MonsterState`
   or anywhere in the vendored logic, since Forge Steel is a builder, not a
   combat tracker. Initially flagged as maybe-out-of-scope (conflated with
   on-token tracking, which *is* out of scope per "What this is" above), but
   reconsidered: this is the player editing numbers on their own sheet, the
   same category as the hero's own stamina track, not GM/token tracking. In
   scope for v1: a squad state shape (`{ members: Summon[], staminaDamage:
   number }`), pool total derived as `sum(MonsterLogic.getStamina(m))`, and a
   small function to work out how many members remain given damage taken.

**Given the above, both master classes are realistically v1** — not full
parity of effort (Beastheart is closer to "free," Summoner needs the squad
logic written from scratch), but neither requires the guided-build-wizard
work that's explicitly out of scope.

### Later / v2+: sync with Draw Steel Tools instead of building token tracking

Named concretely so it doesn't get lost or accidentally scope-creep into v1:
**investigate reading/writing Draw Steel Tools' token metadata (repo
`SeamusFinlayson/draw-steel-tools-2`, published in the OBR store as
`draw-steel-tools`) for stamina/condition sync, rather than building parallel
on-token tracking.** Confirmed this pattern is proven, not hypothetical, in
the same ecosystem: Seamus's own **Connected Dice** extension explicitly
"augments Draw Steel Tools when they are both installed in the same room,"
and **Token Labels** already ships a built-in Draw Steel condition library
attached to tokens. DST itself (2.1) added statblock search/attach to tokens
— the same `Monster`-shaped concept we're already using. The actual metadata
key namespace/shape isn't confirmed yet — next concrete step when this
becomes active work is `git clone
https://github.com/SeamusFinlayson/draw-steel-tools-2` to read the schema
directly (same technique used to vendor Forge Steel), rather than guessing.
Worth reaching out to Seamus directly given how active and responsive he is
(Discord, Patreon) and that his own extensions already interoperate.

---

## Stack

- Vite + TypeScript
- **React**, for the whole sheet UI (see "Architecture decisions" above for
  reasoning) — settled, not still open.
- Multi-page build: one HTML entry point per OBR iframe surface
  (`index.html` for standalone, `popover.html` for the OBR action popover,
  more as needed)
- Forge Steel's own TypeScript hero model **and derivation logic**, ported
  directly under GPL-3.0 into an isolated `src/forgesteel/` directory — pinned
  commit and verified port instructions in `porting-notes.md`

The app must run **standalone in a normal browser tab** as well as inside OBR.
This makes development possible without the VTT in the loop and is what the
Shadowdark sheet and DS Dice both do.

---

## Build order

1. **Standalone sheet, no OBR.** Plain web page: accept a `.ds-hero` file (or
   start blank), render and edit it.
   1. **Parser + derivation engine — SOLVED, verified.** Forge Steel's
      `HeroLogic` runs against our sample export unmodified and computes
      everything (stamina, recoveries, speed, characteristics, skills, active
      features). Import pipeline: parse JSON → filter sourcebooks by
      `hero.sourcebookIDs` → `HeroUpdateLogic.updateHero()` (required — it
      migrates older exports) → `HeroLogic.get*()`. One file must be stubbed.
      Full details in `porting-notes.md`.
   2. **The sheet UI, in React** — spiked in vanilla TS/DOM first (two spikes,
      committed, both verified); framework decision now settled. This is the
      current, active work. Build **top to bottom, per the "Core sheet
      structure" table above** (Header → Characteristics → Kit →
      Progression → Vitals → Conditions → Resources → Features → Culture →
      Career → Skills → Abilities → Inventory), porting the Vitals and
      Features spikes rather than rebuilding them, and making each section
      directly editable (not just display), per the editing-model
      clarification above.
2. **Wrap in OBR.** Add `manifest.json`, action popover entry point, localStorage
   save slots. Host it, install via manifest URL.
3. **Session-state editing + re-import merge.** Partially folded into step 1.2
   now that direct editing applies more broadly than just session state —
   revisit whether this step still needs to be separate once step 1.2 is done.
4. **GM view** via player metadata + party API.
5. **Polish and publish** — `store.md` and optionally a PR to
   `owlbear-rodeo/extensions` for store listing. Listing is optional; users can
   always install from a manifest URL directly.

---

## Hosting

OBR extensions are just a URL loaded in an iframe. The `manifest.json` points at
the hosted app. There is no app store submission requirement — users add the
manifest URL to their OBR profile themselves.

Host: **TBD** (Vercel / Netlify / GitHub Pages all work; ecosystem examples use
all three plus Render)

---

## Licensing

**Settled: this project is GPL-3.0 and ports Forge Steel code directly.**

Forge Steel is GPL-3.0, so reusing its model and derivation logic makes this repo
GPL-3.0 too. That is accepted — there is no point reimplementing the derivation
engine from the rules when a working, actively maintained implementation exists
and is the exact source of the data we're parsing. Draw Steel Tools is GPL-3.0 as
well, so this is normal for the ecosystem.

Practical consequences:

- The repo must be **public** and ship the GPL-3.0 license text.
- Keep ported code in clearly marked files (e.g. `src/forgesteel/`) with
  attribution to `andyaiken/forgesteel`, so the provenance is obvious and
  upstream changes can be re-pulled.
- Track which upstream commit the port came from, so drift is diagnosable when
  Forge Steel changes its model.
- Prefer porting the model types and derivation functions over the React/Ant
  Design UI — the UI is ours.
- **DRAW STEEL Creator License** — ship the license text in the repo and carry the
  standard disclaimer:
  > This is an independent product published under the DRAW STEEL Creator License
  > and is not affiliated with MCDM Productions, LLC.
  > DRAW STEEL © 2024 MCDM Productions, LLC.
- **Layout/field order vs. visual trade dress**: following the structure and
  field order of MCDM's own character sheets is fine (this general shape is
  common across many TTRPGs, not brand-protectable), but the project
  deliberately does not copy MCDM's specific visual presentation (exact
  typography, logo, color scheme) — see "Design" above.

---

## Reference repos

| Repo | Why it matters |
| --- | --- |
| `andyaiken/forgesteel` | Source of the hero model and the `.ds-hero` format. GPL-3.0, TypeScript + React + Ant Design. |
| `maxpaulus43/owlbear-shadowdark-character-sheet` | Closest prior art. Imports JSON from an external builder site into an OBR sheet. localStorage, save slots, JSON export, GM view. Svelte + TS + Vite. |
| `SeamusFinlayson/draw-steel-tools-2` | Multi-entry-point Vite structure for OBR. Also shows serving a static data index from a separate repo. Published in the OBR store as `draw-steel-tools`. See "Later / v2+" above re: syncing rather than duplicating its token tracking. |
| `owlbear-rodeo/sdk` | The SDK itself. |
| `owlbear-rodeo/extensions` | Store listing registry — `extensions.json` + a hosted `store.md` per extension. |
| `kenpoh01/fsf` | Python Forge Steel → Foundry converter. Useful as a reference for what fields map to what. |

Docs: https://docs.owlbear.rodeo/extensions/getting-started

---

## Open questions

- Hosting provider
- Whether to support multiple heroes per browser at v1 or defer save slots
- Store raw `.ds-hero` alongside the parsed hero, or parsed only? (Somewhat
  more relevant now that the extension's own save format *is* `.ds-hero`
  shape — may collapse into "there's only one form to store.")
- `ancestry.culture` vs top-level `culture` — which is authoritative?
- How much do we validate? The export can contain rules-illegal selections,
  and now so can hand-edited/from-scratch characters — confirmed acceptable,
  not a blocker (see "Editing model," scope (1) explicitly doesn't enforce
  rules-legality).
- Draw Steel Tools metadata schema — see "Later / v2+" above; needs a clone
  + read before it's actionable.

**Resolved, no longer open:**
- ~~UI framework choice (Svelte vs React)~~ → React, for the whole sheet.
- ~~Which sheet sections are v1 vs later~~ → the full core sheet (see "Core
  sheet structure") plus both master class bolt-ons are v1; only Draw Steel
  Tools sync is deferred to v2+.
- ~~Visual direction / design system~~ → see "Design" above.
