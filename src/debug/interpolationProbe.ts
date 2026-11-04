// TEMPORAL: borrar al llegar el renderizador de rejilla.
//
// Dos puntos que cruzan la pantalla con la misma simulación a paso fijo:
// - arriba (verde): se dibuja interpolando entre el estado anterior y el actual;
// - abajo (naranja): se dibuja en el estado actual, sin interpolar.
// Sirve para ver a simple vista que la interpolación suaviza el movimiento.

import { Graphics, type Container, type Rectangle } from 'pixi.js';
import { clamp, lerp } from '../core/math';

const SPEED_PX_PER_S = 420;
const MARGIN_PX = 40;
const RADIUS_PX = 10;
const ROW_GAP_PX = 36;

export interface InterpolationProbe {
  update(dt: number): void;
  render(alpha: number): void;
}

export function createInterpolationProbe(stage: Container, screen: Rectangle): InterpolationProbe {
  const smooth = new Graphics().circle(0, 0, RADIUS_PX).fill(0x7fd1a0);
  const raw = new Graphics().circle(0, 0, RADIUS_PX).fill(0xe08a5a);
  stage.addChild(smooth, raw);

  // Estado de simulación: solo cambia en update().
  let prevX = MARGIN_PX;
  let x = MARGIN_PX;
  let direction = 1;

  return {
    update(dt: number): void {
      const minX = MARGIN_PX;
      const maxX = Math.max(screen.width - MARGIN_PX, minX);
      prevX = clamp(x, minX, maxX);
      x = prevX + direction * SPEED_PX_PER_S * dt;
      // Rebote en los bordes.
      if (x > maxX) {
        x = maxX - (x - maxX);
        direction = -1;
      } else if (x < minX) {
        x = minX + (minX - x);
        direction = 1;
      }
    },
    render(alpha: number): void {
      const centerY = screen.height / 2;
      smooth.position.set(lerp(prevX, x, alpha), centerY - ROW_GAP_PX);
      raw.position.set(x, centerY + ROW_GAP_PX);
    },
  };
}
