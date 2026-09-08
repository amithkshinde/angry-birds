import type { EntityManager } from '../entities/EntityManager';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { EntityId } from '../entities/Entity';
import { Components } from '../entities/ComponentTypes';
import type { Transform } from '../entities/components/Transform';
import type { Point } from '../math/Point';
import type { PointerKind } from './InputController';

export interface SlingshotConfig {
  maxDragDistance: number;
  minDragDistance: number;
  maxLaunchSpeed: number;
  grabRadius: number;
  touchGrabRadiusMultiplier: number;
  postSpacing: number;
  postHeight: number;
}

export interface SlingshotRig {
  leftPost: { base: Point; top: Point };
  rightPost: { base: Point; top: Point };
}

export interface SlingshotVisual {
  rig: SlingshotRig;
  /** The point the elastic bands converge on; null once the bird has launched. */
  bandTarget: Point | null;
}

type SlingshotState = 'idle' | 'dragging' | 'launched';

function vectorLength(v: Point): number {
  return Math.hypot(v.x, v.y);
}

/**
 * Drag-to-launch state machine: Idle (bird resting at the anchor,
 * grabbable) -> Dragging (bird follows the pointer, clamped to the draw
 * radius) -> Launched (velocity applied, no longer interactive). All
 * points in and out are world-space; input pixel<->world conversion
 * happens one layer up via the Camera, so this class works the same
 * whether the camera is static (today) or tracking (later).
 *
 * Scoped to one bird for this milestone — a bird queue/reload is a
 * later addition and only changes what happens after a launch.
 */
export class SlingshotController {
  private state: SlingshotState = 'idle';
  readonly rig: SlingshotRig;

  constructor(
    private entityManager: EntityManager,
    private physicsWorld: PhysicsWorld,
    private anchor: Point,
    private birdId: EntityId,
    groundTopY: number,
    private config: SlingshotConfig,
  ) {
    const { postSpacing, postHeight } = config;
    this.rig = {
      leftPost: {
        base: { x: anchor.x - postSpacing, y: groundTopY },
        top: { x: anchor.x - postSpacing, y: groundTopY - postHeight },
      },
      rightPost: {
        base: { x: anchor.x + postSpacing, y: groundTopY },
        top: { x: anchor.x + postSpacing, y: groundTopY - postHeight },
      },
    };
  }

  handlePointerDown(worldPoint: Point, pointerKind: PointerKind = 'mouse'): void {
    if (this.state !== 'idle') return;
    const transform = this.entityManager.getComponent<Transform>(this.birdId, Components.Transform);
    if (!transform) return;
    const distanceToBird = Math.hypot(worldPoint.x - transform.x, worldPoint.y - transform.y);
    const grabRadius =
      pointerKind === 'touch' ? this.config.grabRadius * this.config.touchGrabRadiusMultiplier : this.config.grabRadius;
    if (distanceToBird <= grabRadius) {
      this.state = 'dragging';
      this.moveBirdTo(worldPoint);
    }
  }

  handlePointerMove(worldPoint: Point): void {
    if (this.state !== 'dragging') return;
    this.moveBirdTo(worldPoint);
  }

  handlePointerUp(worldPoint: Point): void {
    if (this.state !== 'dragging') return;
    this.moveBirdTo(worldPoint);
    this.release();
  }

  /** Touch interrupted mid-drag (e.g. an OS gesture stole the pointer) — treat as a cancelled shot. */
  handlePointerCancel(): void {
    if (this.state !== 'dragging') return;
    this.setBirdPosition(this.anchor);
    this.state = 'idle';
  }

  isLoaded(): boolean {
    return this.state !== 'launched';
  }

  isInFlight(): boolean {
    return this.state === 'launched';
  }

  getBirdId(): EntityId {
    return this.birdId;
  }

  /** Swap in a freshly-created bird after the previous one has settled, resetting to Idle. */
  loadBird(birdId: EntityId): void {
    this.birdId = birdId;
    this.state = 'idle';
    this.setBirdPosition(this.anchor);
  }

  getVisual(): SlingshotVisual {
    const transform = this.isLoaded()
      ? this.entityManager.getComponent<Transform>(this.birdId, Components.Transform)
      : undefined;
    return {
      rig: this.rig,
      bandTarget: transform ? { x: transform.x, y: transform.y } : null,
    };
  }

  /** Clamp the pointer to the draw radius around the anchor and pin the bird there. */
  private moveBirdTo(worldPoint: Point): void {
    const pull = { x: worldPoint.x - this.anchor.x, y: worldPoint.y - this.anchor.y };
    const distance = vectorLength(pull);
    const scale = distance > 0 ? Math.min(distance, this.config.maxDragDistance) / distance : 0;
    this.setBirdPosition({
      x: this.anchor.x + pull.x * scale,
      y: this.anchor.y + pull.y * scale,
    });
  }

  /**
   * While held, the bird is a static body: we drive its position directly
   * (exact, no physics lag) and keep Transform/PrevTransform identical so
   * the renderer's interpolation is a no-op — 1:1 pointer tracking, not
   * smoothed motion.
   */
  private setBirdPosition(point: Point): void {
    this.physicsWorld.setPosition(this.birdId, point);
    const transform: Transform = { x: point.x, y: point.y, angle: 0 };
    this.entityManager.addComponent<Transform>(this.birdId, Components.Transform, transform);
    this.entityManager.addComponent<Transform>(this.birdId, Components.PrevTransform, transform);
  }

  /**
   * Launch vector points from the pulled position back through the
   * anchor (classic slingshot); magnitude scales linearly with how far
   * the bird was pulled, capped at maxDragDistance/maxLaunchSpeed — so
   * "how far you pull" maps predictably to "how hard it launches" with
   * no hidden randomness or velocity spikes.
   */
  private release(): void {
    const position = this.physicsWorld.getPosition(this.birdId);
    if (!position) return;

    const pull = { x: position.x - this.anchor.x, y: position.y - this.anchor.y };
    const pullDistance = vectorLength(pull);

    if (pullDistance < this.config.minDragDistance) {
      // Too small a pull to be an intentional shot — snap back and stay loaded.
      this.setBirdPosition(this.anchor);
      this.state = 'idle';
      return;
    }

    const power = Math.min(pullDistance, this.config.maxDragDistance) / this.config.maxDragDistance;
    const speed = power * this.config.maxLaunchSpeed;

    this.physicsWorld.setStatic(this.birdId, false);
    this.physicsWorld.setVelocity(this.birdId, {
      x: (-pull.x / pullDistance) * speed,
      y: (-pull.y / pullDistance) * speed,
    });
    this.state = 'launched';
  }
}
