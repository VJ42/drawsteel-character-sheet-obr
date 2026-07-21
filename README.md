# Draw Steel Character Sheet — Owlbear Rodeo Extension

An [Owlbear Rodeo](https://www.owlbear.rodeo/) extension that renders a full
Draw Steel character sheet from a `.ds-hero` file exported by
[Forge Steel](https://forgesteel.net).

Status: early development. The hero-derivation engine is vendored and
verified working; the sheet UI itself hasn't been built yet.

## Development

```
npm install
npm run dev       # local dev server
npm run build     # production build
npm run verify    # runs the derivation engine against a sample hero,
                   # prints derived stats to the terminal
```

## License

This project is licensed under **GPL-3.0** — see [`LICENSE`](./LICENSE).

It's GPL-3.0 because it incorporates code ported directly from
[andyaiken/forgesteel](https://github.com/andyaiken/forgesteel), which is
itself GPL-3.0 licensed. See [`CREDITS.md`](./CREDITS.md) and
[`src/forgesteel/README.md`](./src/forgesteel/README.md) for full
attribution and provenance details.

## Draw Steel disclaimer

This is an independent product published under the DRAW STEEL Creator
License and is not affiliated with MCDM Productions, LLC.
DRAW STEEL © 2024 MCDM Productions, LLC.
