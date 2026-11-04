/**
 * Bucle de juego a paso fijo.
 *
 * La simulación avanza en pasos de duración fija (60 Hz por defecto), sin depender de los fps
 * del monitor. El render se ejecuta una vez por frame y recibe `alpha` (0–1): la fracción de
 * paso que ha pasado desde el último paso de simulación. Con ella el render interpola entre el
 * estado anterior y el actual para que el movimiento se vea suave.
 *
 * `FixedStepClock` es lógica pura (testeable con tiempo falso); `createGameLoop` es la capa
 * fina que la conecta con `requestAnimationFrame`.
 */

export interface FixedStepOptions {
  /** Pasos de simulación por segundo. */
  readonly stepHz: number;
  /** Tiempo real máximo que cuenta un solo frame (ms). Evita un salto enorme tras un parón. */
  readonly maxFrameMs: number;
  /** Pasos máximos por frame. Evita la «espiral de la muerte» si la simulación va lenta. */
  readonly maxStepsPerFrame: number;
}

export const DEFAULT_FIXED_STEP: FixedStepOptions = {
  stepHz: 60,
  maxFrameMs: 250,
  maxStepsPerFrame: 8,
};

/** Margen para que errores de coma flotante no nos hagan perder un paso. */
const EPSILON_MS = 1e-6;

export class FixedStepClock {
  readonly stepMs: number;
  readonly stepSeconds: number;
  private readonly maxFrameMs: number;
  private readonly maxStepsPerFrame: number;
  private accumulatorMs = 0;

  constructor(options: FixedStepOptions = DEFAULT_FIXED_STEP) {
    if (!(options.stepHz > 0)) throw new Error(`stepHz inválido: ${options.stepHz}`);
    if (!(options.maxStepsPerFrame >= 1)) {
      throw new Error(`maxStepsPerFrame inválido: ${options.maxStepsPerFrame}`);
    }
    this.stepMs = 1000 / options.stepHz;
    this.stepSeconds = 1 / options.stepHz;
    this.maxFrameMs = options.maxFrameMs;
    this.maxStepsPerFrame = options.maxStepsPerFrame;
  }

  /** Suma `frameMs` de tiempo real y devuelve cuántos pasos de simulación tocan ahora. */
  advance(frameMs: number): number {
    const clamped = Math.min(Math.max(frameMs, 0), this.maxFrameMs);
    this.accumulatorMs += clamped;

    let steps = Math.floor((this.accumulatorMs + EPSILON_MS) / this.stepMs);
    if (steps > this.maxStepsPerFrame) {
      // Vamos tan atrasados que no merece la pena recuperar: se descarta el tiempo sobrante.
      steps = this.maxStepsPerFrame;
      this.accumulatorMs = 0;
    } else {
      this.accumulatorMs = Math.max(this.accumulatorMs - steps * this.stepMs, 0);
    }
    return steps;
  }

  /** Fracción de paso pendiente (0 ≤ alpha < 1), para interpolar el render. */
  get alpha(): number {
    return Math.min(this.accumulatorMs / this.stepMs, 1);
  }

  /** Olvida el tiempo acumulado (p. ej. al volver de una pestaña oculta). */
  reset(): void {
    this.accumulatorMs = 0;
  }
}

/** Datos de un frame. El objeto se reutiliza entre frames: no guardes referencias. */
export interface FrameStats {
  /** Tiempo real desde el frame anterior (ms), antes de limitarlo. */
  frameMs: number;
  /** Pasos de simulación ejecutados en este frame. */
  steps: number;
  /** Alpha de interpolación usado en el render. */
  alpha: number;
  /** Marca de tiempo del frame (ms, `performance.now`). */
  now: number;
}

export interface GameLoopHooks {
  /** Un paso de simulación. `dt` es siempre el mismo (segundos). */
  update(dt: number): void;
  /** Dibuja interpolando entre el estado anterior y el actual. */
  render(alpha: number): void;
  /** Se llama al final de cada frame (overlay de rendimiento, etc.). */
  onFrame?(stats: Readonly<FrameStats>): void;
}

export interface GameLoop {
  start(): void;
  stop(): void;
  readonly clock: FixedStepClock;
}

export function createGameLoop(
  hooks: GameLoopHooks,
  options: FixedStepOptions = DEFAULT_FIXED_STEP,
): GameLoop {
  const clock = new FixedStepClock(options);
  const stats: FrameStats = { frameMs: 0, steps: 0, alpha: 0, now: 0 };
  let running = false;
  let rafId = 0;
  let lastTime = -1;

  const frame = (now: number): void => {
    rafId = requestAnimationFrame(frame);
    const frameMs = lastTime < 0 ? 0 : now - lastTime;
    lastTime = now;

    const steps = clock.advance(frameMs);
    for (let i = 0; i < steps; i++) hooks.update(clock.stepSeconds);

    const alpha = clock.alpha;
    hooks.render(alpha);

    stats.frameMs = frameMs;
    stats.steps = steps;
    stats.alpha = alpha;
    stats.now = now;
    hooks.onFrame?.(stats);
  };

  const schedule = (): void => {
    lastTime = -1;
    clock.reset();
    rafId = requestAnimationFrame(frame);
  };

  const cancel = (): void => {
    if (rafId !== 0) cancelAnimationFrame(rafId);
    rafId = 0;
  };

  // Con la pestaña oculta se pausa todo; al volver no se intenta recuperar el tiempo perdido.
  const onVisibilityChange = (): void => {
    if (!running) return;
    if (document.hidden) cancel();
    else if (rafId === 0) schedule();
  };

  return {
    clock,
    start(): void {
      if (running) return;
      running = true;
      document.addEventListener('visibilitychange', onVisibilityChange);
      if (!document.hidden) schedule();
    },
    stop(): void {
      if (!running) return;
      running = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancel();
    },
  };
}
