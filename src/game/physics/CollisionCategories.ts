/**
 * Bitmask categories for Matter's collision filtering. All bodies collide
 * with everything by default (default mask); category bits are assigned
 * now so future filtering (e.g. debris vs. sensors) is additive.
 */
export const CollisionCategories = {
  DEFAULT: 0x0001,
  BIRD: 0x0002,
  BLOCK: 0x0004,
  GROUND: 0x0008,
  PIG: 0x0010,
} as const;
