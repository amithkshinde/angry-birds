import type { Transform } from '../entities/components/Transform';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Blend between the transform before the last physics step and the
 * transform after it, using the accumulator's leftover fraction. This is
 * what keeps rendering smooth when the fixed physics rate and the
 * display's refresh rate don't line up exactly.
 */
export function interpolateTransform(prev: Transform, curr: Transform, alpha: number): Transform {
  return {
    x: lerp(prev.x, curr.x, alpha),
    y: lerp(prev.y, curr.y, alpha),
    angle: lerp(prev.angle, curr.angle, alpha),
  };
}
