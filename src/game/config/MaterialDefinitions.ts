export interface MaterialDefinition {
  id: string;
  density: number;
  friction: number;
  restitution: number;
  /** Damage points the material can absorb before breaking. */
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
    durability: 60,
    color: '#a9713d',
  },
  ice: {
    id: 'ice',
    density: 0.003,
    friction: 0.02,
    restitution: 0.1,
    durability: 25,
    color: '#a8dadc',
  },
  stone: {
    id: 'stone',
    density: 0.012,
    friction: 0.8,
    restitution: 0.05,
    durability: 140,
    color: '#7f8c8d',
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
