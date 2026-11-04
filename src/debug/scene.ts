/** Escena que main.ts puede ejecutar (huerto de prueba, escena de estrés…). */

import type { Container } from 'pixi.js';
import type { Camera, Viewport } from '../render/camera';

export interface Scene {
  /** Lo que hay que añadir al stage. */
  readonly stage: Container;
  readonly camera: Camera;
  /** Un paso de simulación a paso fijo. */
  update(dt: number): void;
  /** Prepara el frame interpolando con `alpha` (CPU). */
  render(alpha: number, timeSeconds: number): void;
  /** Sube a la GPU lo cambiado y coloca las capas según la cámara. */
  sync(view: Viewport): void;
  /** Líneas para el overlay de rendimiento. */
  describe(): string;
  destroy(): void;
}
