import type { Camera } from '../../camera/Camera';
import type { Point } from '../../math/Point';

/** A fading, shrinking dot-trail behind an in-flight bird — oldest points smallest and most transparent. */
export function drawTrailLayer(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  points: ReadonlyArray<Point>,
  color: string,
  baseRadius: number,
): void {
  if (points.length === 0) return;
  ctx.save();
  for (let i = 0; i < points.length; i++) {
    const t = (i + 1) / points.length; // 0 = oldest, 1 = newest
    const screen = camera.worldToScreen(points[i].x, points[i].y);
    ctx.globalAlpha = t * 0.35;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, baseRadius * 0.5 * t * camera.zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
