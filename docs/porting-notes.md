# Porting Forge Steel's logic — verified findings

Everything below was **empirically verified** by cloning the repo, installing its
dependencies, and executing its derivation engine against our real sample export
(`Unnamed_Hero.ds-hero`). Not inferred from reading code.

## Pin

| | |
| --- | --- |
| Upstream | `andyaiken/forgesteel` |
| Commit | `cf4dd8d181df48eed006b39192ac64afc1164112` |
| Version | `forgesteel@14.121.0` |
| Path alias | `@/*` → `./src/*` (tsconfig `paths`) |

Update this table whenever the port is re-pulled.

## The port surface

Vendor these directories wholesale into `src/forgesteel/`:

| Directory | Size | Notes |
| --- | --- | --- |
| `src/logic/` | ~8.7k lines reachable | `hero-logic.ts` (1,484 lines) is the engine |
| `src/models/` | ~1.4k lines | Pure types |
| `src/enums/` | ~0.4k lines | |
| `src/utils/` | 6 files | **`utils.ts` must be stubbed — see below** |
| `src/data/` | ~103k lines | All game content; 90% of the closure |

Transitive closure from `hero-logic.ts`: 325 files, ~115k lines, of which
**90% is game content data**, not code. Do not try to hand-pick files; vendor the
directories and let the bundler tree-shake.

### Key API (all verified working)

```ts
// Import pipeline — updateHero is REQUIRED, it migrates older exports
const hero: Hero = JSON.parse(dsHeroFileText);
const sourcebooks = SourcebookLogic.getSourcebooks()
  .filter(sb => hero.sourcebookIDs.includes(sb.id));
HeroUpdateLogic.updateHero(hero, sourcebooks);   // mutates in place

// Derivation — this IS the engine we needed
HeroLogic.getStamina(hero)              // 21 ✓
HeroLogic.getWindedThreshold(hero)      // 10 ✓
HeroLogic.getRecoveries(hero)           // 12 ✓
HeroLogic.getRecoveryValue(hero)        // 7 ✓
HeroLogic.getSpeed(hero)                // { value: 6, modes: [] } ✓
HeroLogic.getStability(hero)            // 0 ✓
HeroLogic.getDisengage(hero)            // 2 (base 1 + kit 1) ✓
HeroLogic.getSize(hero)                 // { value: 1, mod: 'M' } ✓
HeroLogic.getCharacteristic(hero, c)    // M2 A1 R1 I-1 P2 ✓
HeroLogic.getSkills(hero, sourcebooks)  // 9 skills, resolved ✓
HeroLogic.getLanguages(hero, sourcebooks) // Caelian, Riojan, Vaslorian ✓
HeroLogic.getHeroicResources(hero)      // Wrath ✓
HeroLogic.getKits(hero)                 // Arcane Archer ✓
HeroLogic.getFeatures(hero)             // 35 active (filtered from 100s) ✓
```

`HeroLogic.getFeatures` does the level/selection filtering identified in
`ds-hero-format.md` — we do not write that ourselves. Also available:
`getAbilities`, `getDamageModifiers`, `getPotency`, `getConditionImmunities`,
`getKitDamageBonuses`, `getSaveThreshold`, and ~50 more static methods.

`HeroUpdateLogic.updateHero` patches heroes exported by **older** Forge Steel
versions up to the current model. This substantially de-risks version drift.
The unhandled direction is a **newer** export than our pin — so watch upstream
releases.

## The one required modification

`src/utils/utils.ts` imports `jspdf`, `html2canvas`, and `modern-screenshot` at
module top level for Forge Steel's PDF-export feature. Everything in the logic
layer reaches it (for `Utils.copy`, `Utils.guid`, `Utils.hashCode`, markdown).

**Replace it with a stub** exporting only:

- `copy` — `JSON.parse(JSON.stringify(x))`
- `guid` — `crypto.randomUUID()`
- `hashCode` — **copy verbatim from upstream** (cyrb53-style; used to derive
  sourcebook unlock codes — a naive reimplementation breaks `FeatureFlags`)
- `markdownToHTML` / `showdownConverter` — keep, uses `showdown`
- `debounce`, `intersects` — trivial

Effect, measured:

| | minified | gzipped | npm packages |
| --- | --- | --- | --- |
| Unmodified port | 4.21 MB | 991 KB | 18 |
| With utils stub | 3.40 MB | 739 KB | **1 (`showdown`)** |

Harness output is byte-identical with the stub.

## Runtime requirements

- **`localStorage` must exist.** `SourcebookLogic.getSourcebooks()` →
  `FeatureFlags` reads it at call time. Fine in the browser (our target);
  shim it in Node tests:
  `globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }`
- Browser-targeted code throughout; don't expect it to run server-side without
  shims.

## Bundle reality

739 KB gzipped is acceptable for an OBR extension (loaded once, HTTP-cached),
but 75% of it is `src/data` game content. If load time ever matters:
dynamic-`import()` the sourcebook data so the shell paints first. This is an
optimization, not a requirement — do not do it in v1.

Note the game content is needed at runtime regardless: `getSkills`/`getLanguages`
resolve name strings against sourcebooks, and `Class Ability` features carry
`selectedIDs` that resolve against class ability lists.

## Reproducing the verification

```bash
git clone --depth 1 https://github.com/andyaiken/forgesteel && cd forgesteel
npm install
# write harness.ts (see key API above), then:
npx esbuild harness.ts --bundle --platform=node --format=cjs \
  --outfile=/tmp/h.cjs --alias:@=./src --loader:.png=dataurl --loader:.svg=dataurl
node -e "globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};require('/tmp/h.cjs')"
```
