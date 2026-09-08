export type ShapeKind = 'circle' | 'rectangle';

/**
 * Primitive-shape rendering, standing in for sprites until an atlas system
 * lands. WorldLayer can grow to check for a future RenderSprite component
 * alongside this one without touching this shape.
 */
export interface RenderShape {
  shape: ShapeKind;
  color: string;
  zIndex: number;
  radius?: number;
  width?: number;
  height?: number;
}
