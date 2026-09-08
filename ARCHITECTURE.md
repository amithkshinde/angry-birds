# Angry Birds–Inspired Physics Puzzle Game — Architecture

Stack: React + TypeScript + Vite + Matter.js + HTML Canvas
Targets: Browser (desktop + mobile touch), 60 FPS, 50+ JSON-driven levels, room to grow into special abilities, new materials, and camera tracking.

This document is architecture only — no gameplay implementation code. Type/interface shapes are included where they *are* the architecture (data models, contracts between systems).

---

## 1. Complete Project Architecture

### 1.1 Guiding principles

- **Simulation/Presentation split.** Matter.js owns physics truth. A separate renderer reads that truth and draws it. Neither layer reaches into the other's internals.
- **React owns chrome, not gameplay.** React renders menus, HUD, level-select, pause/win/lose overlays, and mounts the canvas. It never re-renders per physics tick. The game loop lives outside React's render cycle (a class/module driven by `requestAnimationFrame`), communicating with React through a thin, low-frequency event/state bridge.
- **Entity-based, not deeply OOP.** Entities are lightweight IDs + a bag of components (Physics, Render, Health, Material, AI/Behavior, Ability). Systems operate over components. This isn't a full ECS framework from day one, but the shapes are ECS-compatible so it can graduate to one (e.g. `bitecs`) without a rewrite if entity counts grow.
- **Data-driven everything.** Levels, bird types, pig types, materials, and difficulty curves are JSON/config, not code. Adding level 51 or a new material should never require touching engine code.
- **Deterministic, fixed-timestep simulation.** Physics steps at a fixed dt regardless of display refresh rate; rendering interpolates between steps. This keeps gameplay feel and collision outcomes consistent across devices.
- **Composition over inheritance.** Bird "types" and pig "types" are data + component composition (a `SpecialAbility` component, a `Material` component), not subclass hierarchies. This is what makes future special-ability birds and new materials additive rather than invasive.

### 1.2 Layered architecture

```
┌───────────────────────────────────────────────────────────────┐
│  App Shell (React)                                             │
│  Routing, Main Menu, Level Select, HUD, Pause/Win/Lose overlays │
└───────────────────────────────────────────────────────────────┘
                              │ mounts / controls
                              ▼
┌───────────────────────────────────────────────────────────────┐
│  Game Shell (non-React, imperative)                             │
│  GameEngine — owns the RAF loop, fixed-timestep accumulator,    │
│  and wires the systems below together                          │
└───────────────────────────────────────────────────────────────┘
        │                 │                  │               │
        ▼                 ▼                  ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌────────────────┐ ┌────────────────┐
│ Physics Layer │ │ Entity Layer  │ │ Rendering Layer │ │ Input Layer    │
│ Matter.js      │ │ EntityManager │ │ Canvas2D        │ │ InputController│
│ World/Engine   │ │ Components    │ │ Camera          │ │ SlingshotInput │
│ CollisionMgr   │ │ Factories     │ │ Layered draw    │ │ Gesture state  │
└───────────────┘ └───────────────┘ └────────────────┘ └────────────────┘
        │                 │                  │               │
        └────────┬────────┴──────────┬───────┴───────┬───────┘
                  ▼                   ▼               ▼
        ┌────────────────┐  ┌─────────────────┐ ┌───────────────┐
        │ Level System    │  │ Game State/FSM   │ │ Audio Manager │
        │ JSON loader     │  │ EventBus         │ │               │
        │ Entity spawner  │  │ Score/Progress   │ │               │
        └────────────────┘  └─────────────────┘ └───────────────┘
```

### 1.3 Cross-cutting: the Event Bus

A single typed pub/sub `EventBus` decouples systems so, e.g., the Physics layer doesn't know about UI, and the Level system doesn't know about rendering. Examples of events: `bird:launched`, `pig:hit`, `pig:destroyed`, `structure:collapsed`, `level:won`, `level:lost`, `bird:ability-activated`. React subscribes to the coarse-grained ones (level won/lost, score changed, birds remaining) to update chrome; internal systems subscribe to the fine-grained ones.

---

## 2. Folder Structure

```
angry-birds/
├── public/
│   ├── assets/
│   │   ├── sprites/            # atlases: birds, pigs, materials, fx
│   │   ├── audio/
│   │   └── fonts/
│   └── levels/                 # (optional) statically served level JSON if not bundled
│
├── src/
│   ├── main.tsx                 # React entry, mounts <App/>
│   ├── App.tsx                  # Router / top-level screen switch
│   │
│   ├── app/                     # React "chrome" layer
│   │   ├── screens/
│   │   │   ├── MainMenuScreen.tsx
│   │   │   ├── LevelSelectScreen.tsx
│   │   │   ├── GameScreen.tsx           # mounts <GameCanvas/>, owns pause/HUD overlays
│   │   │   ├── LevelCompleteOverlay.tsx
│   │   │   └── LevelFailedOverlay.tsx
│   │   ├── hud/
│   │   │   ├── BirdQueueHUD.tsx
│   │   │   ├── ScoreHUD.tsx
│   │   │   └── PauseButton.tsx
│   │   ├── components/          # generic UI atoms (Button, Modal, StarRating…)
│   │   └── state/
│   │       ├── useGameBridge.ts # hook subscribing React to EventBus/GameEngine
│   │       └── uiStore.ts       # lightweight UI-only state (zustand/jotai/context)
│   │
│   ├── game/                    # non-React engine — framework-agnostic core
│   │   ├── GameEngine.ts        # RAF loop, fixed-timestep accumulator, orchestration
│   │   ├── GameStateMachine.ts  # Boot/Menu/Loading/Playing/Paused/Won/Lost
│   │   ├── EventBus.ts
│   │   │
│   │   ├── physics/
│   │   │   ├── PhysicsWorld.ts       # Matter.Engine wrapper, step(), body registry
│   │   │   ├── CollisionCategories.ts# bitmask constants (bird, pig, block, ground, sensor…)
│   │   │   ├── CollisionResolver.ts  # maps Matter collision events -> game events + damage
│   │   │   ├── MaterialPhysics.ts    # density/friction/restitution per Material
│   │   │   └── PhysicsBodyFactory.ts # entity -> Matter.Body construction
│   │   │
│   │   ├── entities/
│   │   │   ├── Entity.ts             # id + component bag (type, no logic)
│   │   │   ├── EntityManager.ts      # create/destroy/query entities
│   │   │   ├── components/
│   │   │   │   ├── Transform.ts
│   │   │   │   ├── PhysicsBody.ts    # ref to Matter.Body
│   │   │   │   ├── RenderSprite.ts
│   │   │   │   ├── Health.ts
│   │   │   │   ├── MaterialTag.ts
│   │   │   │   ├── BirdTag.ts
│   │   │   │   ├── PigTag.ts
│   │   │   │   ├── AbilityComponent.ts
│   │   │   │   └── Lifecycle.ts      # pending-removal, spawn time, TTL for fx/debris
│   │   │   └── factories/
│   │   │       ├── BirdFactory.ts
│   │   │       ├── PigFactory.ts
│   │   │       ├── BlockFactory.ts
│   │   │       └── SlingshotFactory.ts
│   │   │
│   │   ├── abilities/
│   │   │   ├── AbilityRegistry.ts    # id -> ability handler lookup (open for extension)
│   │   │   └── types.ts              # AbilityDefinition, AbilityTrigger enums
│   │   │
│   │   ├── level/
│   │   │   ├── LevelSchema.ts        # TS types + JSON-schema for validation
│   │   │   ├── LevelLoader.ts        # fetch/parse/validate level JSON
│   │   │   ├── LevelBuilder.ts       # JSON -> live entities via factories
│   │   │   ├── LevelRegistry.ts      # manifest of all levels, unlock rules
│   │   │   └── WinLossEvaluator.ts   # checks pigs-remaining / birds-remaining each tick
│   │   │
│   │   ├── input/
│   │   │   ├── InputController.ts    # unified pointer/touch/mouse abstraction
│   │   │   ├── SlingshotController.ts# drag/aim/release state machine
│   │   │   └── CoordinateMapper.ts   # screen<->world<->canvas-DPR mapping
│   │   │
│   │   ├── camera/
│   │   │   ├── Camera.ts             # viewport, zoom, world<->screen transform
│   │   │   └── CameraController.ts   # follow/track behaviors (launch, impact, pan-to-next)
│   │   │
│   │   ├── render/
│   │   │   ├── Renderer.ts           # top-level draw orchestration per frame
│   │   │   ├── layers/
│   │   │   │   ├── BackgroundLayer.ts
│   │   │   │   ├── WorldLayer.ts     # entities, interpolated
│   │   │   │   ├── EffectsLayer.ts   # particles, debris, trajectory trail
│   │   │   │   └── DebugLayer.ts     # physics wireframes, toggled in dev
│   │   │   ├── SpriteAtlas.ts
│   │   │   └── Interpolation.ts      # lerp between prev/curr physics state
│   │   │
│   │   ├── audio/
│   │   │   └── AudioManager.ts
│   │   │
│   │   ├── progress/
│   │   │   ├── SaveManager.ts        # localStorage persistence
│   │   │   └── ScoreCalculator.ts    # stars, score formula
│   │   │
│   │   └── config/
│   │       ├── GameConfig.ts         # tunables: gravity, timestep, slingshot power…
│   │       ├── BirdDefinitions.ts    # data for built-in bird types
│   │       ├── PigDefinitions.ts
│   │       └── MaterialDefinitions.ts
│   │
│   ├── data/
│   │   └── levels/
│   │       ├── level-001.json
│   │       ├── level-002.json
│   │       └── ...                   # up to 50+, or fetched from CDN/CMS
│   │
│   ├── canvas/
│   │   └── GameCanvas.tsx            # React boundary: <canvas> + owns GameEngine lifecycle
│   │
│   └── types/
│       └── global.d.ts
│
├── tests/
│   ├── unit/                    # LevelLoader validation, ScoreCalculator, CollisionResolver
│   └── integration/              # headless engine tick tests (no rendering)
│
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

Key boundary: everything under `src/game/` must be importable and testable with **zero React dependency**. `GameCanvas.tsx` is the only bridge file that touches both worlds.

---

## 3. Core Classes and Responsibilities

| Class | Responsibility | Does NOT do |
|---|---|---|
| `GameEngine` | Owns the RAF loop, fixed-timestep accumulator, calls `PhysicsWorld.step()` at fixed dt, calls `Renderer.render()` every frame with interpolation alpha, drives the `GameStateMachine`, wires up all managers | Draw anything, know about React, know level JSON shape |
| `GameStateMachine` | Enumerates and transitions between coarse game states (Boot, MainMenu, LevelLoading, Playing, Paused, LevelComplete, LevelFailed); guards valid transitions; emits state-change events | Own gameplay rules (win/loss *conditions* live in `WinLossEvaluator`) |
| `EventBus` | Typed pub/sub for decoupled cross-system communication | Hold game state itself |
| `PhysicsWorld` | Wraps `Matter.Engine`/`Matter.World`; exposes `step(dt)`, add/remove body, raycast/query helpers; owns collision event wiring | Know what a "pig" is — it deals in bodies and categories, not game concepts |
| `PhysicsBodyFactory` | Converts an entity + its `Transform`/`MaterialTag` component data into a configured `Matter.Body` (shape, density, friction, restitution, collision filter) | Decide game rules from collisions |
| `CollisionResolver` | Subscribes to Matter's `collisionStart`/`collisionActive`, computes impact force, maps `Matter.Body` pairs back to entities via a body-id→entity-id registry, applies damage, emits `pig:hit`/`structure:damaged` events | Mutate rendering |
| `EntityManager` | Create/destroy entities, attach/query components, iterate entities by component signature for systems | Physics or rendering logic itself |
| `Entity` | Just an id + a component map (data holder) | Any behavior |
| `*Factory` (Bird/Pig/Block/Slingshot) | Given level JSON entity data + definitions (`BirdDefinitions` etc.), produce a fully composed entity (components + physics body + sprite) | Parse raw JSON (that's `LevelLoader`'s job) |
| `AbilityRegistry` | Maps an ability id (e.g. `"split-shot"`, `"speed-boost"`) to a handler implementing a common `Ability` interface; looked up by `SlingshotController`/`InputController` on activation trigger | Hard-code which birds have which ability (that's data, via `AbilityComponent`) |
| `LevelLoader` | Fetch level JSON, validate against `LevelSchema`, produce a typed `LevelDefinition` | Spawn entities |
| `LevelBuilder` | Consume a validated `LevelDefinition`, call factories to populate `EntityManager` and `PhysicsWorld` | Fetch/parse JSON |
| `LevelRegistry` | Manifest of all levels (id, unlock requirements, star thresholds), independent of any single level's contents | Load level contents eagerly |
| `WinLossEvaluator` | Each tick (or on relevant events), checks "all pigs eliminated" / "no birds and no pigs eliminated yet" and emits `level:won`/`level:lost` | Render UI for win/loss (React overlays own that) |
| `InputController` | Normalizes mouse, touch, and pointer events into one internal pointer stream (position, down/move/up, in canvas-space) | Know slingshot-specific rules |
| `SlingshotController` | State machine: idle → dragging → aiming(constrained) → released; computes launch vector/power from drag delta; on release, hands off to physics (apply force/velocity to the active bird body) | Handle raw browser events (delegates to `InputController`) |
| `Camera` | World↔screen transform (position, zoom); used by both rendering and input coordinate mapping | Decide *when* to move (that's `CameraController`) |
| `CameraController` | Behaviors: follow launched bird, snap to impact, pan to reveal next structure, return to slingshot | Own the transform math (delegates to `Camera`) |
| `Renderer` | Per-frame draw orchestration: clear, apply camera transform, draw layers in order, restore | Own game logic |
| Layer classes (`WorldLayer` etc.) | Draw a specific concern (entities, background parallax, particles, debug wireframes) reading interpolated entity state | Mutate entity/physics state |
| `Interpolation` | Given previous and current physics transforms + an alpha (0..1), compute the render-time transform | Physics stepping itself |
| `AudioManager` | Play/stop sfx & music, respond to `EventBus` events (`pig:destroyed` → pop sound) | Anything gameplay-affecting |
| `SaveManager` | Persist/read unlocked levels, star ratings, settings (localStorage now; swappable backend later) | Compute scores |
| `ScoreCalculator` | Pure function(s): remaining birds, structure damage, pigs killed → score/star rating | Persist anything |
| `GameConfig` | Central tunables (gravity, fixed timestep, slingshot max draw distance/power curve) | Level-specific data |

React-side classes are intentionally thin: `GameCanvas.tsx` constructs a `GameEngine`, starts/stops it on mount/unmount, and exposes an imperative handle (`pause()`, `resume()`, `loadLevel(id)`) plus a subscription hook (`useGameBridge`) that taps the `EventBus` for HUD-relevant events only (score, birds remaining, win/loss), using React state at a throttled/coarse granularity so re-renders never compete with the physics loop.

---

## 4. Data Models

### 4.1 Level definition (JSON-driven)

```ts
interface LevelDefinition {
  id: string;                    // "level-014"
  schemaVersion: number;         // for forward-compatible migrations
  name: string;
  world: {
    width: number;
    height: number;
    gravity: { x: number; y: number };
    groundY: number;
  };
  camera: {
    initialZoom: number;
    bounds?: { minX: number; maxX: number };
  };
  slingshot: { x: number; y: number };
  birds: BirdSpawnEntry[];        // ordered queue
  pigs: PigPlacement[];
  blocks: BlockPlacement[];
  materials?: Record<string, MaterialOverride>; // per-level tuning overrides
  scoring: {
    starThresholds: [number, number, number]; // score needed for 1/2/3 stars
  };
  background: { id: string; parallaxLayers?: ParallaxLayerRef[] };
}

interface BirdSpawnEntry {
  birdType: string;               // references BirdDefinitions registry
}

interface PigPlacement {
  id: string;
  pigType: string;                // references PigDefinitions registry
  x: number; y: number; rotation?: number;
}

interface BlockPlacement {
  id: string;
  shape: "rectangle" | "circle" | "triangle" | "polygon";
  material: string;               // references MaterialDefinitions registry
  x: number; y: number; rotation?: number;
  width?: number; height?: number; radius?: number; vertices?: [number, number][];
}
```

### 4.2 Registries (engine-level data, not per-level)

```ts
interface BirdDefinition {
  id: string;                     // "red", "yellow", "black", "custom-ice-bird"
  mass: number;
  radius: number;
  restitution: number;
  spriteAtlasKey: string;
  ability?: AbilityDefinition;    // undefined = no special ability (e.g. classic "red")
  baseDamage: number;
}

interface PigDefinition {
  id: string;
  health: number;
  radius: number;
  spriteAtlasKey: string;
  deathFxKey: string;
  scoreValue: number;
}

interface MaterialDefinition {
  id: string;                     // "wood", "stone", "glass", future: "ice", "metal"
  density: number;
  friction: number;
  restitution: number;
  durability: number;             // damage points before break
  breakFxKey: string;
  spriteAtlasKey: string;
}

interface AbilityDefinition {
  id: string;                     // "split-shot", "speed-boost", "drop-bomb"
  trigger: "tap" | "hold" | "auto-on-impact";
  cooldownMs?: number;
  // Handler implementation is resolved at runtime via AbilityRegistry.get(id);
  // the definition itself stays data-only so content (levels/birds) never
  // imports engine code.
}
```

### 4.3 Runtime entity/component shapes

```ts
type EntityId = number;

interface Transform { x: number; y: number; angle: number; }

interface PhysicsBodyRef { bodyId: number; } // Matter.Body.id, looked up in PhysicsWorld registry

interface RenderSprite { atlasKey: string; frame?: string; zIndex: number; }

interface Health { current: number; max: number; }

interface MaterialTag { materialId: string; }

interface BirdTag { birdTypeId: string; used: boolean; }

interface PigTag { pigTypeId: string; }

interface AbilityState { abilityId: string; activated: boolean; cooldownRemainingMs: number; }

interface Lifecycle { spawnedAtMs: number; ttlMs?: number; pendingRemoval: boolean; }
```

### 4.4 Progress / save data

```ts
interface LevelProgress {
  levelId: string;
  unlocked: boolean;
  bestScore: number;
  stars: 0 | 1 | 2 | 3;
  completed: boolean;
}

interface SaveData {
  schemaVersion: number;
  levels: Record<string, LevelProgress>;
  settings: { musicVolume: number; sfxVolume: number; };
}
```

Data model separation is deliberate: `LevelDefinition` (per-level, authored content), `*Definition` registries (engine-level catalog, shared across all levels), and runtime components (transient, per-play-session) never overlap in shape. Adding a 51st level touches only `data/levels/`. Adding a new material or bird ability touches only the relevant registry + `AbilityRegistry`, never `LevelSchema`.

---

## 5. Game State Architecture

### 5.1 Two state layers, kept separate

1. **Engine/game state** — lives in `GameStateMachine` + `EntityManager` + `PhysicsWorld`. Mutated at 60Hz-ish. Never stored in React state.
2. **UI state** — lives in React (via context/zustand/jotai — a small store, `uiStore`). Mutated only in response to coarse `EventBus` events (level loaded, score changed, birds-remaining changed, level won/lost, paused). Updated at low frequency (on change, not per frame).

The bridge (`useGameBridge`) subscribes to the bus once per mount and does *batched/throttled* `setState` calls — never per-physics-tick updates.

### 5.2 Game state machine

```
        ┌──────┐
        │ Boot │  (asset preload, registries loaded)
        └──┬───┘
           ▼
     ┌───────────┐
     │  MainMenu  │◄─────────────────────────┐
     └─────┬─────┘                           │
           ▼                                  │
   ┌────────────────┐                         │
   │  LevelSelect    │                        │
   └────────┬────────┘                        │
            ▼                                  │
     ┌─────────────┐                           │
     │  Loading     │ (LevelLoader + Builder)  │
     └──────┬───────┘                          │
            ▼                                  │
      ┌───────────┐   pause    ┌────────┐      │
      │  Playing   │──────────►│ Paused │      │
      │            │◄──────────┘        │      │
      └─────┬──────┘   resume  └────────┘      │
     win │        │ lose                       │
         ▼        ▼                            │
 ┌───────────┐ ┌────────────┐                  │
 │LevelComplete│ │LevelFailed │──── retry ──────┼──► Loading (same level)
 └──────┬─────┘ └─────┬──────┘                  │
        │  next level  │  quit                  │
        └───────►Loading   └────────────────────┘
```

Transitions are guarded (e.g. `Playing → Paused` only valid mid-gameplay; input is disabled outside `Playing`). Each transition emits an `EventBus` event so both the `Renderer` (e.g. dim/blur on pause) and React (show pause overlay) react independently without polling each other.

### 5.3 Within `Playing`: sub-states relevant to input

`SlingshotController` runs its own nested state machine (`Idle → Dragging → Released/InFlight → SettlingCheck`) so that, e.g., input is ignored while a bird is mid-flight until physics settles (or a "skip settle" timeout fires) and the next bird is ready.

### 5.4 Persistence boundary

`GameStateMachine` transitions to `LevelComplete`/`LevelFailed` trigger `ScoreCalculator` → `SaveManager.commit(levelId, result)`. Persistence is a side effect of state transition, not something scattered through gameplay code.

---

## 6. Physics Architecture

### 6.1 Matter.js as the single source of truth

- One `Matter.Engine` + `Matter.World` per active level (created fresh in `LevelBuilder`, torn down on level exit — no cross-level state leakage).
- `PhysicsWorld` wraps it: `step(fixedDt)`, `addBody`, `removeBody`, `queryPoint`, `raycast` (for e.g. line-of-sight abilities later).
- **Fixed timestep**: `GameEngine` accumulates real elapsed time and calls `PhysicsWorld.step(FIXED_DT)` zero-or-more times per frame (typically `FIXED_DT = 1000/60`), decoupling simulation determinism from display refresh rate (important for 120Hz phones/monitors and for consistent puzzle solutions across devices).
- Matter's own `Engine.run`/`Render` are **not** used — we drive `Engine.update(dt)` manually from `GameEngine`'s loop and use our own Canvas renderer, per the simulation/presentation split in §1.

### 6.2 Body ↔ entity mapping

`PhysicsBodyFactory` sets `body.label` and stashes the owning `EntityId` in `body.plugin.entityId` (Matter's supported per-body plugin data slot). `PhysicsWorld` also keeps a `Map<number, EntityId>` (`Matter.Body.id → EntityId`) for O(1) lookup during collision resolution, avoiding per-collision string parsing.

### 6.3 Collision categories & filtering

Bitmask categories defined once in `CollisionCategories.ts`: `BIRD`, `PIG`, `BLOCK`, `GROUND`, `SLINGSHOT_SENSOR`, `DEBRIS`, `AOE_SENSOR` (reserved for future abilities like a bomb bird's blast radius, implemented as a Matter sensor body). Category/mask combinations are declared per entity type in the registries, not scattered ad hoc through factory code, so tuning "should debris damage pigs?" is a one-line data change.

### 6.4 Material system driving physics properties

`MaterialDefinition.{density, friction, restitution, durability}` feed directly into `Matter.Bodies.*` options at creation time (`PhysicsBodyFactory` + `MaterialPhysics.ts`). Adding a new material (e.g. "ice": low friction, low durability, distinct break fx) requires zero engine code changes — only a new registry entry, matched by any level JSON that references it.

### 6.5 Damage & destruction pipeline

`CollisionResolver` listens to `Matter.Events.on(engine, 'collisionStart' | 'collisionActive', ...)`:
1. Resolve both bodies to entities via the id map.
2. Compute impact magnitude (relative velocity × combined mass, using Matter's collision pair data) as the damage source.
3. Apply damage to the `Health` component of any entity that has one (pig or breakable block) via a shared `applyDamage(entity, amount)` op — same code path for pigs and structures.
4. Entities whose `Health.current <= 0` are marked `Lifecycle.pendingRemoval` and an event fires (`pig:destroyed` / `block:broken`) rather than removing bodies mid-collision-callback (Matter disallows world mutation during its collision step). Actual removal happens in a dedicated end-of-step cleanup pass in `GameEngine`.
5. `WinLossEvaluator` reacts to `pig:destroyed` (and to the bird-queue being exhausted) to check win/loss conditions rather than polling every tick.

### 6.6 Performance-relevant physics settings

- Sleeping enabled (`engine.enableSleeping = true`) so settled debris stops costing CPU.
- Position/velocity iterations tuned (Matter defaults are usually fine; profiled and reduced only if needed rather than pre-emptively lowered, since under-iterating causes visible instability in stacked structures — a core Angry-Birds-feel requirement).
- A world bounds / "kill plane" well below `groundY` that force-removes any body that falls out of play (off-screen debris, escaped birds) to prevent unbounded body accumulation across a long play session.

---

## 7. Rendering Architecture

### 7.1 Independent render loop, reading physics state

`Renderer.render(alpha)` runs every animation frame (not every physics step). `alpha` is the accumulator's leftover fraction (0..1) from `GameEngine`, used to interpolate each entity's drawn `Transform` between its previous and current physics-step position/rotation (`Interpolation.ts`). This is what keeps visuals butter-smooth even though physics steps at a fixed, possibly lower, rate than the display.

### 7.2 Layered draw order

Each frame: `Renderer` clears the canvas, applies the `Camera`'s world→screen transform, then draws layers back-to-front:

1. `BackgroundLayer` — static/parallax sky, hills (parallax factor per layer, independent of world-space entities).
2. `WorldLayer` — all entities with `RenderSprite`, sorted by `zIndex` then y (for correct overlap), positions taken from `Interpolation`.
3. `EffectsLayer` — particles (debris chunks, feather puffs, dust), trajectory-prediction dots while aiming.
4. `DebugLayer` — Matter body wireframes/AABBs, only compiled/drawn in dev builds (`import.meta.env.DEV`).

React-rendered HUD sits in a DOM layer *above* the canvas (absolutely positioned), never drawn onto the canvas itself — keeps score/pause-button crisp text without canvas font/measure overhead, and keeps HUD updates fully outside the render loop's hot path.

### 7.3 Assets

- Sprite atlases (`SpriteAtlas.ts`) — one atlas + JSON metadata per category (birds, pigs, materials/blocks, fx, UI) loaded during `Boot`. Draw calls use `drawImage` with atlas sub-rects; no per-frame image decoding.
- Asset keys are referenced by id from the registries/level JSON (`spriteAtlasKey`), never hardcoded paths inside gameplay code.

### 7.4 Canvas sizing & DPR

`CoordinateMapper` (shared by input and rendering) handles `devicePixelRatio` scaling: canvas backing store sized at `cssSize * devicePixelRatio`, context scaled once, all game/world coordinates stay resolution-independent. Resize observer recomputes this on window/orientation change without restarting the physics world.

### 7.5 Camera integration

`Camera` exposes `worldToScreen`/`screenToWorld` used by both `Renderer` (draw transform) and `InputController`/`SlingshotController` (so a drag gesture maps correctly to world coordinates regardless of current zoom/pan) — this shared transform is what makes future camera tracking (follow the flying bird, pan to reveal structure) safe to add without touching input math.

---

## 8. Level System Design

### 8.1 Authoring format

Levels are plain JSON (`LevelDefinition`, §4.1), one file per level under `data/levels/`, statically imported or fetched. This is intentionally boring: any level can be authored by a designer or generated by a future in-house level editor without touching TypeScript.

### 8.2 Load pipeline

```
LevelRegistry.getManifestEntry(id)
        │
        ▼
LevelLoader.load(id)  ── fetch/import JSON ── validate against LevelSchema (zod or ajv)
        │  (fails fast with a clear error if a level is malformed — caught at
        │   build/CI time via a "validate all levels" script, not just at runtime)
        ▼
LevelBuilder.build(levelDefinition)
        │  for each block/pig/bird placement: resolve registry definition
        │  (MaterialDefinitions/PigDefinitions/BirdDefinitions) → Factory.create()
        │  → EntityManager.add() + PhysicsWorld.addBody()
        ▼
GameStateMachine.transition(Playing)
```

Schema validation is a hard gate: a CI script iterates every file in `data/levels/` and validates it against `LevelSchema` on every PR, so a typo'd level (e.g. a pig placed outside world bounds, or referencing a material id that doesn't exist in the registry) fails fast instead of shipping a broken level 37.

### 8.3 Scaling to 50+ levels

- **Registry-driven content reuse.** Bird/pig/material *definitions* are shared across all levels; a level file only references ids and placements, so it stays small and reviewable (~1–3 KB typically).
- **Level manifest, not directory scan.** `LevelRegistry` is an explicit ordered manifest (id, file ref, unlock condition, world/theme grouping) rather than inferring order from filenames — supports non-linear unlock graphs (world maps, branching) later without renaming files.
- **Chunked loading.** Only the active level's JSON (and its referenced sprite atlas subset) is loaded at play time; the manifest itself is lightweight and can be loaded eagerly at boot.
- **Versioned schema.** `schemaVersion` on every level + a small migration table lets old level files stay valid as the schema grows (e.g. when camera-tracking waypoints are added later), instead of a flag day rewrite of 50 files.
- **Theming via data, not per-level code.** `background`/`parallaxLayers` referenced by id so a "world" (e.g. levels 1–10 desert, 11–20 ice) is a data grouping, not a code branch.

### 8.4 Win/loss & scoring hookup

`WinLossEvaluator` is constructed per-level with that level's `scoring.starThresholds` and reacts to bus events (`pig:destroyed`, `bird:consumed`) rather than deep-scanning entity state every frame — O(1) counters updated incrementally, checked against zero/exhaustion conditions.

---

## 9. Input Handling Design

### 9.1 Unified pointer abstraction

`InputController` listens to Pointer Events (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`) as the single source — Pointer Events unify mouse, touch, and stylus in modern browsers, avoiding parallel mouse/touch handler paths and their edge cases (e.g. synthetic mouse events firing after touch). It normalizes everything to canvas-local coordinates via `CoordinateMapper` before anything downstream sees a position.

Non-negotiables handled here: `touch-action: none` on the canvas element to prevent scroll/zoom gestures from hijacking a slingshot drag; `preventDefault` on relevant events; pointer capture (`setPointerCapture`) so a drag that leaves canvas bounds (finger sliding off-canvas) still tracks correctly until release.

### 9.2 Slingshot gesture state machine

```
Idle
  │ pointerdown within grab-radius of active bird's rest position
  ▼
Dragging
  │ pointermove → clamp drag vector to max draw distance (data-driven per
  │ GameConfig / bird definition) → update trajectory-preview dots
  │ pointerup / pointercancel
  ▼
Released → SlingshotController hands off a launch vector+power to Physics
  (apply velocity to the bird's Matter.Body; category-appropriate impulse,
  not a raw teleport) → transitions bird entity from "loaded" to "in-flight"
  ▼
InFlight (input for slingshot ignored; ability-activation input still live)
  │ settle detection (velocity below threshold for N ticks, or leaves bounds)
  ▼
Idle (next bird loaded, if any remain)
```

Drag vector is computed in **world space** (via `Camera.screenToWorld`), not screen pixels, so aiming stays correct regardless of canvas CSS size, DPR, or camera zoom — this is also what keeps input correct once camera tracking/zoom is added later without touching this state machine.

### 9.3 Ability activation input

While `InFlight`, a secondary tap/hold anywhere on screen (not just on the bird) is captured by `InputController` and, if the active bird's `AbilityComponent` declares a matching `trigger` (`tap`/`hold`), forwarded to `AbilityRegistry.get(abilityId).activate(entity)`. This input path is independent of the slingshot state machine so future abilities (split shot, speed boost, drop bomb) never require touching `SlingshotController`.

### 9.4 Desktop vs. mobile parity

Same `InputController`/`SlingshotController` code path for both — no separate "mobile controls" branch. Differences are purely presentational (e.g. a larger visual grab-hitbox on touch, configurable via `GameConfig`, not a second input system).

### 9.5 Input disabling by game state

`InputController` checks `GameStateMachine.current === Playing` (and the nested slingshot sub-state) before dispatching anything — pausing, level-complete overlays, etc. cleanly freeze input without each screen needing its own event-blocking logic.

---

## 10. Performance Considerations

### 10.1 Loop structure

- **Fixed-timestep physics + accumulator**, decoupled render with interpolation (§6.1, §7.1) — the single biggest lever for both correctness (stable stacked-structure behavior) and perceived smoothness independent of device refresh rate.
- Spiral-of-death guard: cap the number of physics steps processed per frame (e.g. max 5) so a slow frame doesn't cause a cascade of catch-up steps that makes the next frame slower still; drop excess accumulated time instead.

### 10.2 Physics cost control

- Enable Matter body sleeping; settled debris/structure pieces stop consuming solver time.
- Kill-plane cleanup (§6.6) bounds total live body count during a long play session (important once explosive/split abilities can spawn extra bodies).
- Collision filtering (bitmasks, §6.3) trims broad-phase pair checks (e.g. debris doesn't need to test against off-screen sensors).
- Object pooling for short-lived bodies (debris chunks, particle-tied physics props) — reuse `Matter.Body` instances rather than allocate/GC churn every collision.

### 10.3 Rendering cost control

- Single canvas, single clear+draw pass per frame; layers are draw-order concerns, not separate `<canvas>` elements (avoids compositing N canvases every frame) — the possible exception is a static/rarely-changing background pre-rendered to an `OffscreenCanvas`/bitmap and blitted, rather than redrawing parallax primitives every frame.
- Sprite atlases over individual images (fewer texture binds/draw-call setup overhead, fewer HTTP requests at load).
- Frustum/viewport culling: `WorldLayer` skips `drawImage` calls for entities outside the camera's current view rect (matters more once camera tracking + zoom are added and structures can be much larger than the viewport).
- Avoid per-frame allocations in the hot path (no new arrays/objects inside the render loop or physics step loop) — pre-allocate scratch vectors/matrices for interpolation and camera transforms.

### 10.4 React/engine isolation

- The `GameEngine`'s RAF loop is never inside a React render; React only re-renders on throttled, coarse `EventBus` events (score/birds-remaining/state changes), each guarded so identical values don't trigger a state update (`Object.is` bail-out).
- HUD numbers that *do* change often (e.g. a live power/angle indicator while dragging) are updated via direct DOM/canvas writes from the engine side (a ref, not React state) to avoid reconciliation cost during the most input-sensitive moment of gameplay.

### 10.5 Asset & memory management

- Preload all sprite atlases and audio for a level (or the whole game, given expected small total asset budget) during `Boot`/`Loading` states with a visible progress screen — no first-play stutter from lazy image decode.
- Tear down the previous level's `Matter.Engine`, entities, and any pooled objects fully on level transition (`LevelBuilder` owns a symmetric `dispose()`) to prevent cross-level memory growth over a 50+ level session in one tab.

### 10.6 Measuring, not guessing

- A dev-only on-screen stats overlay (frame time, physics step time, body count, draw-call count) toggled via `GameConfig`/`import.meta.env.DEV`, so performance regressions are caught while adding the "future" features (abilities, materials, camera tracking) rather than discovered after 50 levels are authored on top of a slow engine.
- Performance budgets set explicitly up front (e.g. physics step ≤ 4ms, render ≤ 4ms, leaving headroom in a 16.6ms frame for browser/GC overhead) and checked against the stats overlay during development of any system that touches the hot path.

---

## Why this scales to 50+ levels and the listed future features

- **New bird/pig/material** → one registry entry + assets. No engine code changes, no risk to existing levels.
- **New special ability** → one `AbilityDefinition` + one handler registered in `AbilityRegistry`, referenced by id from any bird definition. The input and physics plumbing to invoke it already exists (§9.3).
- **Camera tracking** → `Camera`/`CameraController` already own the world↔screen transform used by both rendering and input; adding follow-behaviors is additive, not a refactor of either.
- **50+ levels** → each is an isolated, schema-validated JSON file referencing shared registries; CI validation catches authoring errors before they reach players; the manifest-based `LevelRegistry` supports non-linear progression without file reorganization.
