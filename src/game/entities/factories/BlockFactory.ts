import type { EntityManager } from '../EntityManager';
import type { PhysicsWorld } from '../../physics/PhysicsWorld';
import { createBlockBody } from '../../physics/PhysicsBodyFactory';
import type { MaterialDefinition } from '../../config/MaterialDefinitions';
import { Components } from '../ComponentTypes';
import type { Transform } from '../components/Transform';
import type { PhysicsBodyRef } from '../components/PhysicsBody';
import type { RenderShape } from '../components/RenderShape';
import type { MaterialTag } from '../components/MaterialTag';
import type { EntityId } from '../Entity';

export function createBlock(
  entityManager: EntityManager,
  physicsWorld: PhysicsWorld,
  material: MaterialDefinition,
  x: number,
  y: number,
  width: number,
  height: number,
): EntityId {
  const id = entityManager.createEntity();
  const body = createBlockBody(x, y, width, height, material);
  physicsWorld.addBody(body, id);

  entityManager.addComponent<Transform>(id, Components.Transform, { x, y, angle: 0 });
  entityManager.addComponent<PhysicsBodyRef>(id, Components.PhysicsBody, { bodyId: body.id });
  entityManager.addComponent<RenderShape>(id, Components.RenderShape, {
    shape: 'rectangle',
    color: material.color,
    width,
    height,
    zIndex: 5,
  });
  entityManager.addComponent<MaterialTag>(id, Components.MaterialTag, { materialId: material.id });

  return id;
}
