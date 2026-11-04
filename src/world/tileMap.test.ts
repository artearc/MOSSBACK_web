import { describe, expect, it } from 'vitest';
import { TEST_FARM } from '../data/maps/testFarm';
import { mergeKnown } from '../debug/tweaks';
import { composeRows, parseMap, type MapDefinition } from './tileMap';

const ground = { glyphs: '.', fg: 0x00ff00 };
const base: MapDefinition = {
  name: 'mini',
  rows: ['..#', '.@.'],
  defaultGround: ground,
  legend: { '.': {}, '#': { solid: true }, '@': { spawn: true } },
};

describe('parseMap', () => {
  it('lee tamaño, sólidos y punto de aparición', () => {
    const map = parseMap(base);
    expect([map.cols, map.rows]).toEqual([3, 2]);
    expect(map.spawn).toEqual({ x: 1, y: 1 });
    expect(map.isSolid(2, 0)).toBe(true);
    expect(map.isSolid(0, 0)).toBe(false);
    expect(map.isSolid(-1, 0)).toBe(true); // fuera del mapa
    expect(map.isSolid(0, 2)).toBe(true);
  });

  it('rechaza mapas mal formados', () => {
    expect(() => parseMap({ ...base, rows: ['..', '.@.'] })).toThrow(/fila 1/);
    expect(() => parseMap({ ...base, rows: ['..?', '.@.'] })).toThrow(/sin leyenda/);
    expect(() => parseMap({ ...base, rows: ['...', '...'] })).toThrow(/aparición/);
    expect(() => parseMap({ ...base, rows: ['@..', '.@.'] })).toThrow(/más de un/);
  });

  it('el huerto de prueba es válido y aparece en una celda libre', () => {
    const map = parseMap(TEST_FARM);
    expect(map.isSolid(map.spawn.x, map.spawn.y)).toBe(false);
    // La puerta de la casa es transitable y los muros de al lado, no.
    const doorRow = map.cells.findIndex((c) => c === TEST_FARM.legend['D']);
    const doorX = doorRow % map.cols;
    const doorY = Math.floor(doorRow / map.cols);
    expect(map.isSolid(doorX, doorY)).toBe(false);
    expect(map.isSolid(doorX - 1, doorY)).toBe(true);
    expect(map.isSolid(doorX + 1, doorY)).toBe(true);
  });
});

describe('composeRows', () => {
  it('estampa bloques; el espacio no toca', () => {
    const rows = composeRows(4, 2, '.', [{ x: 1, y: 0, rows: ['a b', 'cc'] }]);
    expect(rows).toEqual(['.a.b', '.cc.']);
  });
});

describe('mergeKnown (ajustes guardados)', () => {
  it('solo copia claves conocidas y del mismo tipo', () => {
    const target = { a: 1, b: { c: true, d: 2 }, e: 'x' };
    mergeKnown(target, { a: 5, b: { c: 'no', d: 3 }, z: 9, e: 7 });
    expect(target).toEqual({ a: 5, b: { c: true, d: 3 }, e: 'x' });
    mergeKnown(target, { a: Number.NaN });
    expect(target.a).toBe(5);
  });
});
