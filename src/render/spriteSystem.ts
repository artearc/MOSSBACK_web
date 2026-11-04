/**
 * Dibuja las entidades con sprite en las capas de entidades, con la posición interpolada con
 * el `alpha` del bucle. Añade el balanceo al caminar y la sombra bajo los pies.
 */

import { lerp } from '../core/math';
import type { WalkBobTuning } from '../data/player';
import type { GameQueries } from '../sim/systems';
import type { EntityBatch } from './entityBatch';
import { EMPTY_GLYPH } from './glyphs';

export interface SpriteTargets {
  readonly actors: EntityBatch;
  readonly sky: EntityBatch;
  readonly shadows: EntityBatch;
}

const SHADOW_COLOR = 0x000000;

export function drawSprites(
  q: GameQueries,
  alpha: number,
  bob: Readonly<WalkBobTuning>,
  targets: SpriteTargets,
): void {
  const list = q.sprites.entities;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as (typeof list)[number];
    const s = e.sprite;
    const prev = e.prevPosition;
    const x = prev ? lerp(prev.x, e.position.x, alpha) : e.position.x;
    const y = prev ? lerp(prev.y, e.position.y, alpha) : e.position.y;

    // Balanceo: un saltito (|sen| de la fase) con algo de estirar y aplastar.
    let hop = 0;
    let stretch = 0;
    const w = e.walk;
    if (w) {
      const phase = lerp(w.prevPhase, w.phase, alpha);
      const amount = lerp(w.prevAmount, w.amount, alpha);
      const h = Math.abs(Math.sin(phase));
      hop = h * bob.height * amount;
      stretch = (h - 0.5) * 2 * bob.squash * amount;
    }
    const scaleY = s.scaleY * (1 + stretch);
    const scaleX = s.scaleX * (1 - stretch * 0.5);

    if (e.shadow) {
      const sh = e.shadow;
      // La sombra se encoge un poco cuando el glifo está en el aire.
      const k = 1 - hop * 1.5;
      targets.shadows.push(
        x,
        y + 0.05,
        sh.scaleX * k,
        sh.scaleY * k,
        0,
        EMPTY_GLYPH,
        SHADOW_COLOR,
        sh.alpha,
        y,
      );
    }

    const target = s.layer === 'sky' ? targets.sky : targets.actors;
    target.push(x, y - s.lift - hop, scaleX, scaleY, s.rotation, s.glyph, s.color, s.alpha, y);
  }
}
