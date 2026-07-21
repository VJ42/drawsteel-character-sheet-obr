# Ported from Forge Steel

Everything in this directory is ported from andyaiken/forgesteel, licensed
under GPL-3.0.

- Source: https://github.com/andyaiken/forgesteel
- Ported from commit: cf4dd8d181df48eed006b39192ac64afc1164112
- Version: forgesteel@14.121.0
- Full license: /LICENSE (repo root)

`src/utils/utils.ts` is the one exception — it's a from-scratch stub
replacing the upstream file to drop the jspdf/html2canvas/modern-screenshot
dependencies. See /CREDITS.md for details.
