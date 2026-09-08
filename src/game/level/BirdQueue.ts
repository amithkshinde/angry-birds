/** Remaining bird types waiting to be loaded after the currently-loaded one. */
export class BirdQueue {
  private queue: string[];

  constructor(birdTypeIds: string[]) {
    this.queue = [...birdTypeIds];
  }

  next(): string | undefined {
    return this.queue.shift();
  }

  remaining(): number {
    return this.queue.length;
  }
}
