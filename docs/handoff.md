# Handoff — Draw Steel Character Sheet (Owlbear Rodeo Extension)

Status as of this handoff: research and verification phase complete. No code
written yet. This file is the build plan. For background, see the sibling
project knowledge files:

- `project-overview.md` — architecture decisions (settled), stack, storage model
- `ds-hero-format.md` — the `.ds-hero` data format, verified against a real export
- `porting-notes.md` — the verified Forge Steel `HeroLogic` port (pin, stub, bundle size)
- `Unnamed_Hero.ds-hero` — the real sample export everything above was checked against

---

## What's already decided (do not re-litigate)

- **No backend.** Static site, localStorage as source of truth, JSON export/import
  as the sync story. Full reasoning in `project-overview.md`.
- **Port Forge Steel's logic directly, GPL-3.0.** Verified working against the
  sample hero. Pin: `andyaiken/forgesteel` @ `cf4dd8d181df48eed006b39192ac64afc1164112`.
  Full details in `porting-notes.md`.
- **Vite + TypeScript, multi-page build** (one HTML entry point per OBR surface).
- **Two-tier editing model**: session `state` edited directly, structural data
  changed only by re-import, re-import preserves `state`.

## What's still open

- **UI framework: React vs Svelte.** Leaning React, since Forge Steel is React —
  matching lets ability-card and feature-block components be ported by reading
  upstream directly rather than translated. Not yet chosen.
- **Hosting provider.** Vercel / Netlify / GitHub Pages all work. Not yet chosen.
- Store raw `.ds-hero` alongside the parsed hero, or parsed only?
- `ancestry.culture` vs top-level `culture` — which is authoritative?
- How much do we validate rules-illegal selections in the import?

---

## Build plan

### Phase 0 — unblock

Pick the UI framework. This is the only thing blocking the first line of code.
Hosting doesn't block Phase 1 but should be picked before Phase 2.

### Phase 1 — standalone sheet (no OBR)

The bulk of the real work. A plain web page, opened in a normal browser tab.

1. **Scaffold + vendor the port.** New Vite + TS project. Copy `src/logic`,
   `src/models`, `src/enums`, `src/utils`, `src/data` from the pinned Forge Steel
   commit into `src/forgesteel/`. Add the `@/*` → `./src/*` path alias so
   upstream imports resolve unchanged — this is what makes re-pulling upstream
   cheap later. Apply the `utils.ts` stub documented in `porting-notes.md`.
2. **Prove the pipeline, in-project.** Recreate the harness inside the real app:
   file input → `JSON.parse` → filter sourcebooks by `sourcebookIDs` →
   `HeroUpdateLogic.updateHero()` → log `HeroLogic.getStamina()` etc. to the
   console. Target values against the sample hero: stamina 21, recoveries 12
   worth 7, speed 6, disengage 2. **This is the real go/no-go gate** — the
   Node harness proved the logic works, but not yet inside Vite's browser
   bundling. Confirm before writing any UI.
3. **Build the sheet, section by section**, easiest to hardest:
   vitals (stamina/recoveries/speed/stability) → characteristics → skills and
   languages → features list → abilities. Abilities last — they carry the most
   internal structure (power roll tiers, distances, keywords, cost).
4. **Fallback renderer.** Any feature type without a dedicated component falls
   back to name + description, so an unrecognized type (this project's feature
   type list came from one bare level 1 character) degrades instead of crashing.

**Milestone: drop in a `.ds-hero` file, see a complete, correct sheet.**

### Phase 2 — wrap in OBR

Mostly plumbing if Phase 1 is solid.

- `manifest.json` + icon, action popover entry point
- Second HTML entry (`popover.html`) alongside `index.html`
- `OBR.onReady()` guard + `OBR.isAvailable` check, so one build runs both
  standalone and embedded
- localStorage save slots (multiple heroes per browser)
- Deploy, install via manifest URL, test in a real OBR room

### Phase 3 — session state editing

- Editable stamina damage, recoveries used, surges, heroic resource, conditions
  — all writes go to the hero's `state` object, persisted to localStorage
- Re-import merge logic: replace structural data, preserve `state`. This is the
  one piece of logic Forge Steel doesn't provide — it has no concept of
  re-importing onto an existing hero.

### Phase 4 — GM view

Publish a summary to player metadata, read the party via OBR's party API,
render a roster for the GM. Defer until Phases 1–3 are solid.

### Phase 5 — polish and publish

- `store.md`
- GPL-3.0 license text in the repo
- DRAW STEEL Creator License notice + standard disclaimer (text in
  `project-overview.md`)
- Attribution to `andyaiken/forgesteel` with the pinned commit
- Optional: PR to `owlbear-rodeo/extensions` for a store listing (not required
  to distribute — manifest URL install works without it)

---

## Immediate next action

Phase 0 (pick UI framework) → Phase 1 steps 1–2 (vendor + prove the pipeline
in-project). That's the real risk gate for the whole project; everything after
it is UI work against a known-working data layer.
