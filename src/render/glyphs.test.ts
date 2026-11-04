import { describe, expect, it } from 'vitest';
import realManifest from '../../assets/fonts/atlas.json';
import {
  EMPTY_GLYPH,
  GLYPH_FLOATS,
  GlyphTable,
  parseGlyphManifest,
  type GlyphManifest,
} from './glyphs';

const manifest: GlyphManifest = {
  version: 1,
  atlas: { image: 'atlas.png', width: 100, height: 50, distanceRange: 6, fontSize: 48 },
  glyphs: [
    { cp: 0x41, rect: [10, 5, 20, 10], plane: [0.1, 0.2, 0.9, 0.8] }, // A
    { cp: 0x3f, rect: [0, 0, 10, 10], plane: [0, 0, 1, 1] }, // ?
    { cp: 0xe000, name: 'sprout', rect: [50, 25, 50, 25], plane: [-0.1, -0.1, 1.1, 1.1] },
  ],
};

describe('GlyphTable', () => {
  const table = new GlyphTable(manifest);

  it('da ids por carácter y por nombre; 0 es el vacío', () => {
    expect(table.id('A')).toBe(1);
    expect(table.id('?')).toBe(2);
    expect(table.id('sprout')).toBe(3);
    expect(table.id('\u{e000}')).toBe(3);
    expect(table.id(' ')).toBe(EMPTY_GLYPH);
    expect(table.count).toBe(4);
  });

  it('lanza con glifos desconocidos y fromCodepoint usa "?"', () => {
    expect(() => table.id('Z')).toThrow();
    expect(() => table.id('AB')).toThrow();
    expect(table.has('Z')).toBe(false);
    expect(table.fromCodepoint(0x5a)).toBe(2);
    expect(table.fromCodepoint(0x20)).toBe(EMPTY_GLYPH);
  });

  it('guarda uv normalizados y plano para la GPU y la CPU', () => {
    const o = 1 * GLYPH_FLOATS;
    expect([...table.gpuData.subarray(o, o + 8)]).toEqual(
      [0.1, 0.1, 0.3, 0.3, 0.1, 0.2, 0.9, 0.8].map(Math.fround),
    );
    const uv = [0, 0, 0, 0];
    const plane = [0, 0, 0, 0];
    table.uvRect(table.id('sprout'), uv);
    table.plane(table.id('sprout'), plane);
    expect(uv).toEqual([0.5, 0.5, 1, 1]);
    expect(plane.map((v) => +v.toFixed(5))).toEqual([-0.1, -0.1, 1.1, 1.1]);
    expect([...table.gpuData.subarray(0, GLYPH_FLOATS)].every((v) => v === 0)).toBe(true);
  });

  it('rechaza manifiestos mal formados', () => {
    expect(() => parseGlyphManifest(null)).toThrow();
    expect(() => parseGlyphManifest({ ...manifest, version: 2 })).toThrow();
    expect(() =>
      parseGlyphManifest({ ...manifest, glyphs: [{ cp: 65, rect: [0, 0], plane: [0, 0, 1, 1] }] }),
    ).toThrow();
  });
});

describe('atlas generado (assets/fonts/atlas.json)', () => {
  const table = new GlyphTable(parseGlyphManifest(realManifest));

  it('tiene ASCII imprimible, cajas y bloques', () => {
    for (let cp = 0x21; cp <= 0x7e; cp++) expect(table.has(String.fromCodePoint(cp))).toBe(true);
    for (const ch of '─│┌┐└┘├┤┬┴┼═║╔╗╚╝░▒▓█▀▄▌▐ñÑáéíóú') expect(table.has(ch)).toBe(true);
  });

  it('los uv caen dentro del atlas y los glifos de texto dentro de la celda', () => {
    const uv = [0, 0, 0, 0];
    const plane = [0, 0, 0, 0];
    for (let id = 1; id < table.count; id++) {
      table.uvRect(id as never, uv);
      for (const v of uv) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    // El dibujo de 'M' (sin el margen del campo de distancia) cabe en la celda.
    table.plane(table.id('M'), plane);
    expect(plane[0]).toBeGreaterThan(-0.2);
    expect(plane[2]).toBeLessThan(1.2);
    // Los bloques cubren la celda entera.
    table.plane(table.id('█'), plane);
    expect(plane[0]).toBeLessThan(0);
    expect(plane[1]).toBeLessThan(0);
    expect(plane[2]).toBeGreaterThan(1);
    expect(plane[3]).toBeGreaterThan(1);
  });
});
