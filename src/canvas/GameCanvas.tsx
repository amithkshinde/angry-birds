import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GameEngine } from '../game/GameEngine';

/**
 * The only file that bridges React and the imperative game engine. Owns
 * canvas sizing (including devicePixelRatio) and the engine's lifecycle;
 * nothing about physics or rendering internals leaks past this boundary.
 * The "level complete" banner is the one piece of coarse-grained state
 * React needs from the engine, delivered via a single low-frequency
 * EventBus subscription rather than any per-frame polling.
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [levelWon, setLevelWon] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setLevelWon(false);
    const engine = new GameEngine(canvas, canvas.clientWidth, canvas.clientHeight);
    const unsubscribeLevelWon = engine.onLevelWon(() => setLevelWon(true));

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

    return () => {
      window.removeEventListener('resize', resize);
      unsubscribeLevelWon();
      engine.dispose();
    };
  }, []);

  return (
    <div style={containerStyle}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />
      {levelWon && (
        <div style={overlayStyle}>
          <div style={panelStyle}>Level Complete!</div>
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
  pointerEvents: 'none',
};

const panelStyle: CSSProperties = {
  padding: '20px 40px',
  borderRadius: 12,
  background: 'rgba(255, 255, 255, 0.95)',
  color: '#2c3e50',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 28,
  fontWeight: 700,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
};
