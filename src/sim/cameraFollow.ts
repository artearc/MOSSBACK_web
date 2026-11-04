/**
 * Cámara que sigue a un objetivo con suavizado y un pequeño adelanto en la dirección del
 * movimiento. Se actualiza en el paso fijo; al dibujar se interpola entre `prev` y el actual.
 */

export interface CameraFollowTuning {
  /** Rapidez con que la cámara alcanza su objetivo (1/s). Más alto = más pegada. */
  followRate: number;
  /** Celdas de adelanto a velocidad máxima. */
  lookAhead: number;
  /** Rapidez con que cambia el adelanto (1/s); más bajo = no salta al girar. */
  lookAheadRate: number;
}

export interface CameraFollowState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  /** Adelanto actual (celdas). */
  leadX: number;
  leadY: number;
}

/** Factor de suavizado exponencial para un paso: no depende de la tasa de pasos. */
export function smoothingFactor(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

export function createCameraFollow(x: number, y: number): CameraFollowState {
  return { x, y, prevX: x, prevY: y, leadX: 0, leadY: 0 };
}

/**
 * Avanza un paso. `velX/velY` y `maxSpeed` sirven para calcular el adelanto (proporcional a
 * la fracción de velocidad máxima).
 */
export function updateCameraFollow(
  state: CameraFollowState,
  targetX: number,
  targetY: number,
  velX: number,
  velY: number,
  maxSpeed: number,
  tuning: Readonly<CameraFollowTuning>,
  dt: number,
): void {
  state.prevX = state.x;
  state.prevY = state.y;

  const k = maxSpeed > 0 ? tuning.lookAhead / maxSpeed : 0;
  const leadT = smoothingFactor(tuning.lookAheadRate, dt);
  state.leadX += (velX * k - state.leadX) * leadT;
  state.leadY += (velY * k - state.leadY) * leadT;

  const t = smoothingFactor(tuning.followRate, dt);
  state.x += (targetX + state.leadX - state.x) * t;
  state.y += (targetY + state.leadY - state.y) * t;
}

/** Coloca la cámara de golpe (al empezar o al teletransportar). */
export function snapCameraFollow(state: CameraFollowState, x: number, y: number): void {
  state.x = state.prevX = x;
  state.y = state.prevY = y;
  state.leadX = state.leadY = 0;
}
