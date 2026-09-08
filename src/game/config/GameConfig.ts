export const GameConfig = {
  /** Fixed physics timestep in milliseconds — decoupled from display refresh rate. */
  fixedDtMs: 1000 / 60,
  /** Spiral-of-death guard: max physics steps processed per rendered frame. */
  maxStepsPerFrame: 5,
  /** Clamp huge gaps (tab switches, debugger pauses) before they hit the accumulator. */
  maxFrameTimeMs: 250,
  gravity: { x: 0, y: 1 },
} as const;
