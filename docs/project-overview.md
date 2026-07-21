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
      current, active work. Build section-by-section: vitals → characteristics
      → skills/languages → features list → abilities, per the original plan,
      now also making each section directly editable (not just display), per
      the editing-model clarification above.
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

---

## Reference repos

| Repo | Why it matters |
| --- | --- |
| `andyaiken/forgesteel` | Source of the hero model and the `.ds-hero` format. GPL-3.0, TypeScript + React + Ant Design. |
| `maxpaulus43/owlbear-shadowdark-character-sheet` | Closest prior art. Imports JSON from an external builder site into an OBR sheet. localStorage, save slots, JSON export, GM view. Svelte + TS + Vite. |
| `SeamusFinlayson/draw-steel-tools-2` | Multi-entry-point Vite structure for OBR. Also shows serving a static data index from a separate repo. |
| `owlbear-rodeo/sdk` | The SDK itself. |
| `owlbear-rodeo/extensions` | Store listing registry — `extensions.json` + a hosted `store.md` per extension. |
| `kenpoh01/fsf` | Python Forge Steel → Foundry converter. Useful as a reference for what fields map to what. |

Docs: https://docs.owlbear.rodeo/extensions/getting-started

---

## Open questions

- Hosting provider
- Which sheet sections are v1 vs later
- Whether to support multiple heroes per browser at v1 or defer save slots
- Store raw `.ds-hero` alongside the parsed hero, or parsed only? (Somewhat
  more relevant now that the extension's own save format *is* `.ds-hero`
  shape — may collapse into "there's only one form to store.")
- `ancestry.culture` vs top-level `culture` — which is authoritative?
- How much do we validate? The export can contain rules-illegal selections,
  and now so can hand-edited/from-scratch characters — confirmed acceptable,
  not a blocker (see "Editing model," scope (1) explicitly doesn't enforce
  rules-legality).

**Resolved, no longer open:**
- ~~UI framework choice (Svelte vs React)~~ → React, for the whole sheet.
