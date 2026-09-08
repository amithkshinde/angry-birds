import Matter from 'matter-js';
import type { EntityId } from '../entities/Entity';

export interface CollisionContact {
  /** Undefined if the colliding body has no owning entity (shouldn't happen for game bodies, but guards otherwise). */
  entityA: EntityId | undefined;
  entityB: EntityId | undefined;
  /** Relative speed between the two bodies at the moment contact began. */
  impactSpeed: number;
  /** Midpoint between the two bodies — good enough for placing impact VFX. */
  position: { x: number; y: number };
}

/**
 * Thin wrapper around a Matter.js engine/world. Owns the body<->entity
 * mapping so collision resolution and transform sync can go from a
 * Matter.Body straight to the owning entity (and back) in O(1).
 */
export class PhysicsWorld {
  readonly engine: Matter.Engine;
  private bodyIdToEntity = new Map<number, EntityId>();
  private entityToBody = new Map<EntityId, Matter.Body>();

  constructor(gravity: { x: number; y: number }) {
    this.engine = Matter.Engine.create();
    this.engine.gravity.x = gravity.x;
    this.engine.gravity.y = gravity.y;
    // Settled bodies (landed birds, rubble) go fully to sleep instead of
    // micro-jittering forever — cheaper, and visibly calmer once things land.
    this.engine.enableSleeping = true;
  }

  step(fixedDtMs: number): void {
    Matter.Engine.update(this.engine, fixedDtMs);
  }

  addBody(body: Matter.Body, entityId: EntityId): void {
    Matter.Composite.add(this.engine.world, body);
    this.bodyIdToEntity.set(body.id, entityId);
    this.entityToBody.set(entityId, body);
  }

  removeBody(entityId: EntityId): void {
    const body = this.entityToBody.get(entityId);
    if (!body) return;
    Matter.Composite.remove(this.engine.world, body);
    this.bodyIdToEntity.delete(body.id);
    this.entityToBody.delete(entityId);
  }

  getBody(entityId: EntityId): Matter.Body | undefined {
    return this.entityToBody.get(entityId);
  }

  /**
   * Toggle a body static/dynamic. Matter stashes the pre-static mass,
   * inertia, friction and restitution and restores them on the way back
   * to dynamic — this is how a held slingshot bird can be pinned in place
   * (ignoring gravity/collisions) and then launched with its original
   * physical properties intact.
   */
  setStatic(entityId: EntityId, isStatic: boolean): void {
    const body = this.entityToBody.get(entityId);
    if (body) {
      Matter.Body.setStatic(body, isStatic);
    }
  }

  setPosition(entityId: EntityId, position: { x: number; y: number }): void {
    const body = this.entityToBody.get(entityId);
    if (body) {
      Matter.Body.setPosition(body, position);
    }
  }

  setVelocity(entityId: EntityId, velocity: { x: number; y: number }): void {
    const body = this.entityToBody.get(entityId);
    if (body) {
      Matter.Body.setVelocity(body, velocity);
    }
  }

  getPosition(entityId: EntityId): { x: number; y: number } | undefined {
    const body = this.entityToBody.get(entityId);
    return body ? { x: body.position.x, y: body.position.y } : undefined;
  }

  getVelocity(entityId: EntityId): { x: number; y: number } | undefined {
    const body = this.entityToBody.get(entityId);
    return body ? { x: body.velocity.x, y: body.velocity.y } : undefined;
  }

  getMass(entityId: EntityId): number | undefined {
    return this.entityToBody.get(entityId)?.mass;
  }

  /**
   * Instant impulse: adds impulse/mass to the body's *current* velocity
   * rather than replacing it — momentum-preserving, unlike setVelocity.
   * Used by abilities (Yellow's speed boost, Black's explosion knockback)
   * that should add to whatever the body is already doing, not override it.
   */
  applyImpulse(entityId: EntityId, impulse: { x: number; y: number }): void {
    const body = this.entityToBody.get(entityId);
    if (!body) return;
    Matter.Body.setVelocity(body, {
      x: body.velocity.x + impulse.x / body.mass,
      y: body.velocity.y + impulse.y / body.mass,
    });
  }

  getEntityForBody(bodyId: number): EntityId | undefined {
    return this.bodyIdToEntity.get(bodyId);
  }

  /**
   * Subscribe to new physics contacts as plain entity-id data, so callers
   * (CollisionResolver) never need to import Matter or touch a
   * Matter.Body directly. Fires once per newly-formed contact, not every
   * step of an ongoing overlap, matching "an impact" rather than
   * "continuous crushing".
   */
  onCollisionStart(handler: (contacts: CollisionContact[]) => void): () => void {
    const listener = (event: Matter.IEventCollision<Matter.Engine>): void => {
      const contacts: CollisionContact[] = event.pairs.map((pair) => ({
        entityA: this.bodyIdToEntity.get(pair.bodyA.id),
        entityB: this.bodyIdToEntity.get(pair.bodyB.id),
        impactSpeed: Matter.Vector.magnitude(Matter.Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity)),
        position: {
          x: (pair.bodyA.position.x + pair.bodyB.position.x) / 2,
          y: (pair.bodyA.position.y + pair.bodyB.position.y) / 2,
        },
      }));
      handler(contacts);
    };
    Matter.Events.on(this.engine, 'collisionStart', listener);
    return () => Matter.Events.off(this.engine, 'collisionStart', listener);
  }

  dispose(): void {
    Matter.Composite.clear(this.engine.world, false, true);
    Matter.Engine.clear(this.engine);
    this.bodyIdToEntity.clear();
    this.entityToBody.clear();
  }
}
