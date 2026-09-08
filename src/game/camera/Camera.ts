import type { Point } from '../math/Point';
import { ScreenShake } from '../fx/ScreenShake';

/**
 * World<->screen transform shared by rendering and input. Identity
 * transform for now (position at origin, zoom 1); this is the seam camera
 * tracking hooks into later without touching either side.
 *
 * Shake is applied only in worldToScreen (never screenToWorld), and as a
 * pure screen-space pixel offset added after zoom — so it never distorts
 * where a drag gesture maps to in world space, only how the frame is drawn.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;
  readonly shake = new ScreenShake();

  worldToScreen(x: number, y: number): Point {
    const offset = this.shake.getOffset();
    return { x: (x - this.x) * this.zoom + offset.x, y: (y - this.y) * this.zoom + offset.y };
  }

  screenToWorld(x: number, y: number): Point {
    return { x: x / this.zoom + this.x, y: y / this.zoom + this.y };
  }
}
