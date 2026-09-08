import type { EntityManager } from '../../entities/EntityManager';
import type { Camera } from '../../camera/Camera';
import { Components } from '../../entities/ComponentTypes';
import type { Transform } from '../../entities/components/Transform';
import type { RenderShape } from '../../entities/components/RenderShape';
import type { Lifecycle } from '../../entities/components/Lifecycle';
import { interpolateTransform } from '../Interpolation';
import { SpriteAtlas } from '../SpriteAtlas';

/** Lifecycle-bound entities (debris) fade out over their last stretch of life instead of popping out of existence. */
const FADE_OUT_MS = 350;

/** Draws an image centered at the origin, preserving its aspect ratio, fit inside a boxW x boxH box. */
function drawSprite(ctx: CanvasRenderingContext2D, image: HTMLImageElement, boxW: number, boxH: number): void {
  const scale = Math.min(boxW / image.naturalWidth, boxH / image.naturalHeight);
  const drawW = image.naturalWidth * scale;
  const drawH = image.naturalHeight * scale;
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
}

export function drawWorldLayer(
  ctx: CanvasRenderingContext2D,
  entityManager: EntityManager,
  camera: Camera,
  alpha: number,
  nowMs: number,
): void {
  const shapes = entityManager.getAllWith<RenderShape>(Components.RenderShape);
  const drawOrder = Array.from(shapes.entries()).sort((a, b) => a[1].zIndex - b[1].zIndex);

  for (const [entityId, shape] of drawOrder) {
    const curr = entityManager.getComponent<Transform>(entityId, Components.Transform);
    if (!curr) continue;
    const prev = entityManager.getComponent<Transform>(entityId, Components.PrevTransform) ?? curr;
    const interpolated = interpolateTransform(prev, curr, alpha);
    const screen = camera.worldToScreen(interpolated.x, interpolated.y);

    const lifecycle = entityManager.getComponent<Lifecycle>(entityId, Components.Lifecycle);
    let opacity = 1;
    if (lifecycle) {
      const remaining = lifecycle.ttlMs - (nowMs - lifecycle.spawnedAtMs);
      opacity = Math.max(0, Math.min(1, remaining / FADE_OUT_MS));
    }

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(screen.x, screen.y);
    ctx.rotate(interpolated.angle);

    const sprite = shape.spriteKey ? SpriteAtlas.get(shape.spriteKey) : undefined;
    if (sprite) {
      const boxW = (shape.width ?? (shape.radius ?? 0) * 2) * camera.zoom;
      const boxH = (shape.height ?? (shape.radius ?? 0) * 2) * camera.zoom;
      drawSprite(ctx, sprite, boxW, boxH);
    } else if (shape.shape === 'circle' && shape.radius !== undefined) {
      ctx.fillStyle = shape.color;
      ctx.beginPath();
      ctx.arc(0, 0, shape.radius * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape.shape === 'rectangle' && shape.width !== undefined && shape.height !== undefined) {
      ctx.fillStyle = shape.color;
      const w = shape.width * camera.zoom;
      const h = shape.height * camera.zoom;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }
}
