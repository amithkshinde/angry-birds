export interface PigDefinition {
  id: string;
  health: number;
  radius: number;
  /** Fallback fill color, used until the sprite at spriteKey has loaded (or if it never does). */
  color: string;
  /** Looked up in SpriteAtlas; see config/SpriteManifest.ts for the file path. */
  spriteKey: string;
}

/**
 * Future variants (Helmet, Large, Boss) are architecture, not gameplay
 * yet: `helmet` below is a real, renderable definition (higher health,
 * its own sprite) but isn't referenced by any level — that's the whole
 * point of "add asset, add config" being enough. Death/damage animation
 * hooks: PigFactory gives every pig a Health component already; a future
 * damage-state system would swap `spriteKey` based on health fraction in
 * WorldLayer, and a death-animation system would have
 * GameEngine.processPendingRemovals hand the entity to a short-lived
 * "dying" state instead of destroying it immediately — both slot in
 * without touching the collision/damage pipeline itself.
 */
export const PigDefinitions: Record<string, PigDefinition> = {
  small: {
    id: 'small',
    health: 40,
    radius: 20,
    color: '#6ab04c',
    spriteKey: 'pig-normal',
  },
  helmet: {
    id: 'helmet',
    health: 70,
    radius: 22,
    color: '#7f8c8d',
    spriteKey: 'pig-helmet',
  },
};
