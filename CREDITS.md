# Credits

## Forge Steel

The hero model and derivation logic in `src/forgesteel/` are ported from
[andyaiken/forgesteel](https://github.com/andyaiken/forgesteel), licensed
under GPL-3.0. Full attribution and pin details are in
`src/forgesteel/README.md`.

### Exception: `src/forgesteel/utils/utils.ts`

This file is a rewritten stub, not a verbatim port. The original
upstream file imports `jspdf`, `html2canvas`, and `modern-screenshot` to
support Forge Steel's PDF/image character-sheet export feature, which this
project doesn't use.

The stub keeps every method actually called elsewhere in the vendored
logic (`copy`, `guid`, `hashCode`, markdown conversion via `showdown`, and
others), and drops only the export-specific methods and their imports.

One method required care rather than a straight rewrite:

- `hashCode` is copied **verbatim** from upstream. It's a cyrb53-style hash
  used to derive sourcebook unlock codes; a different implementation would
  silently break `FeatureFlags` checks throughout the vendored logic.

Everything else in `src/forgesteel/` (`logic/`, `models/`, `enums/`,
`data/`, and the rest of `utils/`) is an unmodified copy of the pinned
upstream commit.
