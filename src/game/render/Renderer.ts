import type { EntityManager } from '../entities/EntityManager';
import { Camera } from '../camera/Camera';
import type { SlingshotVisual } from '../input/SlingshotController';
import type { Particle } from '../fx/ParticleSystem';
import type { Point } from '../math/Point';
import { drawBackgroundLayer } from './layers/BackgroundLayer';
import { drawSlingshotLayer } from './layers/SlingshotLayer';
import { drawTrailLayer } from './layers/TrailLayer';
import { drawWorldLayer } from './layers/WorldLayer';
import { drawParticleLayer } from './layers/ParticleLayer';
import { drawDebugLayer, drawBirdsRemainingLayer } from './layers/DebugLayer';

export interface BirdTrail {
  points: ReadonlyArray<Point>;
  color: string;
  radius: number;
}

export interface FrameInput {
  /** Leftover fraction of a physics step, for interpolating rendered positions. */
  alpha: number;
  fps: number;
  /** Wall-clock time (performance.now()) — drives particle age and shake decay. */
  nowMs: number;
  /** Real elapsed time since the last rendered frame, for shake decay. */
  frameTimeMs: number;
  slingshotVisual: SlingshotVisual;
  birdsRemaining: number;
  trail: BirdTrail | null;
  particles: ReadonlyArray<Particle>;
}

/** Per-frame draw orchestration. Reads entity state; never mutates it. */
export class Renderer {
  readonly camera = new Camera();

  constructor(
    private ctx: CanvasRenderingContext2D,
    private entityManager: EntityManager,
    private width: number,
    private height: number,
  ) {}

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  render(input: FrameInput): void {
    const ctx = this.ctx;
    this.camera.shake.update(input.frameTimeMs);

    ctx.clearRect(0, 0, this.width, this.height);
    drawBackgroundLayer(ctx, this.width, this.height);
    drawSlingshotLayer(ctx, this.camera, input.slingshotVisual);
    if (input.trail) {
      drawTrailLayer(ctx, this.camera, input.trail.points, input.trail.color, input.trail.radius);
    }
    drawWorldLayer(ctx, this.entityManager, this.camera, input.alpha, input.nowMs);
    drawParticleLayer(ctx, this.camera, input.particles, input.nowMs);
    drawDebugLayer(ctx, input.fps, this.width);
    drawBirdsRemainingLayer(ctx, input.birdsRemaining);
  }
}
