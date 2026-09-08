import type { Point } from '../math/Point';

/**
 * "Trauma"-based screen shake (the standard game-feel technique): trauma
 * decays linearly over time, and the visible offset is trauma *squared* so
 * shake ramps up sharply for big hits but tails off quickly rather than
 * lingering — small hits barely register, a pig pop snaps the screen hard
 * for a couple of frames and settles fast.
 *
 * The offset is rolled once per update() call and cached, not regenerated
 * on every getOffset() read — worldToScreen() is called once per drawn
 * entity per frame, and if each of those calls rolled its own random
 * offset the world would visibly shake apart rather than move as one
 * rigid frame.
 */
export class ScreenShake {
  private trauma = 0;
  private offset: Point = { x: 0, y: 0 };

  constructor(
    private maxOffsetPx: number = 14,
    private decayPerMs: number = 0.0022,
  ) {}

  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Call exactly once per rendered frame, before drawing. */
  update(dtMs: number): void {
    this.trauma = Math.max(0, this.trauma - this.decayPerMs * dtMs);
    if (this.trauma <= 0) {
      this.offset = { x: 0, y: 0 };
      return;
    }
    const shakePower = this.trauma * this.trauma;
    this.offset = {
      x: (Math.random() * 2 - 1) * this.maxOffsetPx * shakePower,
      y: (Math.random() * 2 - 1) * this.maxOffsetPx * shakePower,
    };
  }

  getOffset(): Point {
    return this.offset;
  }
}
