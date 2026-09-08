const STORAGE_KEY = 'angry-birds:progress:v1';

interface SaveData {
  completedLevelIds: string[];
}

function readSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedLevelIds: [] };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { completedLevelIds: Array.isArray(parsed.completedLevelIds) ? parsed.completedLevelIds : [] };
  } catch {
    // Corrupt JSON, or localStorage unavailable (private mode) — start fresh rather than crash.
    return { completedLevelIds: [] };
  }
}

/** Persists which levels have been completed, in localStorage, keyed by level id. */
export const SaveManager = {
  isCompleted(levelId: string): boolean {
    return readSave().completedLevelIds.includes(levelId);
  },

  markCompleted(levelId: string): void {
    const data = readSave();
    if (data.completedLevelIds.includes(levelId)) return;
    data.completedLevelIds.push(levelId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full/unavailable — progress just won't persist this session.
    }
  },
};
