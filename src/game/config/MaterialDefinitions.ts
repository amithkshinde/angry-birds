export interface MaterialDefinition {
  id: string;
  density: number;
  friction: number;
  restitution: number;
  /** Damage points the material can absorb before breaking. Unused until damage/health lands. */
  durability: number;
  /** Placeholder fill color until sprite atlases are introduced. */
  color: string;
}

export const MaterialDefinitions: Record<string, MaterialDefinition> = {
  wood: {
    id: 'wood',
    density: 0.006,
    friction: 0.6,
    restitution: 0.15,
    durability: 100,
    color: '#a9713d',
  },
  ground: {
    id: 'ground',
    density: 1,
    friction: 1,
    restitution: 0,
    durability: Number.POSITIVE_INFINITY,
    color: '#4c7a34',
  },
};
