import Matter from 'matter-js';
import { CollisionCategories } from './CollisionCategories';
import type { MaterialDefinition } from '../config/MaterialDefinitions';
import type { BirdDefinition } from '../config/BirdDefinitions';
import type { PigDefinition } from '../config/PigDefinitions';

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
    // Slightly below Matter's 0.01 default: a launched bird carries its
    // speed a bit further through the air, so pulls translate into a
    // punchier, more confident-feeling arc instead of visibly decaying.
    frictionAir: 0.008,
    label: 'bird',
    collisionFilter: { category: CollisionCategories.BIRD },
  });
  // Definitions specify exact mass rather than density; setMass also
  // recomputes inertia so rotation behaves correctly.
  Matter.Body.setMass(body, def.mass);
  return body;
}

export function createPigBody(x: number, y: number, def: PigDefinition): Matter.Body {
  return Matter.Bodies.circle(x, y, def.radius, {
    friction: 0.6,
    restitution: 0.2,
    label: 'pig',
    collisionFilter: { category: CollisionCategories.PIG },
  });
}

/** Small, cheap, non-damaging fragments spawned when a block breaks. */
export function createDebrisBody(x: number, y: number, size: number): Matter.Body {
  return Matter.Bodies.rectangle(x, y, size, size, {
    friction: 0.4,
    restitution: 0.3,
    density: 0.004,
    label: 'debris',
    collisionFilter: { category: CollisionCategories.DEBRIS },
  });
}
