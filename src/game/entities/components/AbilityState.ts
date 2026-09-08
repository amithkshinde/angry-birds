/**
 * Per-bird ability bookkeeping. The ability *logic* lives in a stateless
 * BirdAbility singleton (see game/birds/BirdAbility.ts) shared by every
 * bird of that type; this component holds the one thing that must be
 * per-entity — whether *this* bird's one-shot ability has fired yet.
 */
export interface AbilityState {
  abilityId: string;
  used: boolean;
  /** Set by abilities with rest-triggered behavior (e.g. Black's auto-explode); undefined while moving. */
  restStartMs?: number;
}
