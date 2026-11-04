/**
 * Colisiones de una caja (los pies de una entidad) contra celdas sólidas.
 *
 * Se mueve primero en X y luego en Y: al chocar con una pared solo se anula el eje bloqueado
 * y la entidad se desliza por el borde. Si el choque es solo con la esquina de una celda y el
 * solapamiento es pequeño (`cornerTolerance`), se empuja de lado para que no se enganche en
 * puertas y esquinas.
 */

import type { Vec2 } from './components';

/** Mapa de celdas sólidas. Fuera del mapa todo cuenta como sólido. */
export interface SolidMap {
  readonly cols: number;
  readonly rows: number;
  isSolid(x: number, y: number): boolean;
}

export interface BoxCollider {
  /** Media anchura y media altura de la caja, en celdas. La caja está centrada en la posición. */
  halfWidth: number;
  halfHeight: number;
}

/** Separación mínima con las paredes, para no quedar justo en el borde. */
const SKIN = 1e-4;

/** ¿Hay alguna celda sólida que toque la caja [x0,x1)×[y0,y1)? */
function anySolid(map: SolidMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const cx0 = Math.floor(x0);
  const cy0 = Math.floor(y0);
  const cx1 = Math.ceil(x1) - 1;
  const cy1 = Math.ceil(y1) - 1;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) if (map.isSolid(cx, cy)) return true;
  }
  return false;
}

export interface MoveResult {
  /** Se bloqueó el movimiento en X / en Y. */
  blockedX: boolean;
  blockedY: boolean;
}

/**
 * Mueve `position` (centro de la caja) en (dx, dy) sin atravesar celdas sólidas. Supone que
 * |dx| y |dy| son menores de una celda (a la velocidad del juego, siempre). Escribe en
 * `position` y en `result`.
 */
export function moveAndCollide(
  position: Vec2,
  box: Readonly<BoxCollider>,
  dx: number,
  dy: number,
  map: SolidMap,
  cornerTolerance: number,
  result: MoveResult,
): MoveResult {
  result.blockedX = false;
  result.blockedY = false;
  const hw = box.halfWidth;
  const hh = box.halfHeight;

  if (dx !== 0) {
    if (!tryAxisX(position, hw, hh, dx, map)) {
      // ¿Choca solo con una esquina? Probar a empujar en Y y volver a intentarlo.
      const nudged = nudge(position, hw, hh, dx, 0, map, cornerTolerance);
      if (!nudged || !tryAxisX(position, hw, hh, dx, map)) {
        result.blockedX = true;
        snapX(position, hw, dx);
      }
    }
  }

  if (dy !== 0) {
    if (!tryAxisY(position, hw, hh, dy, map)) {
      const nudged = nudge(position, hw, hh, 0, dy, map, cornerTolerance);
      if (!nudged || !tryAxisY(position, hw, hh, dy, map)) {
        result.blockedY = true;
        snapY(position, hh, dy);
      }
    }
  }
  return result;
}

function tryAxisX(p: Vec2, hw: number, hh: number, dx: number, map: SolidMap): boolean {
  const nx = p.x + dx;
  // Solo la franja nueva que barre el borde delantero.
  const x0 = dx > 0 ? p.x + hw : nx - hw;
  const x1 = dx > 0 ? nx + hw : p.x - hw;
  if (anySolid(map, x0, p.y - hh, x1, p.y + hh)) return false;
  p.x = nx;
  return true;
}

function tryAxisY(p: Vec2, hw: number, hh: number, dy: number, map: SolidMap): boolean {
  const ny = p.y + dy;
  const y0 = dy > 0 ? p.y + hh : ny - hh;
  const y1 = dy > 0 ? ny + hh : p.y - hh;
  if (anySolid(map, p.x - hw, y0, p.x + hw, y1)) return false;
  p.y = ny;
  return true;
}

/**
 * Acerca la caja hasta tocar la pared que la bloquea, sin solaparse. Como el avance es menor
 * de una celda, la pared está en el borde de la celda siguiente al borde actual; nunca se
 * retrocede.
 */
function snapX(p: Vec2, hw: number, dx: number): void {
  if (dx > 0) p.x = Math.max(p.x, Math.ceil(p.x + hw) - hw - SKIN);
  else p.x = Math.min(p.x, Math.floor(p.x - hw) + hw + SKIN);
}

function snapY(p: Vec2, hh: number, dy: number): void {
  if (dy > 0) p.y = Math.max(p.y, Math.ceil(p.y + hh) - hh - SKIN);
  else p.y = Math.min(p.y, Math.floor(p.y - hh) + hh + SKIN);
}

/**
 * Si al moverse en un eje la caja solo roza una esquina (el solapamiento en el otro eje es
 * menor que `tolerance`), la desplaza en el otro eje lo justo para librarla. El desplazamiento
 * no supera el avance del paso, así que se nota como un deslizamiento suave.
 */
function nudge(
  p: Vec2,
  hw: number,
  hh: number,
  dx: number,
  dy: number,
  map: SolidMap,
  tolerance: number,
): boolean {
  if (tolerance <= 0) return false;
  const maxShift = Math.abs(dx !== 0 ? dx : dy);

  if (dx !== 0) {
    // Moviéndose en X: mirar la columna que se va a ocupar.
    const x0 = dx > 0 ? p.x + hw : p.x + dx - hw;
    const x1 = dx > 0 ? p.x + dx + hw : p.x - hw;
    const top = p.y - hh;
    const bottom = p.y + hh;
    const blockedTop = anySolid(map, x0, top, x1, Math.floor(top) + 1);
    const blockedBottom = anySolid(map, x0, Math.ceil(bottom) - 1, x1, bottom);
    if (blockedTop && !blockedBottom) {
      const overlap = Math.floor(top) + 1 - top; // cuánto entra la caja en la fila de arriba
      if (overlap <= tolerance) return shift(p, 0, Math.min(overlap + SKIN, maxShift), hw, hh, map);
    } else if (blockedBottom && !blockedTop) {
      const overlap = bottom - (Math.ceil(bottom) - 1);
      if (overlap <= tolerance)
        return shift(p, 0, -Math.min(overlap + SKIN, maxShift), hw, hh, map);
    }
    return false;
  }

  const y0 = dy > 0 ? p.y + hh : p.y + dy - hh;
  const y1 = dy > 0 ? p.y + dy + hh : p.y - hh;
  const left = p.x - hw;
  const right = p.x + hw;
  const blockedLeft = anySolid(map, left, y0, Math.floor(left) + 1, y1);
  const blockedRight = anySolid(map, Math.ceil(right) - 1, y0, right, y1);
  if (blockedLeft && !blockedRight) {
    const overlap = Math.floor(left) + 1 - left;
    if (overlap <= tolerance) return shift(p, Math.min(overlap + SKIN, maxShift), 0, hw, hh, map);
  } else if (blockedRight && !blockedLeft) {
    const overlap = right - (Math.ceil(right) - 1);
    if (overlap <= tolerance) return shift(p, -Math.min(overlap + SKIN, maxShift), 0, hw, hh, map);
  }
  return false;
}

/** Desplaza la caja si el sitio nuevo está libre. */
function shift(p: Vec2, sx: number, sy: number, hw: number, hh: number, map: SolidMap): boolean {
  const nx = p.x + sx;
  const ny = p.y + sy;
  if (anySolid(map, nx - hw, ny - hh, nx + hw, ny + hh)) return false;
  p.x = nx;
  p.y = ny;
  return true;
}
