import { describe, expect, it } from 'vitest';
import { createRng, Rng } from './rng';

function take(rng: Rng, n: number): number[] {
  return Array.from({ length: n }, () => rng.nextUint32());
}

describe('Rng', () => {
  it('misma semilla → misma secuencia', () => {
    expect(take(createRng('mossback'), 100)).toEqual(take(createRng('mossback'), 100));
  });

  it('semillas distintas → secuencias distintas', () => {
    expect(take(createRng('mossback'), 10)).not.toEqual(take(createRng('mossback2'), 10));
  });

  it('la secuencia no cambia entre versiones (si esto falla, se rompen partidas guardadas)', () => {
    expect(take(createRng('mossback'), 5)).toMatchInlineSnapshot(`
      [
        3542007055,
        3574964909,
        1970856424,
        3429446302,
        2270961705,
      ]
    `);
  });

  it('next() está en [0, 1) y tiene media razonable', () => {
    const rng = createRng('media');
    let sum = 0;
    const n = 100_000;
    for (let i = 0; i < n; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / n).toBeCloseTo(0.5, 2);
  });

  it('int() respeta el rango incluyendo ambos extremos', () => {
    const rng = createRng('int');
    const seen = new Set<number>();
    for (let i = 0; i < 10_000; i++) {
      const v = rng.int(-2, 3);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThanOrEqual(3);
      seen.add(v);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2, 3]);
    expect(() => rng.int(5, 1)).toThrow();
    expect(() => rng.int(0.5, 2)).toThrow();
  });

  it('range(), chance() y pick() se comportan', () => {
    const rng = createRng('varios');
    for (let i = 0; i < 1000; i++) {
      const v = rng.range(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 100; i++) expect(items).toContain(rng.pick(items));
    expect(() => rng.pick([])).toThrow();
  });

  it('fork() es independiente del padre y del orden de creación', () => {
    const a = createRng('mundo');
    const weatherFirst = a.fork('weather');
    const b = createRng('mundo');
    take(b, 50); // consumir el padre no afecta al fork
    b.fork('crops');
    const weatherLater = b.fork('weather');
    expect(take(weatherFirst, 20)).toEqual(take(weatherLater, 20));
    expect(take(a.fork('weather'), 20)).not.toEqual(take(a.fork('crops'), 20));
  });

  it('guardar y restaurar el estado continúa la misma secuencia', () => {
    const rng = createRng('guardado');
    take(rng, 37);
    const state = JSON.parse(JSON.stringify(rng.getState())) as ReturnType<Rng['getState']>;
    const expected = take(rng, 20);
    expect(take(Rng.fromState(state), 20)).toEqual(expected);
  });

  it('rechaza un estado de otra semilla', () => {
    const state = createRng('una').getState();
    expect(() => createRng('otra').setState(state)).toThrow();
  });
});
