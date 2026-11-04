/** Interpolación lineal entre `from` y `to` con `t` en [0, 1]. */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
