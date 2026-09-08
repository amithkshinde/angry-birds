import type { EntityManager } from '../entities/EntityManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { CollisionResolver } from '../physics/CollisionResolver';
import type { EventBus } from '../EventBus';
import type { GameEvents } from '../GameEvents';
import type { ParticleSystem } from '../fx/ParticleSystem';
import type { Camera } from '../camera/Camera';
import type { EntityId } from '../entities/Entity';
import type { Point } from '../math/Point';

/** Everything an ability might need, assembled once by GameEngine and handed to AbilityManager. */
export interface AbilityDeps {
  entityManager: EntityManager;
  physicsWorld: PhysicsWorld;
  collisionResolver: CollisionResolver;
  eventBus: EventBus<GameEvents>;
  particleSystem: ParticleSystem;
  camera: Camera;
  /** Spawns an independent, already-flying bird of the given type (e.g. Blue's split children). */
  spawnFreeBird: (birdTypeId: string, x: number, y: number, velocity: Point) => EntityId;
}

export interface AbilityContext extends AbilityDeps {
  nowMs: number;
}

/**
 * One BirdAbility per ability id, registered in AbilityRegistry and looked
 * up by string — never by a switch over bird type. Implementations are
 * stateless singletons; the one piece of per-bird state ("has this bird's
 * ability fired yet") lives in the AbilityState component instead, so the
 * same ability instance is safely shared across every bird of that type.
 */
export interface BirdAbility {
  /** Player tapped/clicked while this specific bird is airborne. */
  activate(entityId: EntityId, ctx: AbilityContext): void;
  /** Optional: called every frame the bird is in flight and its ability is unused — for timed/passive behavior. */
  update?(entityId: EntityId, ctx: AbilityContext): void;
}
