import { EntityManager } from './entities/EntityManager';
import { PhysicsWorld } from './physics/PhysicsWorld';
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
import { Components } from './entities/ComponentTypes';
import type { MaterialTag } from './entities/components/MaterialTag';
import type { Lifecycle } from './entities/components/Lifecycle';
import type { EntityId } from './entities/Entity';
import type { Point } from './math/Point';

/**
 * Owns the fixed-timestep accumulator loop: steps Matter.js at a constant
 * rate regardless of display refresh rate, and renders every animation
 * frame with the leftover fraction used to interpolate positions smoothly.
 * Also owns input (translating pointer events into slingshot actions) and
 * the collision -> damage -> win/loss pipeline.
 */
export class GameEngine {
  private entityManager = new EntityManager();
  private physicsWorld = new PhysicsWorld(GameConfig.gravity);
  private eventBus = new EventBus<GameEvents>();
  private renderer: Renderer;
  private inputController: InputController;
  private slingshotController: SlingshotController;
  private collisionResolver: CollisionResolver;
  private winLossEvaluator: WinLossEvaluator;
  private birdQueue: BirdQueue;
  private anchor: Point;

  private running = false;
  private rafHandle = 0;
  private lastTime = 0;
  private accumulator = 0;

  /** True once the level is won or lost — freezes further slingshot input. */
  private gameOver = false;
  /** Tracks the previous frame's in-flight state, to detect "just launched". */
  private wasInFlight = false;
  private flightStartMs = 0;

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
    this.eventBus.on('level:won', () => {
      this.gameOver = true;
    });
    this.eventBus.on('level:lost', () => {
      this.gameOver = true;
    });
    this.wireInput();
  }

  private wireInput(): void {
    const toWorld = (point: Point) => this.renderer.camera.screenToWorld(point.x, point.y);
    this.inputController.setHandlers({
      onDown: (point) => !this.gameOver && this.slingshotController.handlePointerDown(toWorld(point)),
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
    this.updateBirdQueue(now);

    const alpha = this.accumulator / GameConfig.fixedDtMs;
    this.updateFps(frameTime);
    const birdsRemaining = this.birdQueue.remaining() + (this.slingshotController.isLoaded() ? 1 : 0);
    this.renderer.render(alpha, this.fps, this.slingshotController.getVisual(), birdsRemaining);

    this.rafHandle = requestAnimationFrame(this.tick);
  };

  private processPendingRemovals(now: number): void {
    const destroyedIds = this.collisionResolver.consumePendingRemovals();
    for (const entityId of destroyedIds) {
      if (this.entityManager.hasComponent(entityId, Components.PigTag)) {
        this.winLossEvaluator.notifyPigRemoved();
      }

      const materialTag = this.entityManager.getComponent<MaterialTag>(entityId, Components.MaterialTag);
      const material = materialTag ? MaterialDefinitions[materialTag.materialId] : undefined;
      const position = this.physicsWorld.getPosition(entityId);
      if (material && position) {
        spawnDebris(this.entityManager, this.physicsWorld, position.x, position.y, material.color, now);
      }

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

  /** Detects when the currently-launched bird has settled (or timed out) and loads the next one. */
  private updateBirdQueue(now: number): void {
    if (this.gameOver) return;

    const inFlight = this.slingshotController.isInFlight();
    if (inFlight && !this.wasInFlight) {
      this.flightStartMs = now;
    }
    this.wasInFlight = inFlight;
    if (!inFlight) return;

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
