import type { EntityManager } from '../../entities/EntityManager';
import type { Camera } from '../../camera/Camera';
import { Components } from '../../entities/ComponentTypes';
import type { Transform } from '../../entities/components/Transform';
import type { RenderShape } from '../../entities/components/RenderShape';
import { interpolateTransform } from '../Interpolation';

export function drawWorldLayer(
  ctx: CanvasRenderingContext2D,
  entityManager: EntityManager,
  camera: Camera,
  alpha: number,
): void {
  const shapes = entityManager.getAllWith<RenderShape>(Components.RenderShape);
  const drawOrder = Array.from(shapes.entries()).sort((a, b) => a[1].zIndex - b[1].zIndex);

  for (const [entityId, shape] of drawOrder) {
    const curr = entityManager.getComponent<Transform>(entityId, Components.Transform);
    if (!curr) continue;
    const prev = entityManager.getComponent<Transform>(entityId, Components.PrevTransform) ?? curr;
    const interpolated = interpolateTransform(prev, curr, alpha);
    const screen = camera.worldToScreen(interpolated.x, interpolated.y);

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(interpolated.angle);
    ctx.fillStyle = shape.color;

    if (shape.shape === 'circle' && shape.radius !== undefined) {
      ctx.beginPath();
      ctx.arc(0, 0, shape.radius * camera.zoom, 0, Math.PI * 2);
      ctx.fill();
    } else if (shape.shape === 'rectangle' && shape.width !== undefined && shape.height !== undefined) {
      const w = shape.width * camera.zoom;
      const h = shape.height * camera.zoom;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }
}
