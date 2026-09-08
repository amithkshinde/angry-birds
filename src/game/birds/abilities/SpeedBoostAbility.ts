import type { BirdAbility, AbilityContext } from '../BirdAbility';
import type { EntityId } from '../../entities/Entity';
import { GameConfig } from '../../config/GameConfig';
import { Components } from '../../entities/ComponentTypes';
import type { SpeedBoosted } from '../../entities/components/SpeedBoosted';

/**
 * Yellow bird: a one-shot forward impulse along its current velocity
 * direction. Uses PhysicsWorld.applyImpulse (adds impulse/mass to the
 * existing velocity) rather than setting a target speed outright, so it
 * preserves whatever arc/momentum the bird already had instead of
 * teleporting it onto a fixed vector.
 */
export class SpeedBoostAbility implements BirdAbility {
  activate(entityId: EntityId, ctx: AbilityContext): void {
    const velocity = ctx.physicsWorld.getVelocity(entityId);
    const mass = ctx.physicsWorld.getMass(entityId);
    const position = ctx.physicsWorld.getPosition(entityId);
    if (!velocity || !mass || !position) return;

    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed < 0.01) return;

    const dir = { x: velocity.x / speed, y: velocity.y / speed };
    const { boostSpeedAdd } = GameConfig.abilities.speedBoost;
    // impulse = mass * desired-delta-v, so this adds a fixed amount of
    // speed regardless of the bird's mass, on top of what it already had.
    ctx.physicsWorld.applyImpulse(entityId, {
      x: dir.x * mass * boostSpeedAdd,
      y: dir.y * mass * boostSpeedAdd,
    });

    ctx.entityManager.addComponent<SpeedBoosted>(entityId, Components.SpeedBoosted, { activatedAtMs: ctx.nowMs });
    ctx.particleSystem.spawnBurst(position.x, position.y, '#f9ca24', GameConfig.fx.hitBurstCount);
    ctx.particleSystem.spawnRing(position.x, position.y, '#ffffff', 22);
  }
}
