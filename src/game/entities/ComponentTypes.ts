/**
 * Central registry of component names, so systems and factories share one
 * set of string keys instead of scattering magic strings.
 */
export const Components = {
  Transform: 'transform',
  PrevTransform: 'prevTransform',
  PhysicsBody: 'physicsBody',
  RenderShape: 'renderShape',
  MaterialTag: 'materialTag',
  BirdTag: 'birdTag',
  PigTag: 'pigTag',
  Health: 'health',
  Lifecycle: 'lifecycle',
  AbilityState: 'abilityState',
  SpeedBoosted: 'speedBoosted',
} as const;
