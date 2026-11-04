/**
 * RNG con semilla (sfc32). Toda la aleatoriedad del juego pasa por aquí para que sea
 * determinista: misma semilla → misma partida.
 *
 * - La semilla es un texto; se convierte en 128 bits con el hash cyrb128.
 * - `fork(label)` crea un stream independiente derivado de la semilla y la etiqueta, no del
 *   estado actual: añadir o reordenar forks no altera los demás streams.
 * - `getState` / `setState` permiten guardar y restaurar el RNG en una partida.
 */

export type RngWords = readonly [number, number, number, number];

export interface RngState {
  readonly seed: string;
  readonly words: RngWords;
}

/** Iteraciones iniciales descartadas para mezclar bien el estado. */
const WARMUP_ROUNDS = 15;
const UINT32_RANGE = 0x1_0000_0000;

/** Hash de texto a 4 palabras de 32 bits (cyrb128). */
export function hashSeed(text: string): RngWords {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044813);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044813);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

export class Rng {
  readonly seed: string;
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: string) {
    this.seed = seed;
    [this.a, this.b, this.c, this.d] = hashSeed(seed);
    for (let i = 0; i < WARMUP_ROUNDS; i++) this.nextUint32();
  }

  /** Restaura un RNG desde un estado guardado. */
  static fromState(state: RngState): Rng {
    const rng = new Rng(state.seed);
    rng.setState(state);
    return rng;
  }

  /** Entero sin signo de 32 bits. */
  nextUint32(): number {
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** Real en [0, 1). */
  next(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** Real en [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Entero en [min, max], ambos incluidos. */
  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error(`Rango entero inválido: [${min}, ${max}]`);
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** `true` con probabilidad `p` (0–1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Elemento al azar de una lista no vacía. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() sobre una lista vacía');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Stream independiente para un sistema concreto (p. ej. `rng.fork('weather')`). */
  fork(label: string): Rng {
    return new Rng(`${this.seed}/${label}`);
  }

  getState(): RngState {
    return { seed: this.seed, words: [this.a >>> 0, this.b >>> 0, this.c >>> 0, this.d >>> 0] };
  }

  setState(state: RngState): void {
    if (state.seed !== this.seed) {
      throw new Error(`El estado es de la semilla "${state.seed}", no de "${this.seed}"`);
    }
    [this.a, this.b, this.c, this.d] = state.words;
  }
}

export function createRng(seed: string): Rng {
  return new Rng(seed);
}
