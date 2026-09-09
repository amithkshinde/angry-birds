import type { Point } from '../math/Point';

export type PointerKind = 'mouse' | 'touch' | 'pen';

export interface InputHandlers {
  onDown?: (point: Point, pointerKind: PointerKind) => void;
  onMove?: (point: Point, pointerKind: PointerKind) => void;
  onUp?: (point: Point, pointerKind: PointerKind) => void;
  onCancel?: () => void;
}

function toPointerKind(type: string): PointerKind {
  return type === 'touch' || type === 'pen' ? type : 'mouse';
}

/**
 * Normalizes mouse, touch, and stylus input into one stream via Pointer
 * Events, exposing canvas-local (CSS-pixel) coordinates. Only one active
 * pointer is tracked at a time, which is all a one-bird-at-a-time slingshot
 * needs; pointer capture keeps a drag tracking correctly even if it leaves
 * the canvas bounds before release. The input's pointerType is passed
 * through too, since touch input deserves a more forgiving hit-test than
 * a precise mouse cursor.
 */
export class InputController {
  private handlers: InputHandlers = {};
  private activePointerId: number | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
  }

  setHandlers(handlers: InputHandlers): void {
    this.handlers = handlers;
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
  }

  /**
   * clientX/clientY + getBoundingClientRect, not offsetX/offsetY.
   * offsetX/offsetY looked like the right tool (the browser computes them
   * via hit-testing, so they should already account for any CSS
   * transform) but touch-derived PointerEvents' offsetX/offsetY are
   * unreliable on real mobile Safari, especially once setPointerCapture
   * is in play — it can report stale or zeroed values on pointerup,
   * which reads as "drag release does nothing" (the computed pull
   * distance comes out near zero, so SlingshotController treats it as a
   * cancelled shot). clientX/clientY and getBoundingClientRect() are both
   * universally reliable, so instead we do the rotation math ourselves,
   * matching the exact transform applied in index.css: under the
   * landscape lock, the canvas's screen-space rect has width/height
   * swapped relative to its own local (pre-rotation) box, so local X
   * comes from distance-from-the-top and local Y from distance-from-the-
   * right, rather than the usual left/top.
   */
  private toLocalPoint(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    const isLandscapeLocked = window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches;
    if (isLandscapeLocked) {
      return { x: event.clientY - rect.top, y: rect.right - event.clientX };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null) return;
    this.activePointerId = event.pointerId;
    try {
      // Keeps a drag tracking if the finger/pointer leaves the canvas
      // bounds before release. Not critical to gameplay, so a failure
      // here (unsupported pointer, some browser edge cases) must never
      // block the actual down handler below from running.
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Ignored — see comment above.
    }
    event.preventDefault();
    this.handlers.onDown?.(this.toLocalPoint(event), toPointerKind(event.pointerType));
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    this.handlers.onMove?.(this.toLocalPoint(event), toPointerKind(event.pointerType));
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    event.preventDefault();
    this.handlers.onUp?.(this.toLocalPoint(event), toPointerKind(event.pointerType));
  };

  private handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.handlers.onCancel?.();
  };
}
