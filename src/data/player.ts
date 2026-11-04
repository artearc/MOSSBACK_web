/**
 * Ajustes del personaje jugable. Son los valores por defecto; en desarrollo se cambian en vivo
 * con Tweakpane (y «Copiar valores» da el objeto para pegarlo aquí).
 */

import type { CameraFollowTuning } from '../sim/cameraFollow';
import type { BoxCollider } from '../sim/collision';
import type { MovementTuning } from '../sim/movement';

export interface WalkBobTuning {
  /** Altura del saltito al caminar, en celdas. */
  height: number;
  /** Estiramiento/aplastamiento del glifo (0 = nada). */
  squash: number;
  /** Pasos por celda recorrida. */
  stepsPerCell: number;
}

export interface ShadowTuning {
  alpha: number;
  scaleX: number;
  scaleY: number;
  /** Difuminado del borde (0 = nítido, 1 = todo difuminado). */
  softness: number;
}

export interface PlayerTuning {
  movement: MovementTuning;
  collider: BoxCollider;
  /** Solapamiento máximo con una esquina que se corrige empujando de lado (celdas). */
  cornerTolerance: number;
  /** Zona muerta del stick (0–1). */
  deadzone: number;
  camera: CameraFollowTuning;
  bob: WalkBobTuning;
  shadow: ShadowTuning;
  /** Cuánto se eleva el glifo sobre los pies (celdas). */
  spriteLift: number;
  /** Ajustar entidades al píxel físico (evita que vibren respecto al mundo). */
  snapToPixel: boolean;
}

export const DEFAULT_PLAYER_TUNING: PlayerTuning = {
  movement: {
    maxSpeed: 5.5,
    acceleration: 45,
    deceleration: 40,
    turnAcceleration: 90,
    verticalFactor: 1,
  },
  collider: { halfWidth: 0.3, halfHeight: 0.2 },
  cornerTolerance: 0.35,
  deadzone: 0.2,
  camera: { followRate: 6, lookAhead: 1.5, lookAheadRate: 2.5 },
  bob: { height: 0.08, squash: 0.06, stepsPerCell: 1.6 },
  shadow: { alpha: 0.7, scaleX: 0.85, scaleY: 0.4, softness: 0.55 },
  spriteLift: 0.38,
  snapToPixel: true,
};

/** Copia independiente de los valores por defecto. */
export function createPlayerTuning(): PlayerTuning {
  return structuredClone(DEFAULT_PLAYER_TUNING);
}
