import type { EntityId } from './entities/Entity';

/**
 * Events carried on the game's EventBus. Kept generic at the physics
 * layer (any entity can be "destroyed") — it's up to listeners like
 * WinLossEvaluator to decide which of those destructions matter to them.
 */
export interface GameEvents {
  'entity:destroyed': { entityId: EntityId };
  'level:won': Record<string, never>;
}
