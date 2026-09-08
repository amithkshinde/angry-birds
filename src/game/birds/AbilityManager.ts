import type { EntityId } from '../entities/Entity';
import { Components } from '../entities/ComponentTypes';
import type { AbilityState } from '../entities/components/AbilityState';
import { AbilityRegistry } from './AbilityRegistry';
import type { AbilityDeps } from './BirdAbility';

/**
 * Routes tap-to-activate input and per-frame passive updates to the right
 * BirdAbility by id, and owns the "has this bird's ability already fired"
 * check so ability implementations themselves stay stateless.
 */
export class AbilityManager {
  constructor(private deps: AbilityDeps) {}

  /** Returns true if an ability actually fired. */
  tryActivate(entityId: EntityId, nowMs: number): boolean {
    const state = this.deps.entityManager.getComponent<AbilityState>(entityId, Components.AbilityState);
    if (!state || state.used) return false;
    const ability = AbilityRegistry[state.abilityId];
    if (!ability) return false;

    this.deps.entityManager.addComponent<AbilityState>(entityId, Components.AbilityState, { ...state, used: true });
    ability.activate(entityId, { ...this.deps, nowMs });
    return true;
  }

  /** Call once per frame for the currently-tracked in-flight bird — drives timed/passive behavior like Black's auto-explode. */
  updateActive(entityId: EntityId, nowMs: number): void {
    const state = this.deps.entityManager.getComponent<AbilityState>(entityId, Components.AbilityState);
    if (!state || state.used) return;
    const ability = AbilityRegistry[state.abilityId];
    ability?.update?.(entityId, { ...this.deps, nowMs });
  }
}
