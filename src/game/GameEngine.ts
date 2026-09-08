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

/**
 * Owns the fixed-timestep accumulator loop: steps Matter.js at a constant
 * rate regardless of display refresh rate, and renders every animation
 * frame with the leftover fraction used to interpolate positions smoothly.
 */
export class GameEngine {
  private entityManager = new EntityManager();
  private physicsWorld = new PhysicsWorld(GameConfig.gravity);
  private renderer: Renderer;

  private running = false;
  private rafHandle = 0;
  private lastTime = 0;
  private accumulator = 0;

  private fps = 0;
  private fpsFrameCount = 0;
  private fpsAccumMs = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.renderer = new Renderer(ctx, this.entityManager, width, height);
    this.setupScene(width, height);
  }

  /** Milestone 1 scene: ground, one wooden block, one bird dropped onto it. */
  private setupScene(width: number, height: number): void {
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
    const blockX = width * 0.55;
    const blockY = groundTopY - blockHeight / 2;

    createBlock(this.entityManager, this.physicsWorld, MaterialDefinitions.wood, blockX, blockY, blockWidth, blockHeight);

    createBird(this.entityManager, this.physicsWorld, BirdDefinitions.red, blockX, height * 0.15);
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
    this.renderer.render(alpha, this.fps);

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
