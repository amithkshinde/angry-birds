import type { EntityManager } from '../entities/EntityManager';
import type { PhysicsWorld, CollisionContact } from './PhysicsWorld';
import type { EventBus } from '../EventBus';
import type { GameEvents } from '../GameEvents';
import { Components } from '../entities/ComponentTypes';
import type { Health } from '../entities/components/Health';
import type { EntityId } from '../entities/Entity';

export interface CollisionResolverConfig {
  /** Damage dealt per unit of impact speed. */
  damagePerImpactSpeed: number;
  /** Impacts softer than this are ignored — filters out resting-contact jitter. */
  minImpactSpeedForDamage: number;
}

/**
 * Converts raw physics contacts into game damage. Any entity carrying a
 * Health component takes damage proportional to the impact speed of
 * whatever it collided with — bird, block, or ground alike — so the same
 * rule will cover damageable structures once they get a Health component
 * too, with no changes needed here.
 *
 * Matter disallows mutating the world from inside a collision callback,
 * so this only marks entities for removal; the engine actually removes
 * them in a cleanup pass after the physics step completes.
 */
export class CollisionResolver {
  private readonly unsubscribe: () => void;
  private pendingRemoval = new Set<EntityId>();

  constructor(
    private entityManager: EntityManager,
    physicsWorld: PhysicsWorld,
    private eventBus: EventBus<GameEvents>,
    private config: CollisionResolverConfig,
  ) {
    this.unsubscribe = physicsWorld.onCollisionStart((contacts) => this.handleContacts(contacts));
  }

  dispose(): void {
    this.unsubscribe();
  }

  /** Entities whose health hit zero since the last call; clears the queue. */
  consumePendingRemovals(): EntityId[] {
    const ids = Array.from(this.pendingRemoval);
    this.pendingRemoval.clear();
    return ids;
  }

  private handleContacts(contacts: CollisionContact[]): void {
    for (const contact of contacts) {
      if (contact.impactSpeed < this.config.minImpactSpeedForDamage) continue;
      const damage = contact.impactSpeed * this.config.damagePerImpactSpeed;
      this.applyDamage(contact.entityA, damage);
      this.applyDamage(contact.entityB, damage);
    }
  }

  private applyDamage(entityId: EntityId | undefined, amount: number): void {
    if (entityId === undefined) return;
    const health = this.entityManager.getComponent<Health>(entityId, Components.Health);
    if (!health) return;

    const nextHealth: Health = { ...health, current: health.current - amount };
    this.entityManager.addComponent<Health>(entityId, Components.Health, nextHealth);

    if (nextHealth.current <= 0 && !this.pendingRemoval.has(entityId)) {
      this.pendingRemoval.add(entityId);
      this.eventBus.emit('entity:destroyed', { entityId });
    }
  }
}
