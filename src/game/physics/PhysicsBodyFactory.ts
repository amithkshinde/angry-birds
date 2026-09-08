import Matter from 'matter-js';
import { CollisionCategories } from './CollisionCategories';
import type { MaterialDefinition } from '../config/MaterialDefinitions';
import type { BirdDefinition } from '../config/BirdDefinitions';

export function createGroundBody(
  x: number,
  y: number,
  width: number,
  height: number,
  material: MaterialDefinition,
): Matter.Body {
  return Matter.Bodies.rectangle(x, y, width, height, {
    isStatic: true,
    friction: material.friction,
    restitution: material.restitution,
    label: 'ground',
    collisionFilter: { category: CollisionCategories.GROUND },
  });
}

export function createBlockBody(
  x: number,
  y: number,
  width: number,
  height: number,
  material: MaterialDefinition,
): Matter.Body {
  return Matter.Bodies.rectangle(x, y, width, height, {
    friction: material.friction,
    restitution: material.restitution,
    density: material.density,
    label: 'block',
    collisionFilter: { category: CollisionCategories.BLOCK },
  });
}

export function createBirdBody(x: number, y: number, def: BirdDefinition): Matter.Body {
  const body = Matter.Bodies.circle(x, y, def.radius, {
    friction: def.friction,
    restitution: def.restitution,
    label: 'bird',
    collisionFilter: { category: CollisionCategories.BIRD },
  });
  // Definitions specify exact mass rather than density; setMass also
  // recomputes inertia so rotation behaves correctly.
  Matter.Body.setMass(body, def.mass);
  return body;
}
