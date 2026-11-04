import { describe, expect, it } from 'vitest';
import { FixedStepClock } from './loop';

const options = { stepHz: 60, maxFrameMs: 250, maxStepsPerFrame: 8 };

/** Simula `seconds` de tiempo real con frames de `frameMs` y devuelve los pasos totales. */
function simulate(clock: FixedStepClock, frameMs: number, seconds: number): number {
  let steps = 0;
  const frames = Math.round((seconds * 1000) / frameMs);
  for (let i = 0; i < frames; i++) steps += clock.advance(frameMs);
  return steps;
}

describe('FixedStepClock', () => {
  it('da 60 pasos por segundo sea cual sea la tasa de frames', () => {
    for (const fps of [30, 60, 75, 120, 144, 165, 240]) {
      const clock = new FixedStepClock(options);
      expect(simulate(clock, 1000 / fps, 10), `${fps} fps`).toBe(600);
    }
  });

  it('acumula frames cortos hasta completar un paso', () => {
    const clock = new FixedStepClock(options);
    expect(clock.advance(5)).toBe(0);
    expect(clock.advance(5)).toBe(0);
    expect(clock.advance(5)).toBe(0);
    expect(clock.advance(5)).toBe(1);
  });

  it('expone alpha como la fracción de paso pendiente', () => {
    const clock = new FixedStepClock(options);
    clock.advance(clock.stepMs * 2.25);
    expect(clock.alpha).toBeCloseTo(0.25, 6);
    clock.advance(clock.stepMs * 0.5);
    expect(clock.alpha).toBeCloseTo(0.75, 6);
  });

  it('mantiene alpha en [0, 1) con frames irregulares', () => {
    const clock = new FixedStepClock(options);
    let total = 0;
    let steps = 0;
    for (let i = 0; i < 5000; i++) {
      const frameMs = 4 + ((i * 7919) % 23); // irregular pero reproducible
      total += frameMs;
      steps += clock.advance(frameMs);
      expect(clock.alpha).toBeGreaterThanOrEqual(0);
      expect(clock.alpha).toBeLessThan(1);
    }
    expect(steps).toBe(Math.floor(total / clock.stepMs));
  });

  it('limita un frame muy largo (pestaña congelada, depurador)', () => {
    const clock = new FixedStepClock({ ...options, maxStepsPerFrame: 100 });
    // 5 s de parón cuentan solo como 250 ms → 15 pasos.
    expect(clock.advance(5000)).toBe(15);
  });

  it('no supera el máximo de pasos por frame y descarta el tiempo sobrante', () => {
    const clock = new FixedStepClock({ ...options, maxStepsPerFrame: 4 });
    expect(clock.advance(200)).toBe(4);
    expect(clock.alpha).toBe(0);
    expect(clock.advance(0)).toBe(0);
  });

  it('ignora tiempos negativos', () => {
    const clock = new FixedStepClock(options);
    expect(clock.advance(-100)).toBe(0);
    expect(clock.alpha).toBe(0);
  });

  it('reset() olvida el tiempo acumulado', () => {
    const clock = new FixedStepClock(options);
    clock.advance(clock.stepMs * 0.9);
    clock.reset();
    expect(clock.alpha).toBe(0);
    expect(clock.advance(clock.stepMs * 0.5)).toBe(0);
  });

  it('rechaza configuraciones inválidas', () => {
    expect(() => new FixedStepClock({ ...options, stepHz: 0 })).toThrow();
    expect(() => new FixedStepClock({ ...options, maxStepsPerFrame: 0 })).toThrow();
  });
});
