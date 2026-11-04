/**
 * Lista de dibujo de una capa de entidades (solo CPU, sin PixiJS: se puede testear).
 *
 * Funciona en modo inmediato: cada frame se llama a `begin()`, luego a `push()` por cada
 * entidad visible y por último a `end()`, que ordena por la clave (normalmente la Y de los
 * pies) y empaqueta los datos de instancia para la GPU.
 *
 * Formato por instancia (28 bytes):
 *   float32 x, y        centro del glifo, en celdas
 *   float32 sx, sy      escala (1 = una celda)
 *   float32 rotation    radianes
 *   float32 glyph       id de glifo
 *   unorm8x4 color      RGBA (A = opacidad)
 */

import type { GlyphId } from './glyphs';

export const INSTANCE_FLOATS = 7;
export const INSTANCE_BYTES = INSTANCE_FLOATS * 4;

export class EntityBatch {
  /** Datos de instancia listos para subir (ordenados tras `end()`). */
  data: Float32Array;
  /** Vista del mismo buffer para escribir el color como 4 bytes. */
  private dataU32: Uint32Array;
  /** Instancias de este frame. */
  count = 0;

  // Datos sin ordenar del frame en curso (estructura de arrays).
  private staging: Float32Array;
  private stagingColor: Uint32Array;
  private keys: Float64Array;
  /** Orden del frame anterior: casi siempre ya está ordenado, así que ordenar es casi gratis. */
  private order: Int32Array;
  private lastCount = -1;

  constructor(initialCapacity = 256) {
    const cap = Math.max(1, initialCapacity);
    this.data = new Float32Array(cap * INSTANCE_FLOATS);
    this.dataU32 = new Uint32Array(this.data.buffer);
    this.staging = new Float32Array(cap * 6);
    this.stagingColor = new Uint32Array(cap);
    this.keys = new Float64Array(cap);
    this.order = new Int32Array(cap);
  }

  get capacity(): number {
    return this.keys.length;
  }

  begin(): void {
    this.count = 0;
  }

  /**
   * Añade una instancia. `color` es 0xRRGGBB y `alpha` 0–1. `sortKey` decide el orden de
   * dibujo dentro de la capa (de menor a mayor: lo de más abajo en pantalla, encima).
   */
  push(
    x: number,
    y: number,
    scaleX: number,
    scaleY: number,
    rotation: number,
    glyph: GlyphId,
    color: number,
    alpha: number,
    sortKey: number,
  ): void {
    if (this.count >= this.capacity) this.grow();
    const i = this.count++;
    const s = i * 6;
    const st = this.staging;
    st[s] = x;
    st[s + 1] = y;
    st[s + 2] = scaleX;
    st[s + 3] = scaleY;
    st[s + 4] = rotation;
    st[s + 5] = glyph;
    const a = alpha <= 0 ? 0 : alpha >= 1 ? 255 : Math.round(alpha * 255);
    // Bytes en memoria (little-endian): R, G, B, A.
    this.stagingColor[i] =
      (((color >>> 16) & 0xff) | (color & 0xff00) | ((color & 0xff) << 16) | (a << 24)) >>> 0;
    this.keys[i] = sortKey;
  }

  /** Ordena por clave (estable) y empaqueta. Devuelve los bytes a subir. */
  end(): number {
    const n = this.count;
    const order = this.order;
    if (n !== this.lastCount) {
      for (let i = 0; i < n; i++) order[i] = i;
      this.lastCount = n;
    }
    // Ordenación por inserción sobre el orden del frame anterior: O(n) si casi no cambia.
    const keys = this.keys;
    for (let i = 1; i < n; i++) {
      const idx = order[i] as number;
      const key = keys[idx] as number;
      let j = i - 1;
      while (j >= 0) {
        const other = order[j] as number;
        const otherKey = keys[other] as number;
        // Desempate por índice para que el orden sea estable entre frames.
        if (otherKey < key || (otherKey === key && other < idx)) break;
        order[j + 1] = other;
        j--;
      }
      order[j + 1] = idx;
    }

    const st = this.staging;
    const out = this.data;
    const outU32 = this.dataU32;
    for (let i = 0; i < n; i++) {
      const src = (order[i] as number) * 6;
      const dst = i * INSTANCE_FLOATS;
      out[dst] = st[src] as number;
      out[dst + 1] = st[src + 1] as number;
      out[dst + 2] = st[src + 2] as number;
      out[dst + 3] = st[src + 3] as number;
      out[dst + 4] = st[src + 4] as number;
      out[dst + 5] = st[src + 5] as number;
      outU32[dst + 6] = this.stagingColor[order[i] as number] as number;
    }
    return n * INSTANCE_BYTES;
  }

  private grow(): void {
    const cap = this.capacity * 2;
    const data = new Float32Array(cap * INSTANCE_FLOATS);
    data.set(this.data);
    this.data = data;
    this.dataU32 = new Uint32Array(data.buffer);
    const staging = new Float32Array(cap * 6);
    staging.set(this.staging);
    this.staging = staging;
    const color = new Uint32Array(cap);
    color.set(this.stagingColor);
    this.stagingColor = color;
    const keys = new Float64Array(cap);
    keys.set(this.keys);
    this.keys = keys;
    const order = new Int32Array(cap);
    order.set(this.order);
    this.order = order;
  }
}
