export type ShapeKind = 'circle' | 'rectangle';

/**
 * The flat-color shape doubles as the sprite's fallback: if `spriteKey` is
 * set, WorldLayer draws that image (once loaded) scaled to fit this
 * shape's bounding box instead of filling it. Sprites are additive polish
 * on top of an always-correct primitive, never a hard dependency — a
 * missing/loading image just means the flat shape keeps showing.
 */
export interface RenderShape {
  shape: ShapeKind;
  color: string;
  zIndex: number;
  radius?: number;
  width?: number;
  height?: number;
  spriteKey?: string;
}
