import type { Camera } from '../../camera/Camera';
import type { SlingshotVisual } from '../../input/SlingshotController';

/**
 * Draws the fork posts and, while a bird is loaded, the two elastic bands
 * converging on it. Drawn between the background and the world layer so
 * the ground/block/bird sprites (rendered after) sit correctly in front
 * of the rig where they overlap.
 */
export function drawSlingshotLayer(ctx: CanvasRenderingContext2D, camera: Camera, visual: SlingshotVisual): void {
  const { rig, bandTarget } = visual;

  ctx.save();
  ctx.lineCap = 'round';

  if (bandTarget) {
    const target = camera.worldToScreen(bandTarget.x, bandTarget.y);
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 5;
    for (const post of [rig.leftPost, rig.rightPost]) {
      const top = camera.worldToScreen(post.top.x, post.top.y);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 10;
  for (const post of [rig.leftPost, rig.rightPost]) {
    const base = camera.worldToScreen(post.base.x, post.base.y);
    const top = camera.worldToScreen(post.top.x, post.top.y);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
  }

  ctx.restore();
}
