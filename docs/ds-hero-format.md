# `.ds-hero` — Forge Steel export format

The data contract for this project. Verified against a real export
(`Unnamed_Hero.ds-hero`, level 1 Censor, 120 KB).

**This file covers the raw data shape only.** For how we consume it, see
`porting-notes.md` (the ported `HeroLogic` engine). For architecture decisions
built on top of both, see `project-overview.md`.

It is plain JSON with a renamed extension. Forge Steel also offers a PDF export;
**PDF is not importable** — the importer must require the JSON/`.ds-hero` export.

---

## Three findings that drive the architecture

### 1. The export is a full snapshot, not a resolved character

It embeds **every option, not just the chosen ones**. In the sample, a *level 1*
character carries:

- all 10 levels of `featuresByLevel` (levels 1–10)
- all 24 class abilities
- all 3 subclasses, each with their own full 10-level feature tree
- every unchosen option inside every `Choice` feature

That's why an unnamed, unequipped level 1 character is 120 KB. **Rendering the
file as-is would show the player their level 7 features.** This filtering is
solved too — see finding 2 and `porting-notes.md`; `HeroLogic.getFeatures()`
does the filtering by level and selection state, we don't write it ourselves.

### 2. No derived stat is stored — they are formulas, resolved elsewhere

There is no `maxStamina`, no `recoveries` total, no `speed` field on the hero.
`"maxStamina"` and `"recoveries"` appear **zero times** as keys in the file.

Instead, stamina is a `Bonus` feature carrying a formula:

```json
{ "id": "censor-stamina", "name": "Stamina", "type": "Bonus",
  "data": { "field": "Stamina", "value": 21, "valueFromController": null,
            "valueCharacteristics": [], "valueCharacteristicMultiplier": 1,
            "valuePerLevel": 9, "valuePerEchelon": 0 } }
```

Contributions also come from the selected kit (`stamina`, `speed`, `stability`,
`meleeDamage`, `rangedDamage`, `disengage`), from `Characteristic Bonus` features
at higher levels, and from ancestry features.

**Solved — see `porting-notes.md`.** Forge Steel's own `HeroLogic` computes all of
this and has been verified against this exact export. We do not write a
derivation engine; we vendor one. This file describes the *data*; that file
describes the *code that reads it*.

### 3. `state` is exactly the session-state tier, stored as deltas

```json
"state": {
  "staminaDamage": 0, "staminaTemp": 0, "recoveriesUsed": 0,
  "surges": 0, "victories": 0, "xp": 0, "heroTokens": 0,
  "renown": 0, "wealth": 1, "projectPoints": 0,
  "conditions": [], "inventory": [], "projects": [], "titles": [],
  "controlledSlots": [], "notes": "",
  "encounterState": "ready", "hidden": false, "defeated": false,
  "tutorialMode": "Complete"
}
```

Stored as *damage taken* and *recoveries used*, not current values — so it stays
valid even when max stamina changes. This maps 1:1 onto our session-state tier and
makes the re-import merge rule trivial: **replace everything, preserve `state`.**

Note `inventory`, `projects`, `titles` and `conditions` live under `state`, not in
the structural data.

---

## Top-level shape

| Key | Type | Notes |
| --- | --- | --- |
| `id` | string | UUID |
| `name` | string | Empty in the sample — must handle blank names |
| `picture` | string \| null | |
| `folder` | string | Forge Steel's own organisation, ignorable |
| `sourcebookIDs` | string[] | `["core","orden","beastheart","summoner"]` |
| `ancestry` | object | Also contains a nested `culture` — redundant with top-level `culture`. Confirm which wins. |
| `culture` | object | `language`, `environment`, `organization`, `upbringing` sub-objects |
| `class` | object | See below |
| `career` | object | `features`, `incitingIncidents` |
| `complication` | object \| null | |
| `features` | Feature[] | Hero-level features. Only `default-language` in the sample. |
| `state` | object | Session state — see above |
| `abilityCustomizations` | array | Empty in sample |

### `class`

| Key | Notes |
| --- | --- |
| `id`, `name`, `description`, `type` | `type: "standard"` |
| `level` | **The filter key for `featuresByLevel`** |
| `characteristics` | `[{characteristic: "Might", value: 2}, ...]` — the 5 base scores |
| `primaryCharacteristics` | `["Might","Presence"]` |
| `primaryCharacteristicsOptions` | Available arrays |
| `featuresByLevel` | All 10 levels, always |
| `abilities` | All class abilities, always |
| `subclasses` | All of them; the chosen one has `selected: true` |
| `subclassName`, `subclassCount` | e.g. `"Order"`, `1` |

---

## Feature types — background for understanding the data

Features are a discriminated union on `type`, with a `type`-specific `data` payload.
Every feature has `{ id, name, description, type, data }`. Counts from the sample:

| Count | Type |
| --- | --- |
| 27 | `Ability` |
| 23 | `Text` |
| 16 | `Skill Choice` |
| 10 | `Choice` |
| 9 | `Characteristic Bonus` |
| 6 | `Class Ability` |
| 6 | `Perk` |
| 4 | `Bonus` |
| 4 | `Language Choice` |
| 4 | `Package Content` |
| 3 | `Domain Feature` |
| 3 | `Heroic Resource Gain` |
| 2 | `Heroic Resource` |
| 2 | `Multiple Features` |
| 1 | `Domain` |
| 1 | `Kit` |

This is **one bare level 1 character** — assume more types exist in the wild
(other classes, higher levels, summoner/beastheart content).

`Multiple Features` nests features inside `data.features` — recursive structure.

**We do not write a walker or resolver for this.** `HeroLogic.getFeatures(hero)`
in the ported code already filters by level and resolves selections, returning
the flat list of active features (35, in the sample, out of the hundreds present).
This section exists so the data itself is understood — useful when the sheet UI
needs to render a feature type Forge Steel's own components handle in a way we
want to do differently, or when debugging an import that looks wrong.

### Selection is recorded three different ways in the raw data

Worth knowing even though `HeroLogic` resolves it for us — this is *why* a
generic "just read `.selected`" approach would fail if we ever touch raw features
directly (e.g. building an in-app editor rather than just a viewer):

| Pattern | Used by | Shape |
| --- | --- | --- |
| `data.selected: []` of full objects | `Kit`, `Domain`, `Skill Choice` | Selected items embedded whole |
| `data.selectedIDs: []` of ID strings | `Class Ability` | Must be resolved against `class.abilities` |
| `selected: true` on the object itself | subclasses | Flag on each of the 3 |

Examples:

```json
{ "type": "Kit", "data": { "types": [""], "count": 1,
    "selected": [ { "id": "kit-arcane-archer", "name": "Arcane Archer",
                    "stamina": 0, "speed": 1, "stability": 0,
                    "rangedDamage": {"tier1":2,"tier2":2,"tier3":2},
                    "rangedDistance": 10, "disengage": 1, "features": [...] } ] } }

{ "type": "Class Ability", "data": { "cost": "signature", "minLevel": 1,
    "count": 1, "selectedIDs": ["censor-ability-2"],
    "source": { "fromClassAbilities": true, "fromSelectedSubclassAbilities": true, ... } } }

{ "type": "Skill Choice", "data": { "options": [], "listOptions": ["Interpersonal","Intrigue"],
    "count": 1, "selectAt": "build", "selected": [] } }
```

Note `Skill Choice` has both `options` and `listOptions`, and a `selectAt` field
(`"build"` seen) — selections can be deferred to later than character creation.

---

## What's actually left to build

Most of the list this section used to contain (filtering by level, resolving
selections, recursing into nested features, deriving stamina/recoveries/speed) is
**solved by the ported `HeroLogic`** — see `porting-notes.md`. What remains is:

1. Parse JSON, call `HeroUpdateLogic.updateHero()` to migrate older exports
2. Read off `HeroLogic.get*()` results and render them
3. Preserve `state` on re-import (our own merge logic, not Forge Steel's — it has
   no concept of "re-import onto an existing hero")
4. Decide what to do with feature types the sheet doesn't have a renderer for yet
   (fall back to name + description is the safe default)

---

## Known quirks from other importers

- Forge Steel treats some statically-assigned skills as free choices, so users can
  pick something the rules wouldn't allow. Imported data may not be rules-legal.
- Only one subclass is ever selected.
- Some homebrew/optional selections have no representation in the export.
- `name` can be an empty string.
- `ancestry.culture` duplicates top-level `culture` — resolve which is authoritative.
