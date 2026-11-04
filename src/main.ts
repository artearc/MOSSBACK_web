import { Application } from 'pixi.js';
import { createGameLoop, DEFAULT_FIXED_STEP, type FixedStepOptions } from './core/loop';
import { createInterpolationProbe } from './debug/interpolationProbe';
import { createPerfOverlay } from './debug/perfOverlay';

/**
 * En desarrollo, `?hz=10` baja la frecuencia de simulación para ver la interpolación con
 * claridad. En producción la simulación va siempre a 60 Hz.
 */
function readStepHz(): number {
  if (!import.meta.env.DEV) return DEFAULT_FIXED_STEP.stepHz;
  const hz = Number(new URLSearchParams(window.location.search).get('hz'));
  return Number.isFinite(hz) && hz >= 1 && hz <= 240 ? hz : DEFAULT_FIXED_STEP.stepHz;
}

async function main(): Promise<void> {
  const host = document.getElementById('app');
  if (!host) throw new Error('Falta el elemento #app');

  const app = new Application();
  await app.init({
    preference: 'webgpu', // si no hay WebGPU, PixiJS usa WebGL
    resizeTo: host,
    background: '#0e1210',
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio,
    autoStart: false, // el render lo dispara nuestro bucle, no el ticker de PixiJS
    sharedTicker: false,
  });
  host.appendChild(app.canvas);

  const loopOptions: FixedStepOptions = { ...DEFAULT_FIXED_STEP, stepHz: readStepHz() };

  const probe = import.meta.env.DEV ? createInterpolationProbe(app.stage, app.screen) : null;
  const overlay = import.meta.env.DEV
    ? createPerfOverlay(document.body, {
        backend: app.renderer.name,
        stepHz: loopOptions.stepHz,
        notes: ['', 'verde: interpolado', 'naranja: sin interpolar', '?hz=10: simular a 10 Hz'],
      })
    : null;

  const loop = createGameLoop(
    {
      update(dt) {
        probe?.update(dt);
      },
      render(alpha) {
        probe?.render(alpha);
        app.render();
      },
      onFrame(stats) {
        overlay?.frame(stats);
      },
    },
    loopOptions,
  );
  loop.start();
}

main().catch((error: unknown) => {
  console.error(error);
});
