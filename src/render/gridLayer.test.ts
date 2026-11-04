import { describe, expect, it } from 'vitest';
import type { GlyphId } from './glyphs';
import { GridLayer, TEXELS_PER_CELL, TRANSPARENT } from './gridLayer';

const G = (n: number): GlyphId => n as GlyphId;

/** Recoge los rangos que pediría subir la capa. */
function ranges(layer: GridLayer, mergeGapRows?: number): [number, number][] {
  const out: [number, number][] = [];
  layer.collectDirtyRanges((s, e) => out.push([s, e]), mergeGapRows);
  return out;
}

function cellBytes(layer: GridLayer, x: number, y: number): number[] {
  const o = (y * layer.cols + x) * TEXELS_PER_CELL * 4;
  return [...layer.data.subarray(o, o + 12)];
}

describe('GridLayer', () => {
  it('empaqueta glifo (16 bits), texto RGBA y fondo RGBA', () => {
    const layer = new GridLayer(4, 3);
    layer.set(1, 2, G(0x1234), 0x112233, 0xaabbcc);
    expect(cellBytes(layer, 1, 2)).toEqual([
      0x34, 0x12, 0, 0, 0x11, 0x22, 0x33, 255, 0xaa, 0xbb, 0xcc, 255,
    ]);
    expect(layer.glyphAt(1, 2)).toBe(0x1234);
  });

  it('el fondo transparente tiene alfa 0 y clear() vacía la celda', () => {
    const layer = new GridLayer(2, 2);
    layer.set(0, 0, G(5), 0xffffff, TRANSPARENT);
    expect(cellBytes(layer, 0, 0).slice(8)).toEqual([0, 0, 0, 0]);
    layer.set(1, 1, G(7), 0x010203, 0x040506);
    layer.clear(1, 1);
    expect(cellBytes(layer, 1, 1)).toEqual([0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0]);
  });

  it('setBg cambia solo el fondo', () => {
    const layer = new GridLayer(2, 1);
    layer.set(0, 0, G(9), 0x102030, TRANSPARENT);
    layer.setBg(0, 0, 0x405060);
    expect(cellBytes(layer, 0, 0)).toEqual([
      9, 0, 0, 0, 0x10, 0x20, 0x30, 255, 0x40, 0x50, 0x60, 255,
    ]);
  });

  it('ignora escrituras fuera de la rejilla', () => {
    const layer = new GridLayer(3, 3);
    ranges(layer);
    layer.set(-1, 0, G(1), 0, 0);
    layer.set(3, 0, G(1), 0, 0);
    layer.set(0, 3, G(1), 0, 0);
    expect(layer.isDirty).toBe(false);
    expect(layer.data.every((b) => b === 0)).toBe(true);
  });

  it('al crearse pide subir toda la capa', () => {
    const layer = new GridLayer(5, 4);
    expect(ranges(layer)).toEqual([[0, 5 * 4 * TEXELS_PER_CELL]]);
    expect(ranges(layer)).toEqual([]);
  });

  it('sube solo el tramo de la fila que cambia', () => {
    const layer = new GridLayer(10, 5);
    ranges(layer);
    layer.set(3, 2, G(1), 0, 0);
    layer.set(6, 2, G(1), 0, 0);
    const row = 10 * TEXELS_PER_CELL;
    expect(ranges(layer)).toEqual([[2 * row + 3 * 3, 2 * row + 7 * 3]]);
  });

  it('junta filas cercanas y separa las lejanas', () => {
    const layer = new GridLayer(10, 20);
    ranges(layer);
    const row = 10 * TEXELS_PER_CELL;
    layer.set(0, 1, G(1), 0, 0);
    layer.set(9, 2, G(1), 0, 0); // menos de 2 filas de texels de hueco: se junta
    layer.set(5, 15, G(1), 0, 0); // lejos: tramo aparte
    expect(ranges(layer, 2)).toEqual([
      [1 * row, 2 * row + 10 * 3],
      [15 * row + 5 * 3, 15 * row + 6 * 3],
    ]);
  });

  it('collectDirtyRanges devuelve los texels subidos', () => {
    const layer = new GridLayer(8, 8);
    ranges(layer);
    layer.fill(2, 2, 3, 1, G(1), 0, 0);
    expect(layer.collectDirtyRanges(() => undefined)).toBe(3 * TEXELS_PER_CELL);
  });

  it('print() escribe texto con la tabla de glifos', () => {
    const layer = new GridLayer(6, 1);
    const table = { fromCodepoint: (cp: number) => G(cp === 0x20 ? 0 : cp - 0x40) };
    layer.print(table as never, 1, 0, 'AB C', 0xffffff);
    expect([1, 2, 3, 4].map((x) => layer.glyphAt(x, 0))).toEqual([1, 2, 0, 3]);
  });

  it('rechaza tamaños inválidos', () => {
    expect(() => new GridLayer(0, 5)).toThrow();
    expect(() => new GridLayer(2.5, 5)).toThrow();
  });
});
