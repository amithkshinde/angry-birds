/** A block's footprint, positioned as a ratio of canvas width and a height offset above the ground surface. */
export interface BlockSpec {
  material: string;
  xRatio: number;
  yFromGround: number;
  width: number;
  height: number;
}

export interface PigSpec {
  xRatio: number;
  yFromGround: number;
  pigType?: string;
}

export interface LevelDefinition {
  id: string;
  name: string;
  /** Bird type ids in launch order; the first is loaded immediately. */
  birds: string[];
  blocks: BlockSpec[];
  pigs: PigSpec[];
}

/** Minimal shape check so a malformed level JSON fails loudly instead of crashing deep in the engine. */
export function validateLevel(data: unknown, sourceLabel: string): LevelDefinition {
  const level = data as Partial<LevelDefinition> | null;
  if (!level || typeof level.id !== 'string' || typeof level.name !== 'string') {
    throw new Error(`Invalid level "${sourceLabel}": missing id/name`);
  }
  if (!Array.isArray(level.birds) || level.birds.length === 0) {
    throw new Error(`Invalid level "${sourceLabel}": birds must be a non-empty array`);
  }
  if (!Array.isArray(level.blocks) || !Array.isArray(level.pigs) || level.pigs.length === 0) {
    throw new Error(`Invalid level "${sourceLabel}": blocks/pigs missing or no pigs`);
  }
  return level as LevelDefinition;
}
