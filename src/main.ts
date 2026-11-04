import { Application, type TextureSource, type WebGLRenderer } from 'pixi.js';
import { createGameLoop, DEFAULT_FIXED_STEP } from './core/loop';
import { createPlayerTuning } from './data/player';
import { readBenchmarkFrames, runBenchmark } from './debug/benchmark';
import { createFarmScene } from './debug/farmScene';
import { createGridStressScene } from './debug/gridStressScene';
import { createPerfOverlay } from './debug/perfOverlay';
import type { Scene } from './debug/scene';
import { createTweaks, loadSavedTuning } from './debug/tweaks';
import type { Viewport } from './render/camera';
import { loadGlyphAtlas } from './render/fontAtlas';
import type { GlyphTable } from './render/glyphs';
import { GridRenderer } from './render/gridRenderer';

const params = new URLSearchParams(window.location.search);

/** Entero de la URL (solo desarrollo) o `fallback`. */
function readIntParam(name: string, fallback: number, max: number): number {
  const raw = params.get(name);
  if (!import.meta.env.DEV || raw === null || raw === '') return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= max ? value : fallback;
}

/** `?cells=400x240` para la escena de estrés. */
function readGridSize(): { cols: number; rows: number } {
  const match = /^(\d+)x(\d+)$/.exec(params.get('cells') ?? '');
  const cols = Number(match?.[1]);
  const rows = Number(match?.[2]);
  return match && cols >= 1 && rows >= 1 && cols <= 1300 && rows <= 1300
    ? { cols, rows }
    : { cols: 200, rows: 120 };
}

/** La escena de estrés de la rejilla, adaptada a la interfaz `Scene`. */
function createStressScene(
  glyphs: GlyphTable,
  atlas: TextureSource,
  canvas: HTMLCanvasElement,
  getView: () => Viewport,
): Scene {
  const { cols, rows } = readGridSize();
  const grid = new GridRenderer({
    cols,
    rows,
    glyphs,
    atlas,
    layers: [{ name: 'ground' }, { name: 'objects' }, { name: 'fx', alpha: 0.85 }],
  });
  const stress = createGridStressScene(grid, canvas, getView);
  return {
    stage: grid.container,
    camera: stress.camera,
    update: (dt) => stress.update(dt),
    render: (alpha, t) => stress.render(alpha, t),
    sync: (view) => {
      grid.sync(stress.camera, view);
    },
    describe: () => {
      const s = grid.stats;
      return (
        `rejilla    ${cols}×${rows} · ${s.drawCalls} draw calls\n` +
        `subida     ${((s.uploadedTexels * 4) / 1024).toFixed(0)} KB/frame · ${s.uploadCalls} llamadas\n` +
        stress.describe()
      );
    },
    destroy: () => {
      stress.destroy();
      grid.destroy();
    },
  };
}

async function main(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('Falta el elemento #app');

  const app = new Application();
  await app.init({
    preference: 'webgl', // solo WebGL2 por ahora (ver CLAUDE.md)
    resizeTo: host,
    background: '#0e1210',
    antialias: false, // la rejilla y los glifos calculan sus bordes en el shader
    autoDensity: true,
    resolution: window.devicePixelRatio,
    autoStart: false, // el render lo dispara nuestro bucle, no el ticker de PixiJS
    sharedTicker: false,
  });
  const renderer = app.renderer as WebGLRenderer;
  if (renderer.context.webGLVersion !== 2) {
    throw new Error('Mossback necesita WebGL2');
  }
  host.appendChild(app.canvas);

  const { glyphs, atlas } = await loadGlyphAtlas();
  const view: Viewport = {
    get width() {
      return app.screen.width;
    },
    get height() {
      return app.screen.height;
    },
    get resolution() {
      return app.renderer.resolution;
    },
  };
  const getView = (): Viewport => view;

  const benchFrames = readBenchmarkFrames();
  const sceneName = import.meta.env.DEV ? (params.get('scene') ?? 'farm') : 'farm';
  const tuning = createPlayerTuning();
  if (import.meta.env.DEV) loadSavedTuning(tuning);

  let scene: Scene;
  let help: string[];
  if (sceneName === 'stress') {
    scene = createStressScene(glyphs, atlas, app.canvas, getView);
    help = ['rueda: zoom · WASD: mover', '1 2 3: capas · 0: recentrar'];
  } else {
    const entities = readIntParam('entities', benchFrames !== null ? 2000 : 0, 20000);
    scene = createFarmScene({ glyphs, atlas, canvas: app.canvas, tuning, entities });
    help = ['WASD / flechas / mando: mover', 'rueda: zoom · F2: ajustes'];
  }
  app.stage.addChild(scene.stage);

  const overlay = import.meta.env.DEV
    ? createPerfOverlay(document.body, {
        backend: `${app.renderer.name}2`,
        stepHz: DEFAULT_FIXED_STEP.stepHz,
        live: () => scene.describe(),
        notes: ['', ...help],
      })
    : null;
  if (import.meta.env.DEV && sceneName !== 'stress' && benchFrames === null) {
    void createTweaks(tuning);
  }

  if (benchFrames !== null) {
    // Cada frame del benchmark simula un paso y dibuja. Se mide aparte la simulación y la
    // preparación en CPU (escribir instancias/celdas); el resto es subida + render.
    let simMs = 0;
    let cpuMs = 0;
    const step = DEFAULT_FIXED_STEP.stepHz > 0 ? 1 / DEFAULT_FIXED_STEP.stepHz : 0;
    const r = runBenchmark(
      benchFrames,
      (t) => {
        const t0 = performance.now();
        scene.update(step);
        const t1 = performance.now();
        scene.render(1, t);
        const t2 = performance.now();
        simMs += t1 - t0;
        cpuMs += t2 - t1;
        scene.sync(view);
        app.render();
      },
      renderer.gl,
    );
    const n = benchFrames + 10;
    const sim = simMs / n;
    const cpu = cpuMs / n;
    const text =
      `benchmark ${sceneName}, ${r.frames} frames: ${r.msPerFrame.toFixed(2)} ms/frame ` +
      `(peor ${r.worstMs.toFixed(2)} ms) → hasta ${r.maxFps.toFixed(0)} fps sin vsync · ` +
      `simulación ${sim.toFixed(2)} ms, preparar frame ${cpu.toFixed(2)} ms, ` +
      `subida + render ${(r.msPerFrame - sim - cpu).toFixed(2)} ms\n${scene.describe()}`;
    console.info(text);
    document.body.dataset['bench'] = text;
  }

  if (import.meta.env.DEV) {
    // Para pruebas desde la consola: `__mossback.step(120)` simula 2 s de golpe y dibuja.
    Object.assign(window, {
      __mossback: {
        scene,
        tuning,
        step(steps: number): void {
          const dt = 1 / DEFAULT_FIXED_STEP.stepHz;
          for (let i = 0; i < steps; i++) scene.update(dt);
          scene.render(1, performance.now() / 1000);
          scene.sync(view);
          app.render();
        },
      },
    });
  }

  const loop = createGameLoop({
    update(dt) {
      scene.update(dt);
    },
    render(alpha) {
      scene.render(alpha, performance.now() / 1000);
      scene.sync(view);
      app.render();
    },
    onFrame(stats) {
      overlay?.frame(stats);
    },
  });
  loop.start();
}

main().catch((error: unknown) => {
  console.error(error);
});
