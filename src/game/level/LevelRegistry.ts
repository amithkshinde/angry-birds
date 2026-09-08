import level01 from '../../data/levels/level-01.json';
import level02 from '../../data/levels/level-02.json';
import level03 from '../../data/levels/level-03.json';
import { validateLevel, type LevelDefinition } from './LevelSchema';
import { SaveManager } from '../progress/SaveManager';

/** Ordered manifest of every level in the game — the source of truth for progression order. */
export const Levels: LevelDefinition[] = [level01, level02, level03].map((raw, index) =>
  validateLevel(raw, `level-0${index + 1}`),
);

export function getLevelById(levelId: string): LevelDefinition | undefined {
  return Levels.find((level) => level.id === levelId);
}

export function getNextLevelId(levelId: string): string | undefined {
  const index = Levels.findIndex((level) => level.id === levelId);
  return index >= 0 ? Levels[index + 1]?.id : undefined;
}

/** The first level is always open; every other level unlocks once the one before it is completed. */
export function isLevelUnlocked(index: number): boolean {
  return index === 0 || SaveManager.isCompleted(Levels[index - 1].id);
}
