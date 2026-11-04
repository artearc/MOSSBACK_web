import { Application, type WebGLRenderer } from 'pixi.js';
import { createGameLoop, DEFAULT_FIXED_STEP } from './core/loop';
import { readBenchmarkFrames, runBenchmark } from './debug/benchmark';
import { createGridStressScene } from './debug/gridStressScene';
import { createPerfOverlay } from './debug/perfOverlay';
import type { Viewport } from './render/camera';
import { loadGlyphAtlas } from './render/fontAtlas';
import { GridRenderer } from './render/gridRenderer';

/** En desarrollo, `?cells=400x240` cambia el tamaño de la rejilla de prueba. */
function readGridSize(): { cols: number; rows: number } {
  const fallback = { cols: 200, rows: 120 };
  if (!import.meta.env.DEV) return fallback;
  const match = /^(\d+)x(\d+)$/.exec(
    new URLSearchParams(window.location.search).get('cells') ?? '',
  );
  if (!match) return fallback;
  const cols = Number(match[1]);
  const rows = Number(match[2]);
  return cols >= 1 && rows >= 1 && cols <= 1300 && rows <= 1300 ? { cols, rows } : fallback;
}

async function main(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('Falta el elemento #app');

  const app = new Application();
  await app.init({
    preference: 'webgl', // solo WebGL2 por ahora (ver CLAUDE.md)
    resizeTo: host,
    background: '#0e1210',
    antialias: false, // la rejilla no lo necesita: sus bordes se calculan en el shader
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
  const { cols, rows } = readGridSize();
  const grid = new GridRenderer({
    cols,
    rows,
    glyphs,
    atlas,
    layers: [{ name: 'ground' }, { name: 'objects' }, { name: 'fx', alpha: 0.85 }],
  });
  app.stage.addChild(grid.container);

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

  const scene = createGridStressScene(grid, app.canvas, () => view);
  const overlay = import.meta.env.DEV
    ? createPerfOverlay(document.body, {
        backend: `${app.renderer.name}2`,
        stepHz: DEFAULT_FIXED_STEP.stepHz,
        live: () => {
          const s = grid.stats;
          return (
            `rejilla    ${cols}×${rows} · ${s.drawCalls} draw calls\n` +
            `subida     ${((s.uploadedTexels * 4) / 1024).toFixed(0)} KB/frame · ${s.uploadCalls} llamadas\n` +
            scene.describe()
          );
        },
        notes: ['', 'rueda: zoom · WASD: mover', '1 2 3: capas · 0: recentrar'],
      })
    : null;

  const drawFrame = (alpha: number, timeSeconds: number): void => {
    scene.render(alpha, timeSeconds);
    grid.sync(scene.camera, view);
    app.render();
  };

  const benchFrames = readBenchmarkFrames();
  if (benchFrames !== null) {
    // Se mide aparte cuánto tarda la escena en escribir celdas (CPU, código de prueba).
    let sceneMs = 0;
    const r = runBenchmark(
      benchFrames,
      (t) => {
        const t0 = performance.now();
        scene.render(1, t);
        sceneMs += performance.now() - t0;
        grid.sync(scene.camera, view);
        app.render();
      },
      renderer.gl,
    );
    const scenePerFrame = sceneMs / (benchFrames + 10);
    const text =
      `benchmark ${cols}×${rows}, ${r.frames} frames: ${r.msPerFrame.toFixed(2)} ms/frame ` +
      `(peor ${r.worstMs.toFixed(2)} ms) → hasta ${r.maxFps.toFixed(0)} fps sin vsync · ` +
      `escena ${scenePerFrame.toFixed(2)} ms, subida + render ${(r.msPerFrame - scenePerFrame).toFixed(2)} ms`;
    console.info(text);
    document.body.dataset['bench'] = text;
  }

  const loop = createGameLoop({
    update(dt) {
      scene.update(dt);
    },
    render(alpha) {
      drawFrame(alpha, performance.now() / 1000);
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
