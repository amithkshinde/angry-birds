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
    /** Touch fingertips are far less precise than a mouse cursor, so touch gets a bigger forgiving grab zone. */
    touchGrabRadiusMultiplier: 1.4,
  },
  collision: {
    /** Damage dealt per unit of impact speed on a new physics contact. */
    damagePerImpactSpeed: 2.5,
    /** Impacts softer than this deal no damage — filters resting-contact jitter. */
    minImpactSpeedForDamage: 3,
    /** Lower bar than damage: even a non-damaging bump gets a small dust puff + shake. */
    minImpactSpeedForFeedback: 2,
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
  trail: {
    maxPoints: 16,
  },
  fx: {
    /** Screen-shake trauma added per event, escalating with significance. */
    shake: {
      impact: 0.1,
      hit: 0.2,
      destroy: 0.4,
    },
    dustParticleCount: 5,
    hitBurstCount: 8,
    destroyBurstCount: 14,
  },
  abilities: {
    split: {
      /** Angle (radians) each child diverges from the parent's trajectory. */
      spreadRadians: 0.26,
      /** How far from the parent, along that angle, a child spawns — avoids instant self-overlap. */
      spawnOffset: 18,
    },
    speedBoost: {
      /** Speed added on top of current velocity, independent of the bird's mass. */
      boostSpeedAdd: 24,
      /** How long the trail flares brighter after boosting. */
      glowDurationMs: 500,
    },
    black: {
      explosionRadius: 140,
      /** Damage at the blast center; falls off linearly to 0 at explosionRadius. */
      maxDamage: 90,
      /** Knockback impulse at the blast center; falls off the same way. Divided by each body's own mass, so light debris/pigs fly further than heavy blocks. */
      maxImpulse: 22,
      /** Below this speed, the bird counts as "resting" for the auto-explode timer. */
      restSpeedThreshold: 0.6,
      autoExplodeAfterRestMs: 1200,
      /** Synthetic impact speed fed to the shared hit-VFX pipeline, scaled by the same distance falloff as damage. */
      impactSpeedForVfx: 18,
    },
  },
} as const;
