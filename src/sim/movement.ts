/** Movimiento con aceleración y frenado suaves (funciones puras). */

import type { Vec2 } from './components';

export interface MovementTuning {
  /** Velocidad máxima, en celdas por segundo. */
  maxSpeed: number;
  /** Aceleración hacia la velocidad deseada (celdas/s²). */
  acceleration: number;
  /** Frenado al soltar el control (celdas/s²). */
  deceleration: number;
  /** Aceleración al cambiar de sentido; más alta = giros más ágiles. */
  turnAcceleration: number;
  /** Multiplica la velocidad vertical (1 = igual que la horizontal). */
  verticalFactor: number;
}

/**
 * Lleva `velocity` hacia `input × maxSpeed` sin pasarse. `input` tiene longitud 0–1. Con
 * input 0 frena; si el input apunta contra la velocidad actual usa la aceleración de giro.
 */
export function steerVelocity(
  velocity: Vec2,
  input: Readonly<Vec2>,
  tuning: Readonly<MovementTuning>,
  dt: number,
): void {
  const targetX = input.x * tuning.maxSpeed;
  const targetY = input.y * tuning.maxSpeed * tuning.verticalFactor;
  const hasInput = input.x !== 0 || input.y !== 0;

  let rate: number;
  if (!hasInput) rate = tuning.deceleration;
  else if (velocity.x * targetX + velocity.y * targetY < 0) rate = tuning.turnAcceleration;
  else rate = tuning.acceleration;

  const dx = targetX - velocity.x;
  const dy = targetY - velocity.y;
  const distance = Math.hypot(dx, dy);
  const step = rate * dt;
  if (distance <= step || distance === 0) {
    velocity.x = targetX;
    velocity.y = targetY;
  } else {
    velocity.x += (dx / distance) * step;
    velocity.y += (dy / distance) * step;
  }
}
