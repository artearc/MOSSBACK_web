/**
 * Tabla de glifos: traduce caracteres y nombres a `GlyphId` y guarda, por glifo, dónde está en
 * el atlas MSDF y dónde va dentro de una celda.
 *
 * La comparten la rejilla y la futura capa de entidades con movimiento libre (quads
 * instanciados): ambas leen los mismos datos (`gpuData` en la GPU, `uvRect`/`plane` en la CPU).
 *
 * El manifiesto lo genera `npm run font` (scripts/build-font.mjs).
 */

/** Índice de un glifo en la tabla. 0 es el glifo vacío. */
export type GlyphId = number & { readonly __brand: 'GlyphId' };

export const EMPTY_GLYPH = 0 as GlyphId;

/** Valores por glifo en `gpuData`: [u0, v0, u1, v1] y [izq, arriba, der, abajo]. */
export const GLYPH_FLOATS = 8;

export interface GlyphManifestEntry {
  /** Punto de código Unicode. */
  readonly cp: number;
  /** Nombre opcional (glifos propios: 'sprout', 'leaf'…). */
  readonly name?: string;
  /** Rectángulo en el atlas, en píxeles: x, y, ancho, alto. */
  readonly rect: readonly [number, number, number, number];
  /** Dónde va el rectángulo dentro de una celda de lado 1: izq, arriba, der, abajo. */
  readonly plane: readonly [number, number, number, number];
}

export interface GlyphManifest {
  readonly version: 1;
  readonly atlas: {
    readonly image: string;
    readonly width: number;
    readonly height: number;
    /** Rango del campo de distancia, en píxeles del atlas. */
    readonly distanceRange: number;
    readonly fontSize: number;
  };
  readonly glyphs: readonly GlyphManifestEntry[];
}

/** Comprueba la forma del manifiesto (viene de un JSON). */
export function parseGlyphManifest(data: unknown): GlyphManifest {
  const fail = (why: string): never => {
    throw new Error(`Manifiesto de glifos inválido: ${why}`);
  };
  if (typeof data !== 'object' || data === null) return fail('no es un objeto');
  const m = data as Record<string, unknown>;
  if (m['version'] !== 1) fail(`versión ${String(m['version'])}`);
  const atlas = m['atlas'] as Record<string, unknown> | undefined;
  if (!atlas || typeof atlas['width'] !== 'number' || typeof atlas['height'] !== 'number') {
    fail('falta atlas.width/height');
  }
  if (typeof atlas?.['distanceRange'] !== 'number') fail('falta atlas.distanceRange');
  const glyphs = m['glyphs'];
  if (!Array.isArray(glyphs)) return fail('glyphs no es una lista');
  const isQuad = (v: unknown): boolean =>
    Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number');
  glyphs.forEach((g: unknown, i) => {
    const e = g as Record<string, unknown>;
    if (typeof e['cp'] !== 'number') fail(`glifo ${i}: falta cp`);
    if (!isQuad(e['rect']) || !isQuad(e['plane'])) fail(`glifo ${i}: rect/plane inválidos`);
    if (e['name'] !== undefined && typeof e['name'] !== 'string') fail(`glifo ${i}: name`);
  });
  return data as GlyphManifest;
}

/** Caracteres que no se dibujan y se resuelven al glifo vacío. */
function isBlank(cp: number): boolean {
  return cp <= 0x20 || cp === 0x7f || cp === 0xa0;
}

export class GlyphTable {
  /** Número de entradas, contando el glifo vacío. */
  readonly count: number;
  readonly atlasWidth: number;
  readonly atlasHeight: number;
  readonly distanceRange: number;
  /**
   * Datos para la GPU: `GLYPH_FLOATS` floats por glifo (uv normalizados y plano), en el mismo
   * orden que los ids. El glifo vacío tiene todo a 0.
   */
  readonly gpuData: Float32Array;
  private readonly byCodepoint = new Map<number, GlyphId>();
  private readonly byName = new Map<string, GlyphId>();
  private readonly fallback: GlyphId;

  constructor(manifest: GlyphManifest) {
    const { atlas, glyphs } = manifest;
    this.count = glyphs.length + 1;
    this.atlasWidth = atlas.width;
    this.atlasHeight = atlas.height;
    this.distanceRange = atlas.distanceRange;
    this.gpuData = new Float32Array(this.count * GLYPH_FLOATS);

    glyphs.forEach((g, i) => {
      const id = (i + 1) as GlyphId;
      const [x, y, w, h] = g.rect;
      const o = id * GLYPH_FLOATS;
      this.gpuData[o] = x / atlas.width;
      this.gpuData[o + 1] = y / atlas.height;
      this.gpuData[o + 2] = (x + w) / atlas.width;
      this.gpuData[o + 3] = (y + h) / atlas.height;
      this.gpuData.set(g.plane, o + 4);
      if (!this.byCodepoint.has(g.cp)) this.byCodepoint.set(g.cp, id);
      if (g.name !== undefined) this.byName.set(g.name, id);
    });
    this.fallback = this.byCodepoint.get(0x3f /* ? */) ?? EMPTY_GLYPH;
  }

  /**
   * Id de un carácter (`'@'`) o de un glifo con nombre (`'sprout'`). Lanza si no existe: es un
   * error de contenido, mejor verlo pronto. Resuélvelo una vez, fuera de los bucles.
   */
  id(charOrName: string): GlyphId {
    const named = this.byName.get(charOrName);
    if (named !== undefined) return named;
    const cp = charOrName.codePointAt(0);
    if (cp !== undefined && String.fromCodePoint(cp).length === charOrName.length) {
      if (isBlank(cp)) return EMPTY_GLYPH;
      const id = this.byCodepoint.get(cp);
      if (id !== undefined) return id;
    }
    throw new Error(`Glifo desconocido: "${charOrName}"`);
  }

  /** Id de un punto de código; si no está en el atlas devuelve '?'. Para texto. */
  fromCodepoint(cp: number): GlyphId {
    if (isBlank(cp)) return EMPTY_GLYPH;
    return this.byCodepoint.get(cp) ?? this.fallback;
  }

  has(charOrName: string): boolean {
    try {
      this.id(charOrName);
      return true;
    } catch {
      return false;
    }
  }

  /** Copia en `out` el rectángulo uv [u0, v0, u1, v1] del glifo. */
  uvRect(id: GlyphId, out: Float32Array | number[]): void {
    const o = id * GLYPH_FLOATS;
    for (let i = 0; i < 4; i++) out[i] = this.gpuData[o + i] ?? 0;
  }

  /** Copia en `out` el plano [izq, arriba, der, abajo] del glifo, en unidades de celda. */
  plane(id: GlyphId, out: Float32Array | number[]): void {
    const o = id * GLYPH_FLOATS + 4;
    for (let i = 0; i < 4; i++) out[i] = this.gpuData[o + i] ?? 0;
  }
}
