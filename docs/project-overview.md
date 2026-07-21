# Draw Steel Character Sheet — Owlbear Rodeo Extension

## What this is

An Owlbear Rodeo (OBR) extension that displays a full Draw Steel character sheet
inside the VTT, populated by importing a `.ds-hero` file exported from
Forge Steel (https://forgesteel.net).

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

**JSON export/import is the sync and backup story.** There is no cloud sync.
Users move characters between devices by exporting and re-importing. This is the
same approach the Shadowdark sheet and Forge Steel itself use.

**Player metadata is used only for GM visibility** — a summary (or the sheet) is
published to player metadata so the GM's client can read all players' sheets via
the party API. Not used as primary storage.

**Room metadata is not used for character data.** 16kB hard cap across all
extensions in the room. A bare level 1 `.ds-hero` export is **120 KB** — nearly
8× the cap — because the format embeds every unselected option. localStorage
(typically 5–10 MB) is fine, but consider storing the *parsed and filtered*
hero rather than the raw file, and keep the raw file only if re-parsing on
version upgrades turns out to matter.

### Storage decision table

| Data | Where it lives |
| --- | --- |
| Full hero object | localStorage (save slots) |
| Session state (stamina, recoveries, heroic resource, surges) | localStorage, merged on re-import |
| GM-visible summary | Player metadata |
| Anything token-attached | Item metadata (only if we add token features later) |
| Backup / cross-device | User-initiated JSON export |

---

## Editing model

Two tiers, deliberately separated — and the file format already draws this line
for us.

- **Session state** — everything under the export's `state` key: `staminaDamage`,
  `recoveriesUsed`, `surges`, `victories`, `heroTokens`, `conditions`,
  `inventory`, `projects`, `titles`, `notes`. Edited directly in the sheet.
- **Structural data** — everything else: class, ancestry, culture, career,
  abilities, features, kit, characteristics. Changed by re-importing.

**Re-import rule: replace everything, preserve `state`.** Forge Steel stores
session values as deltas (damage taken, recoveries used) rather than current
totals, so preserved state stays valid even if max stamina changes.

Because `inventory`, `projects` and `titles` live under `state`, they are ours to
edit, not Forge Steel's to overwrite.

---

## Stack

- Vite + TypeScript
- Multi-page build: one HTML entry point per OBR iframe surface
  (`index.html` for standalone, `popover.html` for the OBR action popover,
  more as needed)
- Forge Steel's own TypeScript hero model **and derivation logic**, ported
  directly under GPL-3.0 into an isolated `src/forgesteel/` directory — pinned
  commit and verified port instructions in `porting-notes.md`
- UI framework: **TBD** (Svelte and React are both well-proven in this ecosystem)

The app must run **standalone in a normal browser tab** as well as inside OBR.
This makes development possible without the VTT in the loop and is what the
Shadowdark sheet and DS Dice both do.

---

## Build order

1. **Standalone sheet, no OBR.** Plain web page: accept a `.ds-hero` file, render it.
   1. **Parser + derivation engine — SOLVED, verified.** Forge Steel's
      `HeroLogic` runs against our sample export unmodified and computes
      everything (stamina, recoveries, speed, characteristics, skills, active
      features). Import pipeline: parse JSON → filter sourcebooks by
      `hero.sourcebookIDs` → `HeroUpdateLogic.updateHero()` (required — it
      migrates older exports) → `HeroLogic.get*()`. One file must be stubbed.
      Full details in `porting-notes.md`.
   2. **The sheet UI** — now the actual work of milestone 1.
2. **Wrap in OBR.** Add `manifest.json`, action popover entry point, localStorage
   save slots. Host it, install via manifest URL.
3. **Session-state editing + re-import merge.**
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

- UI framework choice (Svelte vs React)
- Hosting provider
- Which sheet sections are v1 vs later
- Whether to support multiple heroes per browser at v1 or defer save slots
- Store raw `.ds-hero` alongside the parsed hero, or parsed only?
- `ancestry.culture` vs top-level `culture` — which is authoritative?
- How much do we validate? The export can contain rules-illegal selections.
