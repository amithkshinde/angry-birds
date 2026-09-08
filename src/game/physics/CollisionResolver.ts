import type { EntityManager } from '../entities/EntityManager';
import type { PhysicsWorld, CollisionContact } from './PhysicsWorld';
import type { EventBus } from '../EventBus';
import type { GameEvents } from '../GameEvents';
import { Components } from '../entities/ComponentTypes';
import type { Health } from '../entities/components/Health';
import type { EntityId } from '../entities/Entity';
import type { Point } from '../math/Point';

export interface CollisionResolverConfig {
  /** Damage dealt per unit of impact speed. */
  damagePerImpactSpeed: number;
  /** Impacts softer than this are ignored — filters out resting-contact jitter. */
  minImpactSpeedForDamage: number;
}

interface PendingRemoval {
  entityId: EntityId;
  position: Point;
}

/**
 * Converts raw physics contacts into game damage. Any entity carrying a
 * Health component takes damage proportional to the impact speed of
 * whatever it collided with — bird, block, or ground alike — so the same
 * rule will cover damageable structures once they get a Health component
 * too, with no changes needed here. Every damage application (fatal or
 * not) fires 'entity:hit' so VFX (screen shake, hit sparks) can react to
 * a solid but non-lethal hit just as much as a kill.
 *
 * Matter disallows mutating the world from inside a collision callback,
 * so this only marks entities for removal; the engine actually removes
 * them in a cleanup pass after the physics step completes.
 */
export class CollisionResolver {
  private readonly unsubscribe: () => void;
  private pendingRemoval = new Map<EntityId, Point>();

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

  /**
   * Entry point for damage that didn't come from a physics contact (e.g.
   * an explosion ability) but should go through exactly the same
   * health/death/VFX pipeline as a collision would — same 'entity:hit'
   * and 'entity:destroyed' events, same pending-removal queue GameEngine
   * already drains every step.
   */
  applyExternalDamage(entityId: EntityId, amount: number, position: Point, impactSpeed = 0): void {
    this.applyDamage(entityId, amount, position, impactSpeed);
  }

  /** Entities whose health hit zero since the last call, with the position they died at; clears the queue. */
  consumePendingRemovals(): PendingRemoval[] {
    const removals = Array.from(this.pendingRemoval, ([entityId, position]) => ({ entityId, position }));
    this.pendingRemoval.clear();
    return removals;
  }

  private handleContacts(contacts: CollisionContact[]): void {
    for (const contact of contacts) {
      if (contact.impactSpeed < this.config.minImpactSpeedForDamage) continue;
      const damage = contact.impactSpeed * this.config.damagePerImpactSpeed;
      this.applyDamage(contact.entityA, damage, contact.position, contact.impactSpeed);
      this.applyDamage(contact.entityB, damage, contact.position, contact.impactSpeed);
    }
  }

  private applyDamage(entityId: EntityId | undefined, amount: number, position: Point, impactSpeed: number): void {
    if (entityId === undefined) return;
    const health = this.entityManager.getComponent<Health>(entityId, Components.Health);
    if (!health) return;

    const nextHealth: Health = { ...health, current: health.current - amount };
    this.entityManager.addComponent<Health>(entityId, Components.Health, nextHealth);
    this.eventBus.emit('entity:hit', { entityId, position, impactSpeed });

    if (nextHealth.current <= 0 && !this.pendingRemoval.has(entityId)) {
      this.pendingRemoval.set(entityId, position);
      this.eventBus.emit('entity:destroyed', { entityId, position });
    }
  }
}
