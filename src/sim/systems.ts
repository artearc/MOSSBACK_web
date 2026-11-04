/**
 * Sistemas del ECS. No guardan estado propio: todo lo que necesitan llega por parámetro o
 * está en los componentes. Se recorren los arrays de las queries con índices para no reservar
 * memoria en cada paso.
 */

import type { World } from 'miniplex';
import type { MoveInput } from '../core/input';
import type { Rng } from '../core/rng';
import type { WalkBobTuning } from '../data/player';
import { moveAndCollide, type MoveResult, type SolidMap } from './collision';
import type { Entity } from './components';
import { steerVelocity } from './movement';

export type GameWorld = World<Entity>;

/** Queries del juego. Se crean una vez (crearlas en cada paso reservaría memoria). */
export function createQueries(world: GameWorld) {
  return {
    players: world.with('player', 'intent'),
    wanderers: world.with('wander', 'intent', 'sprite'),
    movers: world.with('position', 'prevPosition', 'velocity', 'movement', 'intent'),
    walkers: world.with('walk', 'position', 'prevPosition', 'movement'),
    sprites: world.with('position', 'sprite'),
  };
}

export type GameQueries = ReturnType<typeof createQueries>;

/** Copia la acción `move` de la entrada en el `intent` de las entidades del jugador. */
export function playerIntentSystem(q: GameQueries, move: Readonly<MoveInput>): void {
  const players = q.players.entities;
  for (let i = 0; i < players.length; i++) {
    const e = players[i] as (typeof players)[number];
    e.intent.x = move.x;
    e.intent.y = move.y;
  }
}

/** Deambular: cambia de dirección cada cierto tiempo y gira el glifo. */
export function wanderSystem(q: GameQueries, rng: Rng, dt: number): void {
  const list = q.wanderers.entities;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as (typeof list)[number];
    const w = e.wander;
    w.timer -= dt;
    if (w.timer <= 0) {
      w.timer = rng.range(0.6, 2.5);
      if (rng.chance(0.25)) {
        w.dirX = 0;
        w.dirY = 0;
      } else {
        const angle = rng.range(0, Math.PI * 2);
        const speed = rng.range(0.4, 1);
        w.dirX = Math.cos(angle) * speed;
        w.dirY = Math.sin(angle) * speed;
      }
    }
    e.intent.x = w.dirX;
    e.intent.y = w.dirY;
    e.sprite.rotation += w.spin * dt;
  }
}

/**
 * Movimiento: guarda la posición anterior (para interpolar), ajusta la velocidad hacia el
 * `intent` y mueve con colisiones. Al chocar, se anula la velocidad en ese eje.
 */
export function movementSystem(
  q: GameQueries,
  map: SolidMap,
  cornerTolerance: number,
  dt: number,
  scratch: MoveResult,
): void {
  const list = q.movers.entities;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as (typeof list)[number];
    e.prevPosition.x = e.position.x;
    e.prevPosition.y = e.position.y;
    steerVelocity(e.velocity, e.intent, e.movement, dt);
    const dx = e.velocity.x * dt;
    const dy = e.velocity.y * dt;
    if (dx === 0 && dy === 0) continue;
    if (e.collider) {
      moveAndCollide(e.position, e.collider, dx, dy, map, cornerTolerance, scratch);
      if (scratch.blockedX) e.velocity.x = 0;
      if (scratch.blockedY) e.velocity.y = 0;
    } else {
      e.position.x += dx;
      e.position.y += dy;
    }
  }
}

/** Balanceo al caminar: la fase avanza con la distancia recorrida en este paso. */
export function walkSystem(q: GameQueries, bob: Readonly<WalkBobTuning>, dt: number): void {
  const list = q.walkers.entities;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as (typeof list)[number];
    const w = e.walk;
    w.prevPhase = w.phase;
    w.prevAmount = w.amount;
    const moved = Math.hypot(e.position.x - e.prevPosition.x, e.position.y - e.prevPosition.y);
    // Un paso = medio ciclo del seno (el saltito usa |sen|).
    w.phase += moved * bob.stepsPerCell * Math.PI;
    const speedRatio = dt > 0 ? Math.min(moved / dt / e.movement.maxSpeed, 1) : 0;
    // El balanceo entra y sale suave en vez de cortarse de golpe al parar.
    w.amount += (speedRatio - w.amount) * Math.min(dt * 12, 1);
    if (w.amount < 0.01 && speedRatio === 0) {
      // Parado: llevar la fase al reposo más cercano para que el siguiente paso empiece limpio.
      w.phase = Math.round(w.phase / Math.PI) * Math.PI;
      w.prevPhase = w.phase;
    }
  }
}
