/**
 * Benchmark de render (solo desarrollo): `?bench` o `?bench=500`.
 *
 * Dibuja N frames seguidos sin esperar al vsync y fuerza a la GPU a terminar cada uno (leyendo
 * un píxel). Mide el coste real de CPU + GPU por frame, aunque la pestaña esté en segundo plano
 * o el monitor limite los fps.
 */

export interface BenchmarkResult {
  readonly frames: number;
  readonly msPerFrame: number;
  readonly worstMs: number;
  /** Fps máximos que permitiría ese coste (sin vsync). */
  readonly maxFps: number;
}

export function readBenchmarkFrames(): number | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get('bench');
  if (value === null) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 5000) : 300;
}

export function runBenchmark(
  frames: number,
  drawFrame: (timeSeconds: number) => void,
  gl: WebGL2RenderingContext,
): BenchmarkResult {
  const pixel = new Uint8Array(4);
  const sync = (): void => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  // Calentamiento: compilación de shaders, primera subida de texturas.
  for (let i = 0; i < 10; i++) {
    drawFrame(i / 60);
    sync();
  }

  let worstMs = 0;
  const start = performance.now();
  for (let i = 0; i < frames; i++) {
    const t0 = performance.now();
    drawFrame((10 + i) / 60);
    sync();
    worstMs = Math.max(worstMs, performance.now() - t0);
  }
  const msPerFrame = (performance.now() - start) / frames;
  return { frames, msPerFrame, worstMs, maxFps: 1000 / msPerFrame };
}
