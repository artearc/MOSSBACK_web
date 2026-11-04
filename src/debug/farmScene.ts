/**
 * Escena de prueba del hito 1: huerto con personaje jugable.
 *
 * Orden de capas (de abajo arriba), pensado para la vista 3/4:
 *   ground (rejilla) → objects (rejilla: troncos, vallas, muros) → shadows (entidades)
 *   → actors (entidades, ordenadas por Y) → overhead (rejilla: copas, tejados) → sky (entidades)
 * El personaje se dibuja encima de las bases y debajo de copas y tejados.
 *
 * Con `entities` > 0 añade entidades que deambulan (para el benchmark).
 */

import { World } from 'miniplex';
import { Container, type TextureSource } from 'pixi.js';
import { Input, type MoveInput } from '../core/input';
import { createRng } from '../core/rng';
import { TEST_FARM } from '../data/maps/testFarm';
import type { PlayerTuning } from '../data/player';
import { Camera, type Viewport } from '../render/camera';
import { EntityLayer } from '../render/entityLayer';
import type { GlyphTable } from '../render/glyphs';
import { GridRenderer } from '../render/gridRenderer';
import { drawSprites, type SpriteTargets } from '../render/spriteSystem';
import {
  createCameraFollow,
  snapCameraFollow,
  updateCameraFollow,
  type CameraFollowState,
} from '../sim/cameraFollow';
import type { MoveResult } from '../sim/collision';
import type { Entity } from '../sim/components';
import {
  createQueries,
  movementSystem,
  playerIntentSystem,
  walkSystem,
  wanderSystem,
} from '../sim/systems';
import { paintMap, parseMap } from '../world/tileMap';
import type { Scene } from './scene';

const WHEEL_ZOOM_STEP = 1.15;
const DEFAULT_ZOOM = 2.25;

export interface FarmSceneOptions {
  readonly glyphs: GlyphTable;
  readonly atlas: TextureSource;
  readonly canvas: HTMLCanvasElement;
  readonly tuning: PlayerTuning;
  /** Entidades que deambulan (benchmark). */
  readonly entities?: number;
}

export interface FarmScene extends Scene {
  readonly player: Entity;
}

export function createFarmScene(options: FarmSceneOptions): FarmScene {
  const { glyphs, atlas, canvas, tuning } = options;
  const map = parseMap(TEST_FARM);

  // --- Capas ---
  const grid = new GridRenderer({
    cols: map.cols,
    rows: map.rows,
    glyphs,
    atlas,
    layers: [{ name: 'ground' }, { name: 'objects' }, { name: 'overhead' }],
  });
  paintMap(
    map,
    {
      ground: grid.layer('ground'),
      objects: grid.layer('objects'),
      overhead: grid.layer('overhead'),
    },
    glyphs,
  );
  const entityLayer = (name: string): EntityLayer =>
    new EntityLayer({ name, glyphs, glyphSource: grid.glyphSource, atlas });
  const shadows = new EntityLayer({
    name: 'shadows',
    glyphs,
    glyphSource: grid.glyphSource,
    atlas,
    shape: 'softEllipse',
    softness: tuning.shadow.softness,
  });
  const actors = entityLayer('actors');
  const sky = entityLayer('sky');
  const entityLayers = [shadows, actors, sky];

  const stage = new Container({ label: 'farm' });
  stage.addChild(
    grid.mesh('ground'),
    grid.mesh('objects'),
    shadows.mesh,
    actors.mesh,
    grid.mesh('overhead'),
    sky.mesh,
  );
  const targets: SpriteTargets = { actors: actors.batch, sky: sky.batch, shadows: shadows.batch };

  // --- ECS ---
  const world = new World<Entity>();
  const queries = createQueries(world);

  const spawnX = map.spawn.x + 0.5;
  const spawnY = map.spawn.y + 0.5;
  const player = world.add({
    player: true,
    position: { x: spawnX, y: spawnY },
    prevPosition: { x: spawnX, y: spawnY },
    velocity: { x: 0, y: 0 },
    intent: { x: 0, y: 0 },
    // Se comparten los objetos de ajuste: lo que se cambie en Tweakpane se nota al momento.
    movement: tuning.movement,
    collider: tuning.collider,
    sprite: {
      glyph: glyphs.id('@'),
      color: 0xf4ecd0,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      lift: tuning.spriteLift,
      layer: 'actors',
    },
    shadow: { alpha: tuning.shadow.alpha, scaleX: 1, scaleY: 1 },
    walk: { phase: 0, prevPhase: 0, amount: 0, prevAmount: 0 },
  });

  const rng = createRng('farm-scene');
  spawnWanderers(world, options.entities ?? 0, map, glyphs, rng);

  // --- Entrada y cámara ---
  const input = new Input();
  const move: MoveInput = { x: 0, y: 0 };
  const collisionScratch: MoveResult = { blockedX: false, blockedY: false };
  const camera = new Camera({ baseCellPx: 16, minZoom: 0.5, maxZoom: 6 });
  camera.zoom = DEFAULT_ZOOM;
  const follow: CameraFollowState = createCameraFollow(spawnX, spawnY);
  snapCameraFollow(follow, spawnX, spawnY);

  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    camera.zoom *= e.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
  };
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    stage,
    camera,
    player,

    update(dt: number): void {
      input.deadzone = tuning.deadzone;
      playerIntentSystem(queries, input.readMove(move));
      wanderSystem(queries, rng, dt);
      movementSystem(queries, map, tuning.cornerTolerance, dt, collisionScratch);
      walkSystem(queries, tuning.bob, dt);

      const p = player.position;
      const v = player.velocity;
      if (p && v) {
        updateCameraFollow(follow, p.x, p.y, v.x, v.y, tuning.movement.maxSpeed, tuning.camera, dt);
      }
    },

    render(alpha: number): void {
      // Ajustes que pueden cambiar en vivo.
      const s = player.sprite;
      const sh = player.shadow;
      if (s && sh) {
        s.lift = tuning.spriteLift;
        sh.alpha = tuning.shadow.alpha;
        sh.scaleX = tuning.shadow.scaleX;
        sh.scaleY = tuning.shadow.scaleY;
      }
      shadows.softness = tuning.shadow.softness;

      for (const layer of entityLayers) layer.batch.begin();
      drawSprites(queries, alpha, tuning.bob, targets);
      for (const layer of entityLayers) layer.batch.end();

      camera.x = follow.prevX + (follow.x - follow.prevX) * alpha;
      camera.y = follow.prevY + (follow.y - follow.prevY) * alpha;
    },

    sync(view: Viewport): void {
      // Que la cámara no enseñe lo que hay fuera del mapa (si el mapa cabe, se centra).
      const cell = camera.cellPx(view.resolution);
      const clampAxis = (value: number, viewPx: number, size: number): number => {
        const half = viewPx / 2 / cell;
        return size <= half * 2 ? size / 2 : Math.min(Math.max(value, half), size - half);
      };
      camera.x = clampAxis(camera.x, view.width, map.cols);
      camera.y = clampAxis(camera.y, view.height, map.rows);

      grid.sync(camera, view);
      for (const layer of entityLayers) {
        layer.snapToPixel = tuning.snapToPixel;
        layer.sync(camera, view);
      }
    },

    describe(): string {
      const p = player.position;
      const v = player.velocity;
      const speed = v ? Math.hypot(v.x, v.y) : 0;
      const bytes = entityLayers.reduce((sum, l) => sum + l.uploadedBytes, 0);
      return (
        `entidades  ${queries.sprites.entities.length} · ${(bytes / 1024).toFixed(1)} KB/frame\n` +
        `jugador    (${p?.x.toFixed(2)}, ${p?.y.toFixed(2)}) · ${speed.toFixed(2)} c/s · ${input.lastDevice}\n` +
        `zoom       ${camera.zoom.toFixed(2)}`
      );
    },

    destroy(): void {
      canvas.removeEventListener('wheel', onWheel);
      input.destroy();
      for (const layer of entityLayers) layer.destroy();
      grid.destroy();
      stage.destroy();
    },
  };
}

const WANDER_GLYPHS = 'ö♦♥☺☻*•°¤§&%ɷʬ';
const WANDER_COLORS = [0xe8c070, 0xd07a5a, 0x9ad0a0, 0xa0b8e8, 0xe0a0c0, 0xf0f0d8, 0xc8a0e8];

/** Entidades de prueba repartidas por celdas libres del mapa. */
function spawnWanderers(
  world: World<Entity>,
  count: number,
  map: ReturnType<typeof parseMap>,
  glyphs: GlyphTable,
  rng: ReturnType<typeof createRng>,
): void {
  if (count <= 0) return;
  const glyphIds = [...WANDER_GLYPHS].filter((c) => glyphs.has(c)).map((c) => glyphs.id(c));
  const tuning = {
    maxSpeed: 2.5,
    acceleration: 12,
    deceleration: 12,
    turnAcceleration: 20,
    verticalFactor: 1,
  };
  const collider = { halfWidth: 0.2, halfHeight: 0.15 };
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    do {
      x = rng.int(0, map.cols - 1);
      y = rng.int(0, map.rows - 1);
    } while (map.isSolid(x, y));
    const px = x + 0.5;
    const py = y + 0.5;
    const scale = rng.range(0.55, 1.1);
    world.add({
      position: { x: px, y: py },
      prevPosition: { x: px, y: py },
      velocity: { x: 0, y: 0 },
      intent: { x: 0, y: 0 },
      movement: tuning,
      collider,
      wander: { dirX: 0, dirY: 0, timer: rng.range(0, 2), spin: rng.range(-2, 2) },
      sprite: {
        glyph: rng.pick(glyphIds),
        color: rng.pick(WANDER_COLORS),
        alpha: rng.range(0.6, 1),
        scaleX: scale,
        scaleY: scale,
        rotation: rng.range(0, Math.PI * 2),
        lift: 0.25 * scale,
        layer: 'actors',
      },
      shadow: { alpha: 0.3, scaleX: 0.6 * scale, scaleY: 0.25 * scale },
    });
  }
}
