import type { EventBus } from '../EventBus';
import type { GameEvents } from '../GameEvents';

/**
 * Tracks remaining pigs and fires the win event the moment none are left.
 * Kept deliberately dumb — it doesn't know *why* a pig was removed, only
 * that the engine told it one was.
 */
export class WinLossEvaluator {
  private remainingPigs: number;

  constructor(initialPigCount: number, private eventBus: EventBus<GameEvents>) {
    this.remainingPigs = initialPigCount;
  }

  getRemainingPigs(): number {
    return this.remainingPigs;
  }

  notifyPigRemoved(): void {
    if (this.remainingPigs <= 0) return;
    this.remainingPigs -= 1;
    if (this.remainingPigs === 0) {
      this.eventBus.emit('level:won', {});
    }
  }
}
