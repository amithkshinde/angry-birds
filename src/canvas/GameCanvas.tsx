import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GameEngine } from '../game/GameEngine';
import { getLevelById, getNextLevelId } from '../game/level/LevelRegistry';
import { SaveManager } from '../game/progress/SaveManager';

interface Props {
  levelId: string;
  /** null means "back to level select"; a string means "load this level next". */
  onFinish: (nextLevelId: string | null) => void;
}

/**
 * The only file that bridges React and the imperative game engine. Owns
 * canvas sizing (including devicePixelRatio) and the engine's lifecycle —
 * including tearing one down and building a fresh one, whether that's a
 * Retry of the same level or a level change (a new `levelId` prop) driven
 * by the parent. Win/loss are the two pieces of coarse-grained state React
 * needs from the engine, each delivered via a single low-frequency
 * EventBus subscription rather than per-frame polling.
 */
export function GameCanvas({ levelId, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const [levelWon, setLevelWon] = useState(false);
  const [levelLost, setLevelLost] = useState(false);

  const startEngine = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const level = getLevelById(levelId);
    if (!level) return;

    setLevelWon(false);
    setLevelLost(false);

    const engine = new GameEngine(canvas, canvas.clientWidth, canvas.clientHeight, level);
    const unsubscribeWon = engine.onLevelWon(() => {
      SaveManager.markCompleted(levelId);
      setLevelWon(true);
    });
    const unsubscribeLost = engine.onLevelLost(() => setLevelLost(true));

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.handleResize(width, height);
    };

    resize();
    engine.start();
    window.addEventListener('resize', resize);

    cleanupRef.current = () => {
      window.removeEventListener('resize', resize);
      unsubscribeWon();
      unsubscribeLost();
      engine.dispose();
    };
  };

  useEffect(() => {
    startEngine();
    return () => cleanupRef.current();
  }, [levelId]);

  const handleRetry = () => {
    cleanupRef.current();
    startEngine();
  };

  const nextLevelId = getNextLevelId(levelId);

  return (
    <div style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />
      {levelWon && (
        <div style={overlayStyle}>
          <div style={panelStyle}>
            <div>Level Complete!</div>
            <div style={buttonRowStyle}>
              <button style={buttonStyle} onClick={handleRetry}>
                Retry
              </button>
              {nextLevelId && (
                <button style={buttonStyle} onClick={() => onFinish(nextLevelId)}>
                  Next Level
                </button>
              )}
              <button style={secondaryButtonStyle} onClick={() => onFinish(null)}>
                Level Select
              </button>
            </div>
          </div>
        </div>
      )}
      {levelLost && (
        <div style={overlayStyle}>
          <div style={panelStyle}>
            <div>Out of Birds!</div>
            <div style={buttonRowStyle}>
              <button style={buttonStyle} onClick={handleRetry}>
                Retry
              </button>
              <button style={secondaryButtonStyle} onClick={() => onFinish(null)}>
                Level Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
};

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.35)',
};

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 16,
  padding: '24px 40px',
  borderRadius: 12,
  background: 'rgba(255, 255, 255, 0.95)',
  color: '#2c3e50',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 28,
  fontWeight: 700,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
};

const buttonStyle: CSSProperties = {
  padding: '10px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#e74c3c',
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: '#7f8c8d',
};
