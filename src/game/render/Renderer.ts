import type { EntityManager } from '../entities/EntityManager';
import { Camera } from '../camera/Camera';
import { drawBackgroundLayer } from './layers/BackgroundLayer';
import { drawWorldLayer } from './layers/WorldLayer';
import { drawDebugLayer } from './layers/DebugLayer';

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

  render(alpha: number, fps: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    drawBackgroundLayer(ctx, this.width, this.height);
    drawWorldLayer(ctx, this.entityManager, this.camera, alpha);
    drawDebugLayer(ctx, fps, this.width);
  }
}
