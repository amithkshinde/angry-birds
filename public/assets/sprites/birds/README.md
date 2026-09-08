# Bird sprites

Drop transparent-background PNGs here with these exact filenames — that's
the entire integration step, nothing else needs to change:

- `red.png`
- `blue.png`
- `yellow.png`
- `black.png`

Paths are wired in `src/game/config/SpriteManifest.ts`. Until a file
exists, that bird just keeps rendering as its flat-color circle.
