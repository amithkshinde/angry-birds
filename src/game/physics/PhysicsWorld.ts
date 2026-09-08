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
