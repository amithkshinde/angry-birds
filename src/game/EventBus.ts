type Listener<T> = (payload: T) => void;

/**
 * Minimal typed pub/sub. Decouples systems that shouldn't know about each
 * other directly — collision resolution doesn't know about win/loss, and
 * neither knows about React — while keeping full type safety on event
 * names and payloads via the Events map passed in as a type parameter.
 */
export class EventBus<Events extends object> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void {
    const set = this.listeners[event] ?? new Set<Listener<Events[K]>>();
    set.add(listener);
    this.listeners[event] = set;
    return () => this.off(event, listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((listener) => listener(payload));
  }
}
