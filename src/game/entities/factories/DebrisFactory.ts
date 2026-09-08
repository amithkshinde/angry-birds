import type { EntityManager } from '../EntityManager';
import type { PhysicsWorld } from '../../physics/PhysicsWorld';
import { createDebrisBody } from '../../physics/PhysicsBodyFactory';
import { GameConfig } from '../../config/GameConfig';
import { Components } from '../ComponentTypes';
import type { Transform } from '../components/Transform';
import type { PhysicsBodyRef } from '../components/PhysicsBody';
import type { RenderShape } from '../components/RenderShape';
import type { Lifecycle } from '../components/Lifecycle';

/** Scatters a few short-lived fragments at (x, y) — the visual "block broke" feedback. */
export function spawnDebris(
  entityManager: EntityManager,
  physicsWorld: PhysicsWorld,
  x: number,
  y: number,
  color: string,
  nowMs: number,
): void {
  const { count, ttlMs, minSize, maxSize, speed } = GameConfig.debris;
  for (let i = 0; i < count; i++) {
    const size = minSize + Math.random() * (maxSize - minSize);
    const id = entityManager.createEntity();
    const body = createDebrisBody(x, y, size);
    physicsWorld.addBody(body, id);
    physicsWorld.setVelocity(id, { x: (Math.random() - 0.5) * speed * 2, y: -Math.random() * speed });

    entityManager.addComponent<Transform>(id, Components.Transform, { x, y, angle: 0 });
    entityManager.addComponent<PhysicsBodyRef>(id, Components.PhysicsBody, { bodyId: body.id });
    entityManager.addComponent<RenderShape>(id, Components.RenderShape, {
      shape: 'rectangle',
      color,
      width: size,
      height: size,
      zIndex: 6,
    });
    entityManager.addComponent<Lifecycle>(id, Components.Lifecycle, { spawnedAtMs: nowMs, ttlMs });
  }
}
