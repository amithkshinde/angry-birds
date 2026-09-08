export interface BirdDefinition {
  id: string;
  mass: number;
  radius: number;
  restitution: number;
  friction: number;
  /** Placeholder fill color until sprite atlases are introduced. */
  color: string;
  /** Reserved for the collision/damage pipeline in a later milestone. */
  baseDamage: number;
}

export const BirdDefinitions: Record<string, BirdDefinition> = {
  red: {
    id: 'red',
    mass: 5,
    radius: 22,
    restitution: 0.35,
    friction: 0.5,
    color: '#d64541',
    baseDamage: 10,
  },
};
