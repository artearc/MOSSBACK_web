import { describe, expect, it } from 'vitest';
import { EntityBatch, INSTANCE_BYTES, INSTANCE_FLOATS } from './entityBatch';
import type { GlyphId } from './glyphs';

const G = (n: number): GlyphId => n as GlyphId;

function xs(batch: EntityBatch): number[] {
  return Array.from({ length: batch.count }, (_, i) => batch.data[i * INSTANCE_FLOATS] as number);
}

describe('EntityBatch', () => {
  it('empaqueta posición, escala, rotación, glifo y color RGBA', () => {
    const b = new EntityBatch(4);
    b.begin();
    b.push(1.5, 2.25, 0.5, 2, 0.75, G(42), 0x112233, 0.5, 0);
    expect(b.end()).toBe(INSTANCE_BYTES);
    expect([...b.data.subarray(0, 6)]).toEqual([1.5, 2.25, 0.5, 2, 0.75, 42]);
    const bytes = new Uint8Array(b.data.buffer, 6 * 4, 4);
    expect([...bytes]).toEqual([0x11, 0x22, 0x33, 128]);
  });

  it('ordena por la clave (Y) de forma estable', () => {
    const b = new EntityBatch(8);
    b.begin();
    b.push(0, 0, 1, 1, 0, G(1), 0, 1, 5);
    b.push(1, 0, 1, 1, 0, G(1), 0, 1, 2);
    b.push(2, 0, 1, 1, 0, G(1), 0, 1, 5);
    b.push(3, 0, 1, 1, 0, G(1), 0, 1, -1);
    b.end();
    expect(xs(b)).toEqual([3, 1, 0, 2]);
  });

  it('reordena cuando las claves cambian entre frames', () => {
    const b = new EntityBatch(4);
    const frame = (keys: number[]): number[] => {
      b.begin();
      keys.forEach((k, i) => b.push(i, 0, 1, 1, 0, G(1), 0, 1, k));
      b.end();
      return xs(b);
    };
    expect(frame([1, 2, 3])).toEqual([0, 1, 2]);
    expect(frame([3, 2, 1])).toEqual([2, 1, 0]);
    expect(frame([2, 3, 1])).toEqual([2, 0, 1]);
    expect(frame([5, 1])).toEqual([1, 0]); // cambia el número de instancias
  });

  it('crece si hace falta sin perder datos', () => {
    const b = new EntityBatch(2);
    b.begin();
    for (let i = 0; i < 100; i++) b.push(i, 0, 1, 1, 0, G(1), 0xffffff, 1, 100 - i);
    expect(b.end()).toBe(100 * INSTANCE_BYTES);
    expect(b.capacity).toBeGreaterThanOrEqual(100);
    expect(xs(b)[0]).toBe(99);
    expect(xs(b)[99]).toBe(0);
  });

  it('limita la opacidad a 0–1', () => {
    const b = new EntityBatch(2);
    b.begin();
    b.push(0, 0, 1, 1, 0, G(1), 0, 2, 0);
    b.push(0, 0, 1, 1, 0, G(1), 0, -1, 1);
    b.end();
    expect(new Uint8Array(b.data.buffer)[6 * 4 + 3]).toBe(255);
    expect(new Uint8Array(b.data.buffer)[(INSTANCE_FLOATS + 6) * 4 + 3]).toBe(0);
  });
});
