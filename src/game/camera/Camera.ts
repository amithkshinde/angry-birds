/**
 * World<->screen transform shared by rendering and (in a later milestone)
 * input. Identity transform for now (position at origin, zoom 1); this is
 * the seam camera tracking hooks into later without touching either side.
 */
export class Camera {
  x = 0;
  y = 0;
  zoom = 1;

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.x) * this.zoom, y: (y - this.y) * this.zoom };
  }

  screenToWorld(x: number, y: number): { x: number; y: number } {
    return { x: x / this.zoom + this.x, y: y / this.zoom + this.y };
  }
}
