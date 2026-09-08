/**
 * Loads and caches sprite images by key. A missing/failed image resolves
 * to `undefined` forever from get() rather than throwing or retrying —
 * WorldLayer always has a flat-color RenderShape to fall back to, so a
 * sprite is additive polish, never a hard dependency for the game to
 * render correctly. This is what lets "drop a PNG at the right path" be
 * the entire integration step: nothing has to be wired up to *start*
 * using a sprite once it exists.
 */
class SpriteAtlasStore {
  private images = new Map<string, HTMLImageElement>();
  private failed = new Set<string>();

  /** Idempotent — safe to call every time a level loads even if already (being) loaded. */
  preload(key: string, src: string): void {
    if (this.images.has(key) || this.failed.has(key)) return;
    const image = new Image();
    image.onload = () => {
      this.images.set(key, image);
    };
    image.onerror = () => {
      this.failed.add(key);
    };
    image.src = src;
  }

  get(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }
}

export const SpriteAtlas = new SpriteAtlasStore();
