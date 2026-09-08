import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GameEngine } from '../game/GameEngine';

/**
 * The only file that bridges React and the imperative game engine. Owns
 * canvas sizing (including devicePixelRatio) and the engine's lifecycle —
 * including tearing one down and building a fresh one on Retry, which is
 * also exactly what a level restart is. Win/loss are the two pieces of
 * coarse-grained state React needs from the engine, each delivered via a
 * single low-frequency EventBus subscription rather than per-frame polling.
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const [levelWon, setLevelWon] = useState(false);
  const [levelLost, setLevelLost] = useState(false);

  const startEngine = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setLevelWon(false);
    setLevelLost(false);

    const engine = new GameEngine(canvas, canvas.clientWidth, canvas.clientHeight);
    engineRef.current = engine;
    const unsubscribeWon = engine.onLevelWon(() => setLevelWon(true));
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
      engineRef.current = null;
    };
  };

  useEffect(() => {
    startEngine();
    return () => cleanupRef.current();
  }, []);

  const handleRetry = () => {
    cleanupRef.current();
    startEngine();
  };

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
            <button style={buttonStyle} onClick={handleRetry}>
              Play Again
            </button>
          </div>
        </div>
      )}
      {levelLost && (
        <div style={overlayStyle}>
          <div style={panelStyle}>
            <div>Out of Birds!</div>
            <button style={buttonStyle} onClick={handleRetry}>
              Retry
            </button>
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

const buttonStyle: CSSProperties = {
  padding: '10px 24px',
  borderRadius: 8,
  border: 'none',
  background: '#e74c3c',
  color: '#fff',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
};
