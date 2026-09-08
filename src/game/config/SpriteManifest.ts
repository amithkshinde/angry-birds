/**
 * Every sprite the game knows about, by the key BirdDefinitions/
 * PigDefinitions reference. This is the *only* place a real asset path
 * is named — adding a bird or pig sprite is one line here, no other file
 * needs to change. Files don't need to exist yet: SpriteAtlas.preload()
 * fails silently and WorldLayer keeps drawing the flat-color fallback
 * until they do.
 */
export const SpriteManifest: ReadonlyArray<{ key: string; src: string }> = [
  { key: 'bird-red', src: '/assets/sprites/birds/red.png' },
  { key: 'bird-blue', src: '/assets/sprites/birds/blue.png' },
  { key: 'bird-yellow', src: '/assets/sprites/birds/yellow.png' },
  { key: 'bird-black', src: '/assets/sprites/birds/black.png' },
  { key: 'pig-normal', src: '/assets/sprites/pigs/normal.png' },
  { key: 'pig-helmet', src: '/assets/sprites/pigs/helmet.png' },
];
