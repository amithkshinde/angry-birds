export interface PigDefinition {
  id: string;
  health: number;
  radius: number;
  /** Placeholder fill color until sprite atlases are introduced. */
  color: string;
}

export const PigDefinitions: Record<string, PigDefinition> = {
  small: {
    id: 'small',
    health: 40,
    radius: 20,
    color: '#6ab04c',
  },
};
