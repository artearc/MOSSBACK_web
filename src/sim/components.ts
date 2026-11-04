/**
 * Componentes del ECS (miniplex). Una entidad es un objeto con los componentes que tenga.
 *
 * Convención de posiciones: en celdas, con decimales. La celda (x, y) ocupa [x, x+1)×[y, y+1).
 * `position` es el centro de los pies de la entidad (lo que colisiona y por lo que se ordena
 * el dibujo); el glifo se dibuja un poco más arriba (`Sprite.lift`).
 */

import type { GlyphId } from '../render/glyphs';
import type { BoxCollider } from './collision';
import type { MovementTuning } from './movement';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Sprite {
  glyph: GlyphId;
  /** 0xRRGGBB. */
  color: number;
  /** Opacidad 0–1. */
  alpha: number;
  scaleX: number;
  scaleY: number;
  /** Radianes. */
  rotation: number;
  /** Cuánto se eleva el centro del glifo sobre los pies, en celdas. */
  lift: number;
  /** Capa de entidades donde se dibuja. */
  layer: 'actors' | 'sky';
}

/** Sombra bajo los pies: una elipse difuminada en la capa de sombras. */
export interface Shadow {
  /** Opacidad 0–1. */
  alpha: number;
  /** Anchura y altura de la sombra, en celdas. */
  scaleX: number;
  scaleY: number;
}

/** Balanceo al caminar: avanza con la distancia recorrida. */
export interface Walk {
  /** Fase del paso (radianes). */
  phase: number;
  prevPhase: number;
  /** 0–1: cuánto se nota el balanceo ahora (sube con la velocidad). */
  amount: number;
  prevAmount: number;
}

/** Deambula sin rumbo (benchmark, fauna de prueba). */
export interface Wander {
  /** Dirección actual (longitud 0–1). */
  dirX: number;
  dirY: number;
  /** Segundos hasta cambiar de dirección. */
  timer: number;
  /** Giro del glifo (rad/s). */
  spin: number;
}

export interface Entity {
  position?: Vec2;
  /** Posición del paso anterior, para interpolar al dibujar. */
  prevPosition?: Vec2;
  velocity?: Vec2;
  /** Aceleración, frenado y velocidad máxima de esta entidad. */
  movement?: MovementTuning;
  collider?: BoxCollider;
  sprite?: Sprite;
  shadow?: Shadow;
  walk?: Walk;
  wander?: Wander;
  /** La controla el jugador. */
  player?: true;
  /** Lo que quiere hacer este paso (lo rellena la entrada o la IA). Longitud 0–1. */
  intent?: Vec2;
}
