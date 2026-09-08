import type { CSSProperties } from 'react';
import { Levels, isLevelUnlocked } from '../../game/level/LevelRegistry';
import { SaveManager } from '../../game/progress/SaveManager';

interface Props {
  onSelectLevel: (levelId: string) => void;
}

/** Reads level unlock/completion state fresh on every render — no stale cache to invalidate. */
export function LevelSelectScreen({ onSelectLevel }: Props) {
  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Select Level</h1>
      <div style={listStyle}>
        {Levels.map((level, index) => {
          const unlocked = isLevelUnlocked(index);
          const completed = SaveManager.isCompleted(level.id);
          return (
            <button
              key={level.id}
              disabled={!unlocked}
              onClick={() => onSelectLevel(level.id)}
              style={{ ...cardStyle, opacity: unlocked ? 1 : 0.45, cursor: unlocked ? 'pointer' : 'not-allowed' }}
            >
              <div style={cardTitleStyle}>{level.name}</div>
              <div style={cardStatusStyle}>{completed ? '✓ Completed' : unlocked ? 'Unlocked' : 'Locked'}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const containerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 24,
  background: 'linear-gradient(#8ecae6, #d7f0fa)',
  fontFamily: 'system-ui, sans-serif',
};

const titleStyle: CSSProperties = {
  color: '#2c3e50',
  fontSize: 36,
  margin: 0,
};

const listStyle: CSSProperties = {
  display: 'flex',
  gap: 20,
  flexWrap: 'wrap',
  justifyContent: 'center',
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  width: 160,
  padding: '20px 16px',
  borderRadius: 12,
  border: 'none',
  background: 'rgba(255, 255, 255, 0.95)',
  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
};

const cardTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: '#2c3e50',
};

const cardStatusStyle: CSSProperties = {
  fontSize: 13,
  color: '#5a6b7a',
};
