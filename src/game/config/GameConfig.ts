export const GameConfig = {
  /** Fixed physics timestep in milliseconds — decoupled from display refresh rate. */
  fixedDtMs: 1000 / 60,
  /** Spiral-of-death guard: max physics steps processed per rendered frame. */
  maxStepsPerFrame: 5,
  /** Clamp huge gaps (tab switches, debugger pauses) before they hit the accumulator. */
  maxFrameTimeMs: 250,
  gravity: { x: 0, y: 1 },
  slingshot: {
    /** Anchor x position as a fraction of canvas width. */
    anchorXRatio: 0.18,
    /** Anchor height above the ground surface, in world units. */
    anchorYOffsetFromGround: 60,
    postHeight: 90,
    postSpacing: 22,
    /** How far back the bird can be pulled from the anchor. */
    maxDragDistance: 110,
    /** Below this pull distance, releasing cancels the shot instead of launching. */
    minDragDistance: 12,
    /** Launch speed at full draw (Matter velocity units per fixed step). */
    maxLaunchSpeed: 28,
    /** How close a pointer-down must land to the bird to grab it. */
    grabRadius: 45,
  },
  collision: {
    /** Damage dealt per unit of impact speed on a new physics contact. */
    damagePerImpactSpeed: 2.5,
    /** Impacts softer than this deal no damage — filters resting-contact jitter. */
    minImpactSpeedForDamage: 3,
  },
  debris: {
    count: 4,
    ttlMs: 1500,
    minSize: 6,
    maxSize: 14,
    speed: 6,
  },
  birds: {
    /** Below this speed, an in-flight bird counts as settled and the next bird loads. */
    settleSpeedThreshold: 0.6,
    /** Safety cap so a bird that never quite settles doesn't stall the level forever. */
    maxFlightTimeMs: 4000,
  },
} as const;
