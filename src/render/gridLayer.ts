/**
 * Datos de una capa de la rejilla (solo CPU, sin PixiJS: se puede testear).
 *
 * Cada celda ocupa 3 texels RGBA8 seguidos en `data`:
 *   texel 0: id de glifo (byte bajo, byte alto), flags, reservado
 *   texel 1: color de texto RGBA (A = 255 por ahora)
 *   texel 2: color de fondo RGBA (A = 255 opaco, 0 transparente)
 * La GPU lee esto como una textura de (columnas × 3) × filas.
 *
 * Las escrituras marcan las filas que cambian; `collectDirtyRanges` devuelve los rangos de
 * texels a subir y limpia las marcas.
 */

import { EMPTY_GLYPH, type GlyphId, type GlyphTable } from './glyphs';

export const TEXELS_PER_CELL = 3;
const BYTES_PER_CELL = TEXELS_PER_CELL * 4;

/** Color 0xRRGGBB. */
export type Rgb = number;

/** Fondo transparente: deja ver la capa de debajo. */
export const TRANSPARENT = -1;

export class GridLayer {
  readonly cols: number;
  readonly rows: number;
  /** Bytes de la textura de la capa (ver el formato arriba). */
  readonly data: Uint8Array;
  /** Primera y última columna cambiadas por fila (min > max = fila limpia). */
  private readonly dirtyMin: Int32Array;
  private readonly dirtyMax: Int32Array;
  private dirty = false;

  constructor(cols: number, rows: number) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
      throw new Error(`Tamaño de capa inválido: ${cols}×${rows}`);
    }
    this.cols = cols;
    this.rows = rows;
    this.data = new Uint8Array(cols * rows * BYTES_PER_CELL);
    this.dirtyMin = new Int32Array(rows);
    this.dirtyMax = new Int32Array(rows);
    this.resetDirty();
    this.markAll();
  }

  /**
   * Escribe una celda. Fuera de la rejilla no hace nada (así se puede dibujar cortando por
   * los bordes sin comprobar).
   */
  set(x: number, y: number, glyph: GlyphId, fg: Rgb, bg: Rgb = TRANSPARENT): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const o = (y * this.cols + x) * BYTES_PER_CELL;
    const d = this.data;
    d[o] = glyph & 0xff;
    d[o + 1] = (glyph >>> 8) & 0xff;
    d[o + 4] = (fg >>> 16) & 0xff;
    d[o + 5] = (fg >>> 8) & 0xff;
    d[o + 6] = fg & 0xff;
    d[o + 7] = 255;
    if (bg === TRANSPARENT) {
      d[o + 8] = 0;
      d[o + 9] = 0;
      d[o + 10] = 0;
      d[o + 11] = 0;
    } else {
      d[o + 8] = (bg >>> 16) & 0xff;
      d[o + 9] = (bg >>> 8) & 0xff;
      d[o + 10] = bg & 0xff;
      d[o + 11] = 255;
    }
    this.mark(x, y);
  }

  /** Cambia solo el fondo de una celda. */
  setBg(x: number, y: number, bg: Rgb): void {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const o = (y * this.cols + x) * BYTES_PER_CELL + 8;
    const d = this.data;
    if (bg === TRANSPARENT) {
      d[o] = d[o + 1] = d[o + 2] = d[o + 3] = 0;
    } else {
      d[o] = (bg >>> 16) & 0xff;
      d[o + 1] = (bg >>> 8) & 0xff;
      d[o + 2] = bg & 0xff;
      d[o + 3] = 255;
    }
    this.mark(x, y);
  }

  /** Deja la celda vacía y transparente. */
  clear(x: number, y: number): void {
    this.set(x, y, EMPTY_GLYPH, 0, TRANSPARENT);
  }

  /** Rellena un rectángulo (recortado a la rejilla). */
  fill(
    x: number,
    y: number,
    width: number,
    height: number,
    glyph: GlyphId,
    fg: Rgb,
    bg: Rgb = TRANSPARENT,
  ): void {
    const x1 = Math.min(x + width, this.cols);
    const y1 = Math.min(y + height, this.rows);
    for (let cy = Math.max(y, 0); cy < y1; cy++) {
      for (let cx = Math.max(x, 0); cx < x1; cx++) this.set(cx, cy, glyph, fg, bg);
    }
  }

  /** Escribe texto en una fila. Los caracteres sin glifo salen como '?'. */
  print(
    glyphs: GlyphTable,
    x: number,
    y: number,
    text: string,
    fg: Rgb,
    bg: Rgb = TRANSPARENT,
  ): void {
    let cx = x;
    for (const ch of text) {
      this.set(cx, y, glyphs.fromCodepoint(ch.codePointAt(0) ?? 0), fg, bg);
      cx++;
    }
  }

  /** Lee el id de glifo de una celda. */
  glyphAt(x: number, y: number): GlyphId {
    const o = (y * this.cols + x) * BYTES_PER_CELL;
    return (((this.data[o] ?? 0) | ((this.data[o + 1] ?? 0) << 8)) >>> 0) as GlyphId;
  }

  /** Marca toda la capa para subirla entera. */
  markAll(): void {
    this.dirtyMin.fill(0);
    this.dirtyMax.fill(this.cols - 1);
    this.dirty = true;
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Llama a `upload(start, end)` (texels, `end` exclusivo) por cada tramo a subir y limpia las
   * marcas. Junta filas cercanas: cada subida tiene un coste fijo, así que es mejor subir unas
   * pocas celdas limpias de más que hacer muchas llamadas. Devuelve los texels subidos.
   */
  collectDirtyRanges(upload: (start: number, end: number) => void, mergeGapRows = 2): number {
    if (!this.dirty) return 0;
    const rowTexels = this.cols * TEXELS_PER_CELL;
    const mergeGap = mergeGapRows * rowTexels;
    let start = -1;
    let end = -1;
    let total = 0;
    for (let y = 0; y < this.rows; y++) {
      const min = this.dirtyMin[y] ?? 0;
      const max = this.dirtyMax[y] ?? -1;
      if (min > max) continue;
      const rs = y * rowTexels + min * TEXELS_PER_CELL;
      const re = y * rowTexels + (max + 1) * TEXELS_PER_CELL;
      if (start >= 0 && rs - end <= mergeGap) {
        end = re;
      } else {
        if (start >= 0) {
          upload(start, end);
          total += end - start;
        }
        start = rs;
        end = re;
      }
    }
    if (start >= 0) {
      upload(start, end);
      total += end - start;
    }
    this.resetDirty();
    return total;
  }

  private mark(x: number, y: number): void {
    if (x < (this.dirtyMin[y] ?? 0)) this.dirtyMin[y] = x;
    if (x > (this.dirtyMax[y] ?? 0)) this.dirtyMax[y] = x;
    this.dirty = true;
  }

  private resetDirty(): void {
    this.dirtyMin.fill(this.cols);
    this.dirtyMax.fill(-1);
    this.dirty = false;
  }
}
