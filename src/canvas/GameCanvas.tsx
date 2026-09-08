import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';

/**
 * The only file that bridges React and the imperative game engine. Owns
 * canvas sizing (including devicePixelRatio) and the engine's lifecycle;
 * nothing about physics or rendering internals leaks past this boundary.
 */
export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = new GameEngine(ctx, canvas.clientWidth, canvas.clientHeight);

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
      engine.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
    />
  );
}
