import type { EntityManager } from '../EntityManager';
import type { PhysicsWorld } from '../../physics/PhysicsWorld';
import { createBirdBody } from '../../physics/PhysicsBodyFactory';
import type { BirdDefinition } from '../../config/BirdDefinitions';
import { Components } from '../ComponentTypes';
import type { Transform } from '../components/Transform';
import type { PhysicsBodyRef } from '../components/PhysicsBody';
import type { RenderShape } from '../components/RenderShape';
import type { BirdTag } from '../components/BirdTag';
import type { EntityId } from '../Entity';

export function createBird(
  entityManager: EntityManager,
  physicsWorld: PhysicsWorld,
  def: BirdDefinition,
  x: number,
  y: number,
): EntityId {
  const id = entityManager.createEntity();
  const body = createBirdBody(x, y, def);
  physicsWorld.addBody(body, id);

  entityManager.addComponent<Transform>(id, Components.Transform, { x, y, angle: 0 });
  entityManager.addComponent<PhysicsBodyRef>(id, Components.PhysicsBody, { bodyId: body.id });
  entityManager.addComponent<RenderShape>(id, Components.RenderShape, {
    shape: 'circle',
    color: def.color,
    radius: def.radius,
    zIndex: 10,
  });
  entityManager.addComponent<BirdTag>(id, Components.BirdTag, { birdTypeId: def.id });

  return id;
}
