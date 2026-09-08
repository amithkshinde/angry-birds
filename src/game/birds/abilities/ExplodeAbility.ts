import type { BirdAbility, AbilityContext } from '../BirdAbility';
import type { EntityId } from '../../entities/Entity';
import { GameConfig } from '../../config/GameConfig';
import { Components } from '../../entities/ComponentTypes';
import type { AbilityState } from '../../entities/components/AbilityState';
import type { PhysicsBodyRef } from '../../entities/components/PhysicsBody';

/**
 * Black bird: an area explosion, triggered by a tap or automatically once
 * the bird has been resting for a short duration. Damage and knockback
 * both use linear distance falloff from the blast center, applied
 * uniformly to every nearby physics body (pigs, blocks, debris — even
 * other birds) rather than anything bird/pig-specific.
 *
 * Damage goes through CollisionResolver.applyExternalDamage rather than
 * touching Health directly, so a kill from an explosion fires the exact
 * same 'entity:hit'/'entity:destroyed' events (and the debris/VFX/
 * win-loss handling GameEngine already has for those) as a kill from a
 * physics impact — no parallel death pipeline to keep in sync.
 */
export class ExplodeAbility implements BirdAbility {
  activate(entityId: EntityId, ctx: AbilityContext): void {
    this.explode(entityId, ctx);
  }

  update(entityId: EntityId, ctx: AbilityContext): void {
    const state = ctx.entityManager.getComponent<AbilityState>(entityId, Components.AbilityState);
    if (!state || state.used) return;

    const velocity = ctx.physicsWorld.getVelocity(entityId);
    const speed = velocity ? Math.hypot(velocity.x, velocity.y) : 0;
    const { restSpeedThreshold, autoExplodeAfterRestMs } = GameConfig.abilities.black;

    if (speed >= restSpeedThreshold) {
      if (state.restStartMs !== undefined) {
        ctx.entityManager.addComponent<AbilityState>(entityId, Components.AbilityState, {
          ...state,
          restStartMs: undefined,
        });
      }
      return;
    }

    const restStartMs = state.restStartMs ?? ctx.nowMs;
    if (state.restStartMs === undefined) {
      ctx.entityManager.addComponent<AbilityState>(entityId, Components.AbilityState, { ...state, restStartMs });
    }
    if (ctx.nowMs - restStartMs >= autoExplodeAfterRestMs) {
      this.explode(entityId, ctx);
    }
  }

  private explode(entityId: EntityId, ctx: AbilityContext): void {
    const position = ctx.physicsWorld.getPosition(entityId);
    if (!position) return;
    const { explosionRadius, maxDamage, maxImpulse, impactSpeedForVfx } = GameConfig.abilities.black;

    for (const [otherId] of ctx.entityManager.getAllWith<PhysicsBodyRef>(Components.PhysicsBody)) {
      if (otherId === entityId) continue;
      const otherPosition = ctx.physicsWorld.getPosition(otherId);
      if (!otherPosition) continue;

      const dx = otherPosition.x - position.x;
      const dy = otherPosition.y - position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > explosionRadius) continue;

      const falloff = 1 - distance / explosionRadius;
      if (ctx.entityManager.hasComponent(otherId, Components.Health)) {
        ctx.collisionResolver.applyExternalDamage(otherId, maxDamage * falloff, otherPosition, impactSpeedForVfx * falloff);
      }
      if (distance > 0.001) {
        const forceMagnitude = maxImpulse * falloff;
        ctx.physicsWorld.applyImpulse(otherId, {
          x: (dx / distance) * forceMagnitude,
          y: (dy / distance) * forceMagnitude,
        });
      }
    }

    ctx.particleSystem.spawnBurst(position.x, position.y, '#2c3e50', GameConfig.fx.destroyBurstCount);
    ctx.particleSystem.spawnRing(position.x, position.y, '#e67e22', explosionRadius);
    ctx.camera.shake.addTrauma(GameConfig.fx.shake.destroy);

    // The bird itself has no Health component (birds are invulnerable by
    // design), so it doesn't go through the damage pipeline — just remove it.
    ctx.physicsWorld.removeBody(entityId);
    ctx.entityManager.destroyEntity(entityId);
  }
}
