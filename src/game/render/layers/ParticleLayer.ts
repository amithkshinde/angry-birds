import type { Camera } from '../../camera/Camera';
import type { Particle } from '../../fx/ParticleSystem';

/** Draws impact dust, hit bursts, and shockwave rings — dot particles fade+shrink, rings fade+expand. */
export function drawParticleLayer(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  particles: ReadonlyArray<Particle>,
  nowMs: number,
): void {
  ctx.save();
  for (const p of particles) {
    const age = Math.min(1, (nowMs - p.spawnedAtMs) / p.ttlMs);
    const screen = camera.worldToScreen(p.x, p.y);

    if (p.kind === 'ring') {
      const radius = p.radius * (0.3 + age * 0.7) * camera.zoom;
      ctx.globalAlpha = 1 - age;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * (1 - age) + 0.5;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, p.radius * (1 - age * 0.4) * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
