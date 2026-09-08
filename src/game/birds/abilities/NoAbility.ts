import type { BirdAbility } from '../BirdAbility';

/** Red bird: no special ability. Exists so 'none' is a real registry entry, not a special-cased absence. */
export class NoAbility implements BirdAbility {
  activate(): void {
    // Intentionally does nothing.
  }
}
