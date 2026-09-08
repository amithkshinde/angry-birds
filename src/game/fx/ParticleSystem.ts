export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnedAtMs: number;
  ttlMs: number;
  color: string;
  radius: number;
  kind: 'dot' | 'ring';
  /** Downward acceleration in px/s² applied to dots; rings ignore this. */
  gravity: number;
}

/**
 * Pure-visual particles, deliberately kept outside the entity/Matter
 * pipeline: they don't collide, don't need a physics body, and can be
 * created by the dozen on every impact without touching the physics
 * solver. A simple array + kinematic integration is the right tool here,
 * not the ECS machinery meant for gameplay-relevant objects.
 */
export class ParticleSystem {
  private particles: Particle[] = [];

  spawnDust(x: number, y: number, color: string, count: number): void {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        spawnedAtMs: now,
        ttlMs: 350 + Math.random() * 250,
        color,
        radius: 1.5 + Math.random() * 2,
        kind: 'dot',
        gravity: 0.006,
      });
    }
  }

  spawnBurst(x: number, y: number, color: string, count: number): void {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        spawnedAtMs: now,
        ttlMs: 450 + Math.random() * 300,
        color,
        radius: 2.5 + Math.random() * 3,
        kind: 'dot',
        gravity: 0.008,
      });
    }
  }

  spawnRing(x: number, y: number, color: string, maxRadius: number): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      spawnedAtMs: performance.now(),
      ttlMs: 280,
      color,
      radius: maxRadius,
      kind: 'ring',
      gravity: 0,
    });
  }

  update(nowMs: number, dtMs: number): void {
    const dtSec = dtMs / 1000;
    this.particles = this.particles.filter((p) => nowMs - p.spawnedAtMs < p.ttlMs);
    for (const p of this.particles) {
      if (p.kind === 'dot') {
        p.vy += p.gravity * dtMs;
        p.x += p.vx * dtSec * 60;
        p.y += p.vy * dtSec * 60;
      }
    }
  }

  /** Raw particles for the render layer to draw; it computes per-particle age itself to avoid a per-frame array copy. */
  getParticles(): ReadonlyArray<Particle> {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
