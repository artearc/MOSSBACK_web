import { describe, expect, it } from 'vitest';
import { moveAndCollide, type MoveResult, type SolidMap } from './collision';
import type { Vec2 } from './components';

/** Mapa a partir de texto: '#' sólido, '.' libre. */
function mapFrom(rows: string[]): SolidMap {
  return {
    cols: rows[0]?.length ?? 0,
    rows: rows.length,
    isSolid: (x, y) => {
      const row = rows[y];
      if (row === undefined || x < 0 || x >= row.length) return true;
      return row[x] === '#';
    },
  };
}

const box = { halfWidth: 0.3, halfHeight: 0.2 };
const result = (): MoveResult => ({ blockedX: false, blockedY: false });

/** Mueve en pasos pequeños (como el juego) y devuelve la posición final. */
function walk(map: SolidMap, from: Vec2, dx: number, dy: number, steps: number, tol = 0.35): Vec2 {
  const p = { ...from };
  const r = result();
  for (let i = 0; i < steps; i++) moveAndCollide(p, box, dx, dy, map, tol, r);
  return p;
}

describe('moveAndCollide', () => {
  const room = mapFrom(['#######', '#.....#', '#.....#', '#.....#', '#######']);

  it('se mueve libremente donde no hay nada', () => {
    const p = { x: 2.5, y: 2.5 };
    const r = moveAndCollide(p, box, 0.1, -0.1, room, 0, result());
    expect(p).toEqual({ x: 2.6, y: 2.4 });
    expect(r).toEqual({ blockedX: false, blockedY: false });
  });

  it('se para pegado a la pared sin atravesarla', () => {
    const p = walk(room, { x: 3.5, y: 2.5 }, 0.09, 0, 60);
    expect(p.x).toBeCloseTo(6 - 0.3, 3);
    expect(p.x).toBeLessThan(6 - 0.3);
    const r = moveAndCollide(p, box, 0.09, 0, room, 0, result());
    expect(r.blockedX).toBe(true);
  });

  it('se desliza por la pared al moverse en diagonal', () => {
    // Contra la pared de arriba, moviéndose hacia arriba y a la derecha.
    const p = walk(room, { x: 2.5, y: 1.5 }, 0.05, -0.05, 20);
    expect(p.y).toBeCloseTo(1 + 0.2, 3);
    expect(p.x).toBeCloseTo(3.5, 5); // el eje libre avanza entero
  });

  it('no atraviesa paredes de una celda a velocidad máxima', () => {
    const wall = mapFrom(['.....', '..#..', '.....']);
    const p = walk(wall, { x: 0.5, y: 1.5 }, 0.09, 0, 100, 0);
    expect(p.x).toBeLessThan(2 - 0.3 + 1e-6);
  });

  describe('esquinas', () => {
    // Puerta de una celda en x = 2.
    const door = mapFrom(['#####', '##.##', '.....', '.....']);

    it('entra por la puerta aunque llegue algo desviado', () => {
      const p = walk(door, { x: 2.75, y: 3.5 }, 0, -0.09, 40);
      expect(p.y).toBeLessThan(2);
      expect(p.x).toBeLessThanOrEqual(3 - 0.3);
      const q = walk(door, { x: 2.25, y: 3.5 }, 0, -0.09, 40);
      expect(q.y).toBeLessThan(2);
      expect(q.x).toBeGreaterThanOrEqual(2 + 0.3);
    });

    it('sin tolerancia se engancha en el marco', () => {
      const p = walk(door, { x: 2.75, y: 3.5 }, 0, -0.09, 40, 0);
      expect(p.y).toBeCloseTo(2 + 0.2, 3);
    });

    it('si el desvío es grande, se queda contra la pared', () => {
      const p = walk(door, { x: 3.2, y: 3.5 }, 0, -0.09, 40);
      expect(p.y).toBeCloseTo(2 + 0.2, 3);
    });
  });

  it('fuera del mapa todo es sólido', () => {
    const open = mapFrom(['...']);
    const p = walk(open, { x: 1.5, y: 0.5 }, -0.09, 0, 40);
    expect(p.x).toBeCloseTo(0.3, 3);
  });
});
