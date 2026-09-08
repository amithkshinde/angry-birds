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
   * offsetX/offsetY (not clientX/Y minus getBoundingClientRect) — the
   * browser computes these via real hit-testing against the target's own
   * box, so they stay correct even when the canvas or an ancestor has a
   * CSS transform applied (e.g. the landscape-lock rotation on mobile).
   * A plain clientX - rect.left breaks under rotation: the bounding rect
   * is axis-aligned in screen space, but the element's local axes aren't,
   * so the subtraction silently maps to the wrong point — which reads
   * exactly like "drag release launches in the wrong direction".
   */
  private toLocalPoint(event: PointerEvent): Point {
    return { x: event.offsetX, y: event.offsetY };
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
