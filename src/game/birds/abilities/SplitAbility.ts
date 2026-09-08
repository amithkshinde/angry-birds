import type { BirdAbility, AbilityContext } from '../BirdAbility';
import type { EntityId } from '../../entities/Entity';
import { GameConfig } from '../../config/GameConfig';

/**
 * Blue bird: splits into three on activation. The original keeps its
 * trajectory untouched; two children are spawned just above/below it,
 * inheriting its speed with a small angular spread so all three fan out
 * rather than overlapping. Children are plain 'blue' birds — they get a
 * fresh AbilityState, but since only the slingshot-tracked bird ever
 * receives tap input, they're never reachable for a second split, which
 * is what actually enforces "split can occur only once".
 */
export class SplitAbility implements BirdAbility {
  activate(entityId: EntityId, ctx: AbilityContext): void {
    const velocity = ctx.physicsWorld.getVelocity(entityId);
    const position = ctx.physicsWorld.getPosition(entityId);
    if (!velocity || !position) return;

    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed < 0.01) return;

    const baseAngle = Math.atan2(velocity.y, velocity.x);
    const { spreadRadians, spawnOffset } = GameConfig.abilities.split;

    for (const sign of [-1, 1]) {
      const angle = baseAngle + sign * spreadRadians;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      ctx.spawnFreeBird(
        'blue',
        position.x + dir.x * spawnOffset,
        position.y + dir.y * spawnOffset,
        { x: dir.x * speed, y: dir.y * speed },
      );
    }

    ctx.particleSystem.spawnBurst(position.x, position.y, '#3a8fd9', GameConfig.fx.hitBurstCount);
    ctx.particleSystem.spawnRing(position.x, position.y, '#3a8fd9', 30);
  }
}
