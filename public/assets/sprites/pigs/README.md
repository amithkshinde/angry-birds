# Pig sprites

Drop transparent-background PNGs here with these exact filenames:

- `normal.png`
- `helmet.png` (registered as the `helmet` PigDefinition — not used by any
  level yet, but renders correctly the moment a level references it)

Paths are wired in `src/game/config/SpriteManifest.ts`. Until a file
exists, that pig just keeps rendering as its flat-color circle.
