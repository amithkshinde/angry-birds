/** Marks an entity for automatic removal after ttlMs — used for debris cleanup. */
export interface Lifecycle {
  spawnedAtMs: number;
  ttlMs: number;
}
