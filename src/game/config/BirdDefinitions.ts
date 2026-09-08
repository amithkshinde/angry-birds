export interface BirdDefinition {
  id: string;
  mass: number;
  radius: number;
  restitution: number;
  friction: number;
  /** Fallback fill color, used until the sprite at spriteKey has loaded (or if it never does). */
  color: string;
  /** Looked up in SpriteAtlas; see config/SpriteManifest.ts for the file path. */
  spriteKey: string;
  /** Looked up in birds/AbilityRegistry.ts; 'none' for birds with no special ability. */
  abilityId: string;
  /** Reserved for a future scoring system — collision damage is impact-speed-based, not a flat per-bird number. */
  baseDamage: number;
}

/**
 * Adding a new bird type is exactly one entry here (plus one asset, plus
 * one ability registration if it needs a new ability) — nothing else in
 * the engine branches on bird identity.
 *
 * Balancing note: Blue/Yellow/Black aren't hand-tuned with a per-bird
 * damage multiplier — collision damage is impactSpeed * a constant (see
 * CollisionResolver), so a faster-moving bird (Yellow, post-boost) simply
 * *is* more damaging, and a lighter bird (Blue) split three ways trades
 * per-hit power for map coverage, both for free from the physics model.
 */
export const BirdDefinitions: Record<string, BirdDefinition> = {
  red: {
    id: 'red',
    mass: 5,
    radius: 22,
    restitution: 0.42,
    friction: 0.5,
    color: '#d64541',
    spriteKey: 'bird-red',
    abilityId: 'none',
    baseDamage: 10,
  },
  blue: {
    id: 'blue',
    mass: 3.5,
    radius: 16,
    restitution: 0.5,
    friction: 0.4,
    color: '#3a8fd9',
    spriteKey: 'bird-blue',
    abilityId: 'split',
    baseDamage: 6,
  },
  yellow: {
    id: 'yellow',
    mass: 4.5,
    radius: 20,
    restitution: 0.3,
    friction: 0.5,
    color: '#f2c500',
    spriteKey: 'bird-yellow',
    abilityId: 'speedBoost',
    baseDamage: 14,
  },
  black: {
    id: 'black',
    mass: 6,
    radius: 22,
    restitution: 0.25,
    friction: 0.6,
    color: '#2c3e50',
    spriteKey: 'bird-black',
    abilityId: 'explode',
    baseDamage: 8,
  },
};
