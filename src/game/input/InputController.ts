import type { Point } from '../math/Point';

export interface InputHandlers {
  onDown?: (point: Point) => void;
  onMove?: (point: Point) => void;
  onUp?: (point: Point) => void;
  onCancel?: () => void;
}

/**
 * Normalizes mouse, touch, and stylus input into one stream via Pointer
 * Events, exposing canvas-local (CSS-pixel) coordinates. Only one active
 * pointer is tracked at a time, which is all a one-bird-at-a-time slingshot
 * needs; pointer capture keeps a drag tracking correctly even if it leaves
 * the canvas bounds before release.
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

  private toLocalPoint(event: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
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
    this.handlers.onDown?.(this.toLocalPoint(event));
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    event.preventDefault();
    this.handlers.onMove?.(this.toLocalPoint(event));
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    event.preventDefault();
    this.handlers.onUp?.(this.toLocalPoint(event));
  };

  private handlePointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    this.activePointerId = null;
    this.handlers.onCancel?.();
  };
}
