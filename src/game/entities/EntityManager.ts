import type { EntityId } from './Entity';

/**
 * Lightweight entity/component store: an entity is just an id, components
 * are plain data held in per-type maps. Systems query by component type
 * rather than entities owning behavior.
 */
export class EntityManager {
  private nextId: EntityId = 1;
  private entities = new Set<EntityId>();
  private components = new Map<string, Map<EntityId, unknown>>();

  createEntity(): EntityId {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
    for (const store of this.components.values()) {
      store.delete(id);
    }
  }

  addComponent<T>(id: EntityId, name: string, data: T): void {
    let store = this.components.get(name);
    if (!store) {
      store = new Map<EntityId, unknown>();
      this.components.set(name, store);
    }
    store.set(id, data);
  }

  getComponent<T>(id: EntityId, name: string): T | undefined {
    return this.components.get(name)?.get(id) as T | undefined;
  }

  hasComponent(id: EntityId, name: string): boolean {
    return this.components.get(name)?.has(id) ?? false;
  }

  removeComponent(id: EntityId, name: string): void {
    this.components.get(name)?.delete(id);
  }

  /** All entities carrying a given component, for systems to iterate. */
  getAllWith<T>(name: string): ReadonlyMap<EntityId, T> {
    return (this.components.get(name) as Map<EntityId, T> | undefined) ?? new Map<EntityId, T>();
  }

  getEntities(): ReadonlySet<EntityId> {
    return this.entities;
  }
}
