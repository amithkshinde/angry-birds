import { EntityManager } from './entities/EntityManager';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { capturePreviousTransforms, syncTransformsFromPhysics } from './physics/PhysicsSync';
import { Renderer } from './render/Renderer';
import { GameConfig } from './config/GameConfig';
import { MaterialDefinitions } from './config/MaterialDefinitions';
import { BirdDefinitions } from './config/BirdDefinitions';
import { createGround } from './entities/factories/GroundFactory';
import { createBlock } from './entities/factories/BlockFactory';
import { createBird } from './entities/factories/BirdFactory';
import { InputController } from './input/InputController';
import { SlingshotController } from './input/SlingshotController';
import type { EntityId } from './entities/Entity';
import type { Point } from './math/Point';

interface SceneSetup {
  birdId: EntityId;
  anchor: Point;
  groundTopY: number;
}

/**
 * Owns the fixed-timestep accumulator loop: steps Matter.js at a constant
 * rate regardless of display refresh rate, and renders every animation
 * frame with the leftover fraction used to interpolate positions smoothly.
 * Also owns input, translating raw pointer events into slingshot actions.
 */
export class GameEngine {
  private entityManager = new EntityManager();
  private physicsWorld = new PhysicsWorld(GameConfig.gravity);
  private renderer: Renderer;
  private inputController: InputController;
  private slingshotController: SlingshotController;

  private running = false;
  private rafHandle = 0;
  private lastTime = 0;
  private accumulator = 0;

  private fps = 0;
  private fpsFrameCount = 0;
  private fpsAccumMs = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');

    this.renderer = new Renderer(ctx, this.entityManager, width, height);
    const scene = this.setupScene(width, height);

    this.inputController = new InputController(canvas);
    this.slingshotController = new SlingshotController(
      this.entityManager,
      this.physicsWorld,
      scene.anchor,
      scene.birdId,
      scene.groundTopY,
      GameConfig.slingshot,
    );
    this.wireInput();
  }

  /** Milestone 2 scene: ground, one wooden block target, and a slingshot holding one bird. */
  private setupScene(width: number, height: number): SceneSetup {
    const groundHeight = 80;
    const groundTopY = height - groundHeight;

    createGround(
      this.entityManager,
      this.physicsWorld,
      MaterialDefinitions.ground,
      width / 2,
      groundTopY + groundHeight / 2,
      Math.max(width * 2, 2000),
      groundHeight,
    );

    const blockWidth = 60;
    const blockHeight = 60;
    const blockX = width * 0.6;
    const blockY = groundTopY - blockHeight / 2;

    createBlock(this.entityManager, this.physicsWorld, MaterialDefinitions.wood, blockX, blockY, blockWidth, blockHeight);

    const anchor: Point = {
      x: width * GameConfig.slingshot.anchorXRatio,
      y: groundTopY - GameConfig.slingshot.anchorYOffsetFromGround,
    };
    const birdId = createBird(this.entityManager, this.physicsWorld, BirdDefinitions.red, anchor.x, anchor.y);
    // Held in the pouch: static until launched, so gravity and collisions
    // don't touch it while the player is aiming.
    this.physicsWorld.setStatic(birdId, true);

    return { birdId, anchor, groundTopY };
  }

  private wireInput(): void {
    const toWorld = (point: Point) => this.renderer.camera.screenToWorld(point.x, point.y);
    this.inputController.setHandlers({
      onDown: (point) => this.slingshotController.handlePointerDown(toWorld(point)),
      onMove: (point) => this.slingshotController.handlePointerMove(toWorld(point)),
      onUp: (point) => this.slingshotController.handlePointerUp(toWorld(point)),
      onCancel: () => this.slingshotController.handlePointerCancel(),
    });
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
      this.accumulator -= GameConfig.fixedDtMs;
      steps++;
    }
    // Dropped a full backlog of steps this frame (e.g. after a stall) —
    // discard remaining accumulated time rather than trying to catch up.
    if (steps === GameConfig.maxStepsPerFrame) {
      this.accumulator = 0;
    }

    const alpha = this.accumulator / GameConfig.fixedDtMs;
    this.updateFps(frameTime);
    this.renderer.render(alpha, this.fps, this.slingshotController.getVisual());

    this.rafHandle = requestAnimationFrame(this.tick);
  };

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
