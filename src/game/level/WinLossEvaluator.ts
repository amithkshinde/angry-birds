import type { EventBus } from '../EventBus';
import type { GameEvents } from '../GameEvents';

/**
 * Tracks remaining pigs and fires win/loss the moment either is decided.
 * Kept deliberately dumb — it doesn't know *why* a pig was removed or
 * birds ran out, only that the engine told it so. The `finished` guard
 * makes both notify methods safe to call after the level is already
 * decided (e.g. the last bird settles just after the last pig died).
 */
export class WinLossEvaluator {
  private remainingPigs: number;
  private finished = false;

  constructor(initialPigCount: number, private eventBus: EventBus<GameEvents>) {
    this.remainingPigs = initialPigCount;
  }

  getRemainingPigs(): number {
    return this.remainingPigs;
  }

  notifyPigRemoved(): void {
    if (this.finished || this.remainingPigs <= 0) return;
    this.remainingPigs -= 1;
    if (this.remainingPigs === 0) {
      this.finished = true;
      this.eventBus.emit('level:won', {});
    }
  }

  /** Call once no birds remain to launch (queue empty and the last one settled). */
  notifyBirdsExhausted(): void {
    if (this.finished) return;
    if (this.remainingPigs > 0) {
      this.finished = true;
      this.eventBus.emit('level:lost', {});
    }
  }
}
