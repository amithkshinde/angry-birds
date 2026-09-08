import type { BirdAbility } from './BirdAbility';
import { NoAbility } from './abilities/NoAbility';
import { SplitAbility } from './abilities/SplitAbility';
import { SpeedBoostAbility } from './abilities/SpeedBoostAbility';
import { ExplodeAbility } from './abilities/ExplodeAbility';

/**
 * The whole extension surface for a new bird's ability: write a class
 * implementing BirdAbility, add one line here under a new id, and
 * reference that id from the bird's BirdDefinition.abilityId. Nothing
 * else in the engine ever branches on which ability (or which bird) it is.
 */
export const AbilityRegistry: Record<string, BirdAbility> = {
  none: new NoAbility(),
  split: new SplitAbility(),
  speedBoost: new SpeedBoostAbility(),
  explode: new ExplodeAbility(),
};
