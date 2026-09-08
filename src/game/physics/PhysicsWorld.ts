import Matter from 'matter-js';
import type { EntityId } from '../entities/Entity';

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

  getEntityForBody(bodyId: number): EntityId | undefined {
    return this.bodyIdToEntity.get(bodyId);
  }

  dispose(): void {
    Matter.Composite.clear(this.engine.world, false, true);
    Matter.Engine.clear(this.engine);
    this.bodyIdToEntity.clear();
    this.entityToBody.clear();
  }
}
