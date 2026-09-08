import type { EntityManager } from '../entities/EntityManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { GameConfig } from '../config/GameConfig';
import { MaterialDefinitions } from '../config/MaterialDefinitions';
import { BirdDefinitions } from '../config/BirdDefinitions';
import { PigDefinitions } from '../config/PigDefinitions';
import { createGround } from '../entities/factories/GroundFactory';
import { createBlock } from '../entities/factories/BlockFactory';
import { createBird } from '../entities/factories/BirdFactory';
import { createPig } from '../entities/factories/PigFactory';
import type { LevelDefinition } from './LevelSchema';
import type { EntityId } from '../entities/Entity';
import type { Point } from '../math/Point';

export interface BuiltLevel {
  birdId: EntityId;
  anchor: Point;
  groundTopY: number;
  pigCount: number;
  /** Bird type ids still to come after the one already loaded. */
  remainingBirdTypeIds: string[];
}

/** Turns a JSON LevelDefinition into live entities — the one place level data meets the entity factories. */
export function buildLevel(
  entityManager: EntityManager,
  physicsWorld: PhysicsWorld,
  level: LevelDefinition,
  width: number,
  height: number,
): BuiltLevel {
  const groundHeight = 80;
  const groundTopY = height - groundHeight;

  createGround(
    entityManager,
    physicsWorld,
    MaterialDefinitions.ground,
    width / 2,
    groundTopY + groundHeight / 2,
    Math.max(width * 2, 2000),
    groundHeight,
  );

  for (const block of level.blocks) {
    createBlock(
      entityManager,
      physicsWorld,
      MaterialDefinitions[block.material],
      block.xRatio * width,
      groundTopY - block.yFromGround,
      block.width,
      block.height,
    );
  }

  for (const pig of level.pigs) {
    createPig(
      entityManager,
      physicsWorld,
      PigDefinitions[pig.pigType ?? 'small'],
      pig.xRatio * width,
      groundTopY - pig.yFromGround,
    );
  }

  const anchor: Point = {
    x: width * GameConfig.slingshot.anchorXRatio,
    y: groundTopY - GameConfig.slingshot.anchorYOffsetFromGround,
  };
  const [firstBirdType, ...remainingBirdTypeIds] = level.birds;
  const birdId = createBird(entityManager, physicsWorld, BirdDefinitions[firstBirdType], anchor.x, anchor.y);
  // Held in the pouch: static until launched, so gravity and collisions
  // don't touch it while the player is aiming.
  physicsWorld.setStatic(birdId, true);

  return { birdId, anchor, groundTopY, pigCount: level.pigs.length, remainingBirdTypeIds };
}
