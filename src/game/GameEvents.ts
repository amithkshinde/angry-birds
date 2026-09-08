import type { EntityId } from './entities/Entity';
import type { Point } from './math/Point';

/**
 * Events carried on the game's EventBus. Kept generic at the physics
 * layer (any entity can be "destroyed" or "hit") — it's up to listeners
 * like WinLossEvaluator or the VFX wiring in GameEngine to decide which
 * of those matter to them.
 */
export interface GameEvents {
  /** Fired whenever damage is actually applied to a Health-bearing entity, fatal or not. */
  'entity:hit': { entityId: EntityId; position: Point; impactSpeed: number };
  'entity:destroyed': { entityId: EntityId; position: Point };
  'level:won': Record<string, never>;
  'level:lost': Record<string, never>;
}
