import { EntityManager } from './entities/EntityManager';
import { PhysicsWorld } from './physics/PhysicsWorld';
import type { CollisionContact } from './physics/PhysicsWorld';
import { capturePreviousTransforms, syncTransformsFromPhysics } from './physics/PhysicsSync';
import { CollisionResolver } from './physics/CollisionResolver';
import { Renderer } from './render/Renderer';
import { GameConfig } from './config/GameConfig';
import { MaterialDefinitions } from './config/MaterialDefinitions';
import { BirdDefinitions } from './config/BirdDefinitions';
import { createBird } from './entities/factories/BirdFactory';
import { spawnDebris } from './entities/factories/DebrisFactory';
import { InputController } from './input/InputController';
import { SlingshotController } from './input/SlingshotController';
import { WinLossEvaluator } from './level/WinLossEvaluator';
import { BirdQueue } from './level/BirdQueue';
import { buildLevel } from './level/LevelBuilder';
import type { LevelDefinition } from './level/LevelSchema';
import { EventBus } from './EventBus';
import type { GameEvents } from './GameEvents';
import { ParticleSystem } from './fx/ParticleSystem';
import { AbilityManager } from './birds/AbilityManager';
import { Components } from './entities/ComponentTypes';
import type { MaterialTag } from './entities/components/MaterialTag';
import type { BirdTag } from './entities/components/BirdTag';
import type { Lifecycle } from './entities/components/Lifecycle';
import type { SpeedBoosted } from './entities/components/SpeedBoosted';
import type { EntityId } from './entities/Entity';
import type { Point } from './math/Point';

/**
 * Owns the fixed-timestep accumulator loop: steps Matter.js at a constant
 * rate regardless of display refresh rate, and renders every animation
 * frame with the leftover fraction used to interpolate positions smoothly.
 * Also owns input (translating pointer events into slingshot actions and
 * ability taps), the collision -> damage -> win/loss pipeline, the bird
 * ability system, and the juice layered on top of it all (screen shake,
 * particles, bird trail).
 */
export class GameEngine {
  private entityManager = new EntityManager();
  private physicsWorld = new PhysicsWorld(GameConfig.gravity);
  private eventBus = new EventBus<GameEvents>();
  private particleSystem = new ParticleSystem();
  private renderer: Renderer;
  private inputController: InputController;
  private slingshotController: SlingshotController;
  private collisionResolver: CollisionResolver;
  private winLossEvaluator: WinLossEvaluator;
  private abilityManager: AbilityManager;
  private birdQueue: BirdQueue;
  private anchor: Point;
  private unsubscribeImpactFx: () => void;

  private running = false;
  private rafHandle = 0;
  private lastTime = 0;
  private accumulator = 0;

  /** True once the level is won or lost — freezes further slingshot/ability input. */
  private gameOver = false;
  /** Tracks the previous frame's in-flight state, to detect "just launched". */
  private wasInFlight = false;
  private flightStartMs = 0;
  /** Recent world-space positions of the in-flight bird, oldest first — the trail. */
  private trailPoints: Point[] = [];

  private fps = 0;
  private fpsFrameCount = 0;
  private fpsAccumMs = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, level: LevelDefinition) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');

    this.renderer = new Renderer(ctx, this.entityManager, width, height);
    const scene = buildLevel(this.entityManager, this.physicsWorld, level, width, height);
    this.anchor = scene.anchor;
    this.birdQueue = new BirdQueue(scene.remainingBirdTypeIds);

    this.inputController = new InputController(canvas);
    this.slingshotController = new SlingshotController(
      this.entityManager,
      this.physicsWorld,
      scene.anchor,
      scene.birdId,
      scene.groundTopY,
      GameConfig.slingshot,
    );
    this.collisionResolver = new CollisionResolver(
      this.entityManager,
      this.physicsWorld,
      this.eventBus,
      GameConfig.collision,
    );
    this.winLossEvaluator = new WinLossEvaluator(scene.pigCount, this.eventBus);
    this.abilityManager = new AbilityManager({
      entityManager: this.entityManager,
      physicsWorld: this.physicsWorld,
      collisionResolver: this.collisionResolver,
      eventBus: this.eventBus,
      particleSystem: this.particleSystem,
      camera: this.renderer.camera,
      spawnFreeBird: (birdTypeId, x, y, velocity) => this.spawnFreeBird(birdTypeId, x, y, velocity),
    });
    this.eventBus.on('level:won', () => {
      this.gameOver = true;
    });
    this.eventBus.on('level:lost', () => {
      this.gameOver = true;
    });

    // Pure-VFX reaction to every solid physics contact — independent of
    // CollisionResolver's damage pipeline, so even a non-damaging bounce
    // (bird off stone, a block landing on the ground) gets a puff of dust
    // and a light tap of shake.
    this.unsubscribeImpactFx = this.physicsWorld.onCollisionStart((contacts) => this.handleImpactContacts(contacts));
    // A hit that actually damaged something gets a bigger, colored burst —
    // scaled again, harder, the moment that hit is fatal (see
    // processPendingRemovals). Three escalating tiers: bump, hit, kill.
    // This also covers Black's explosion damage, which is routed through
    // the same applyExternalDamage -> 'entity:hit' path.
    this.eventBus.on('entity:hit', ({ entityId, position, impactSpeed }) => {
      const color = this.colorForEntity(entityId) ?? '#ffffff';
      this.particleSystem.spawnBurst(position.x, position.y, color, GameConfig.fx.hitBurstCount);
      this.particleSystem.spawnRing(position.x, position.y, '#ffffff', 26);
      this.renderer.camera.shake.addTrauma(GameConfig.fx.shake.hit * Math.min(1, impactSpeed / 20));
    });

    this.wireInput();
  }

  /** Creates an independent, already-flying bird — used by abilities (Blue's split children), not the slingshot. */
  private spawnFreeBird(birdTypeId: string, x: number, y: number, velocity: Point): EntityId {
    const id = createBird(this.entityManager, this.physicsWorld, BirdDefinitions[birdTypeId], x, y);
    this.physicsWorld.setVelocity(id, velocity);
    return id;
  }

  private wireInput(): void {
    const toWorld = (point: Point) => this.renderer.camera.screenToWorld(point.x, point.y);
    this.inputController.setHandlers({
      onDown: (point, kind) => {
        if (this.gameOver) return;
        // Ability activation only ever applies to an already-launched
        // bird — this is also what guarantees it can never fire while a
        // bird is still attached to the slingshot (idle/dragging).
        if (this.slingshotController.isInFlight()) {
          this.abilityManager.tryActivate(this.slingshotController.getBirdId(), performance.now());
          return;
        }
        this.slingshotController.handlePointerDown(toWorld(point), kind);
      },
      onMove: (point) => !this.gameOver && this.slingshotController.handlePointerMove(toWorld(point)),
      onUp: (point) => !this.gameOver && this.slingshotController.handlePointerUp(toWorld(point)),
      onCancel: () => !this.gameOver && this.slingshotController.handlePointerCancel(),
    });
  }

  /** Narrow, read-only hooks for the React shell to show end-of-level screens — no engine internals leak out. */
  onLevelWon(handler: () => void): () => void {
    return this.eventBus.on('level:won', handler);
  }

  onLevelLost(handler: () => void): () => void {
    return this.eventBus.on('level:lost', handler);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  handleResize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  dispose(): void {
    this.stop();
    this.inputController.dispose();
    this.collisionResolver.dispose();
    this.unsubscribeImpactFx();
    this.physicsWorld.dispose();
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    let frameTime = now - this.lastTime;
    this.lastTime = now;
    frameTime = Math.min(frameTime, GameConfig.maxFrameTimeMs);
    this.accumulator += frameTime;

    let steps = 0;
    while (this.accumulator >= GameConfig.fixedDtMs && steps < GameConfig.maxStepsPerFrame) {
      capturePreviousTransforms(this.entityManager);
      this.physicsWorld.step(GameConfig.fixedDtMs);
      syncTransformsFromPhysics(this.entityManager, this.physicsWorld);
      // Collision callbacks fired synchronously inside step() above; Matter
      // disallows mutating the world from within them, so entities marked
      // for death are only actually removed here, between steps.
      this.processPendingRemovals(now);
      this.accumulator -= GameConfig.fixedDtMs;
      steps++;
    }
    // Dropped a full backlog of steps this frame (e.g. after a stall) —
    // discard remaining accumulated time rather than trying to catch up.
    if (steps === GameConfig.maxStepsPerFrame) {
      this.accumulator = 0;
    }
    this.cleanupExpiredDebris(now);

    // Passive abilities (Black's auto-explode-after-rest) only apply once
    // a bird is actually airborne — never while still held in the pouch.
    if (this.slingshotController.isInFlight()) {
      this.abilityManager.updateActive(this.slingshotController.getBirdId(), now);
    }
    // Catch any removal an ability triggered this frame (e.g. an
    // explosion) immediately, rather than waiting for the next physics step.
    this.processPendingRemovals(now);
    this.updateBirdQueue(now);
    this.updateTrail();
    this.particleSystem.update(now, frameTime);

    const alpha = this.accumulator / GameConfig.fixedDtMs;
    this.updateFps(frameTime);
    const birdsRemaining = this.birdQueue.remaining() + (this.slingshotController.isLoaded() ? 1 : 0);
    const trailStyle = this.getTrailStyle(now);

    this.renderer.render({
      alpha,
      fps: this.fps,
      nowMs: now,
      frameTimeMs: frameTime,
      slingshotVisual: this.slingshotController.getVisual(),
      birdsRemaining,
      trail: this.trailPoints.length > 0 ? { points: this.trailPoints, ...trailStyle } : null,
      particles: this.particleSystem.getParticles(),
    });

    this.rafHandle = requestAnimationFrame(this.tick);
  };

  /** Dust puff + light shake on every solid contact, damaging or not — the ambient "physics feels weighty" layer. */
  private handleImpactContacts(contacts: CollisionContact[]): void {
    for (const contact of contacts) {
      if (contact.impactSpeed < GameConfig.collision.minImpactSpeedForFeedback) continue;
      const color = this.colorForEntity(contact.entityA) ?? this.colorForEntity(contact.entityB) ?? '#d8d8d8';
      this.particleSystem.spawnDust(contact.position.x, contact.position.y, color, GameConfig.fx.dustParticleCount);
      this.renderer.camera.shake.addTrauma(GameConfig.fx.shake.impact * Math.min(1, contact.impactSpeed / 20));
    }
  }

  /** A material's color for a block, a fixed color for pigs/birds, or undefined for ground/debris. */
  private colorForEntity(entityId: EntityId | undefined): string | undefined {
    if (entityId === undefined) return undefined;
    const materialTag = this.entityManager.getComponent<MaterialTag>(entityId, Components.MaterialTag);
    if (materialTag) return MaterialDefinitions[materialTag.materialId]?.color;
    if (this.entityManager.hasComponent(entityId, Components.PigTag)) return '#6ab04c';
    if (this.entityManager.hasComponent(entityId, Components.BirdTag)) return '#d64541';
    return undefined;
  }

  private processPendingRemovals(now: number): void {
    const destroyed = this.collisionResolver.consumePendingRemovals();
    for (const { entityId, position } of destroyed) {
      if (this.entityManager.hasComponent(entityId, Components.PigTag)) {
        this.winLossEvaluator.notifyPigRemoved();
      }

      const materialTag = this.entityManager.getComponent<MaterialTag>(entityId, Components.MaterialTag);
      const material = materialTag ? MaterialDefinitions[materialTag.materialId] : undefined;
      if (material) {
        spawnDebris(this.entityManager, this.physicsWorld, position.x, position.y, material.color, now);
      }

      // The kill gets the loudest feedback of the three tiers — a bigger,
      // longer burst, a wider shockwave ring, and the hardest shake.
      const color = material?.color ?? this.colorForEntity(entityId) ?? '#ffffff';
      this.particleSystem.spawnBurst(position.x, position.y, color, GameConfig.fx.destroyBurstCount);
      this.particleSystem.spawnRing(position.x, position.y, color, 40);
      this.renderer.camera.shake.addTrauma(GameConfig.fx.shake.destroy);

      this.physicsWorld.removeBody(entityId);
      this.entityManager.destroyEntity(entityId);
    }
  }

  private cleanupExpiredDebris(now: number): void {
    const expired: EntityId[] = [];
    for (const [entityId, lifecycle] of this.entityManager.getAllWith<Lifecycle>(Components.Lifecycle)) {
      if (now - lifecycle.spawnedAtMs >= lifecycle.ttlMs) {
        expired.push(entityId);
      }
    }
    for (const entityId of expired) {
      this.physicsWorld.removeBody(entityId);
      this.entityManager.destroyEntity(entityId);
    }
  }

  /** Detects when the currently-launched bird has settled (or timed out, or been removed by its own ability) and loads the next one. */
  private updateBirdQueue(now: number): void {
    if (this.gameOver) return;

    const inFlight = this.slingshotController.isInFlight();
    if (inFlight && !this.wasInFlight) {
      this.flightStartMs = now;
    }
    this.wasInFlight = inFlight;
    if (!inFlight) return;

    // A destroyed bird (e.g. Black's explosion) has no velocity to read —
    // that reads as "settled" here, which is exactly the reload behavior we want.
    const velocity = this.physicsWorld.getVelocity(this.slingshotController.getBirdId());
    const speed = velocity ? Math.hypot(velocity.x, velocity.y) : 0;
    const settled = speed < GameConfig.birds.settleSpeedThreshold;
    const timedOut = now - this.flightStartMs > GameConfig.birds.maxFlightTimeMs;
    if (!settled && !timedOut) return;

    const nextBirdType = this.birdQueue.next();
    if (nextBirdType === undefined) {
      this.winLossEvaluator.notifyBirdsExhausted();
      return;
    }
    const birdId = createBird(this.entityManager, this.physicsWorld, BirdDefinitions[nextBirdType], this.anchor.x, this.anchor.y);
    this.physicsWorld.setStatic(birdId, true);
    this.slingshotController.loadBird(birdId);
  }

  /** Samples the in-flight bird's position into the trail; clears it the instant the bird isn't flying. */
  private updateTrail(): void {
    if (!this.slingshotController.isInFlight()) {
      if (this.trailPoints.length > 0) this.trailPoints = [];
      return;
    }
    const position = this.physicsWorld.getPosition(this.slingshotController.getBirdId());
    if (!position) return;
    this.trailPoints.push(position);
    if (this.trailPoints.length > GameConfig.trail.maxPoints) {
      this.trailPoints.shift();
    }
  }

  private getTrailStyle(now: number): { color: string; radius: number } {
    const birdId = this.slingshotController.getBirdId();
    const birdTag = this.entityManager.getComponent<BirdTag>(birdId, Components.BirdTag);
    const def = birdTag ? BirdDefinitions[birdTag.birdTypeId] : undefined;

    const boosted = this.entityManager.getComponent<SpeedBoosted>(birdId, Components.SpeedBoosted);
    const isGlowing = !!boosted && now - boosted.activatedAtMs < GameConfig.abilities.speedBoost.glowDurationMs;

    return {
      color: isGlowing ? '#ffffff' : def?.color ?? '#d64541',
      radius: (def?.radius ?? 20) * (isGlowing ? 1.4 : 1),
    };
  }

  private updateFps(frameTimeMs: number): void {
    this.fpsFrameCount++;
    this.fpsAccumMs += frameTimeMs;
    if (this.fpsAccumMs >= 500) {
      this.fps = Math.round((this.fpsFrameCount * 1000) / this.fpsAccumMs);
      this.fpsFrameCount = 0;
      this.fpsAccumMs = 0;
    }
  }
}
