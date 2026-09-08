import type { EntityManager } from '../EntityManager';
import type { PhysicsWorld } from '../../physics/PhysicsWorld';
import { createPigBody } from '../../physics/PhysicsBodyFactory';
import type { PigDefinition } from '../../config/PigDefinitions';
import { Components } from '../ComponentTypes';
import type { Transform } from '../components/Transform';
import type { PhysicsBodyRef } from '../components/PhysicsBody';
import type { RenderShape } from '../components/RenderShape';
import type { PigTag } from '../components/PigTag';
import type { Health } from '../components/Health';
import type { EntityId } from '../Entity';

export function createPig(
  entityManager: EntityManager,
  physicsWorld: PhysicsWorld,
  def: PigDefinition,
  x: number,
  y: number,
): EntityId {
  const id = entityManager.createEntity();
  const body = createPigBody(x, y, def);
  physicsWorld.addBody(body, id);

  entityManager.addComponent<Transform>(id, Components.Transform, { x, y, angle: 0 });
  entityManager.addComponent<PhysicsBodyRef>(id, Components.PhysicsBody, { bodyId: body.id });
  entityManager.addComponent<RenderShape>(id, Components.RenderShape, {
    shape: 'circle',
    color: def.color,
    radius: def.radius,
    zIndex: 8,
  });
  entityManager.addComponent<PigTag>(id, Components.PigTag, { pigTypeId: def.id });
  entityManager.addComponent<Health>(id, Components.Health, { current: def.health, max: def.health });

  return id;
}
