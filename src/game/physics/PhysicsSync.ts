import type { EntityManager } from '../entities/EntityManager';
import type { PhysicsWorld } from './PhysicsWorld';
import { Components } from '../entities/ComponentTypes';
import type { Transform } from '../entities/components/Transform';
import type { PhysicsBodyRef } from '../entities/components/PhysicsBody';

/**
 * Snapshot every physics-driven entity's current Transform into
 * PrevTransform right before a physics step, so the renderer can later
 * interpolate between "before this step" and "after this step".
 */
export function capturePreviousTransforms(entityManager: EntityManager): void {
  const bodies = entityManager.getAllWith<PhysicsBodyRef>(Components.PhysicsBody);
  for (const entityId of bodies.keys()) {
    const transform = entityManager.getComponent<Transform>(entityId, Components.Transform);
    if (!transform) continue;
    entityManager.addComponent<Transform>(entityId, Components.PrevTransform, { ...transform });
  }
}

/** Pull each entity's Transform back out of its Matter.Body after a step. */
export function syncTransformsFromPhysics(entityManager: EntityManager, physicsWorld: PhysicsWorld): void {
  const bodies = entityManager.getAllWith<PhysicsBodyRef>(Components.PhysicsBody);
  for (const entityId of bodies.keys()) {
    const body = physicsWorld.getBody(entityId);
    if (!body) continue;
    entityManager.addComponent<Transform>(entityId, Components.Transform, {
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
    });
  }
}
