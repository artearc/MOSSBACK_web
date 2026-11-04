/**
 * Panel de ajuste en vivo (solo desarrollo). Se carga con import() dinámico para que
 * Tweakpane no entre en el build de producción.
 *
 * Los valores se recuerdan en localStorage (comodidad de desarrollo; si falla, se ignora).
 * «Copiar valores» deja en el portapapeles el objeto listo para pegar en src/data/player.ts.
 */

import { DEFAULT_PLAYER_TUNING, type PlayerTuning } from '../data/player';

const STORAGE_KEY = 'mossback.playerTuning.v1';

/** Copia en `target` los valores de `source` que existen en `target` y son del mismo tipo. */
export function mergeKnown(target: Record<string, unknown>, source: unknown): void {
  if (typeof source !== 'object' || source === null) return;
  const src = source as Record<string, unknown>;
  for (const key of Object.keys(target)) {
    const t = target[key];
    const s = src[key];
    if (typeof t === 'object' && t !== null) mergeKnown(t as Record<string, unknown>, s);
    else if (typeof s === typeof t && (typeof s !== 'number' || Number.isFinite(s)))
      target[key] = s;
  }
}

/** Aplica los valores guardados (si los hay) sobre `tuning`. */
export function loadSavedTuning(tuning: PlayerTuning): void {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) mergeKnown(tuning as unknown as Record<string, unknown>, JSON.parse(raw));
  } catch {
    // Sin almacenamiento o datos corruptos: se usan los valores por defecto.
  }
}

function save(tuning: PlayerTuning): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tuning));
  } catch {
    // No pasa nada: solo se pierde recordar los valores.
  }
}

export interface TweaksHandle {
  dispose(): void;
}

export async function createTweaks(tuning: PlayerTuning): Promise<TweaksHandle> {
  const { Pane } = await import('tweakpane');
  const pane = new Pane({ title: 'Ajustes (F2)', expanded: true });
  pane.element.parentElement?.style.setProperty('z-index', '20');

  const move = pane.addFolder({ title: 'Movimiento' });
  move.addBinding(tuning.movement, 'maxSpeed', {
    label: 'vel. máx (c/s)',
    min: 1,
    max: 15,
    step: 0.1,
  });
  move.addBinding(tuning.movement, 'acceleration', {
    label: 'aceleración',
    min: 1,
    max: 200,
    step: 1,
  });
  move.addBinding(tuning.movement, 'deceleration', { label: 'frenado', min: 1, max: 200, step: 1 });
  move.addBinding(tuning.movement, 'turnAcceleration', {
    label: 'giro',
    min: 1,
    max: 300,
    step: 1,
  });
  move.addBinding(tuning.movement, 'verticalFactor', {
    label: 'factor vertical',
    min: 0.5,
    max: 1.2,
    step: 0.01,
  });
  move.addBinding(tuning, 'deadzone', { label: 'zona muerta stick', min: 0, max: 0.6, step: 0.01 });

  const col = pane.addFolder({ title: 'Colisión', expanded: false });
  col.addBinding(tuning.collider, 'halfWidth', {
    label: 'media anchura',
    min: 0.1,
    max: 0.49,
    step: 0.01,
  });
  col.addBinding(tuning.collider, 'halfHeight', {
    label: 'media altura',
    min: 0.05,
    max: 0.49,
    step: 0.01,
  });
  col.addBinding(tuning, 'cornerTolerance', {
    label: 'tolerancia esquinas',
    min: 0,
    max: 0.5,
    step: 0.01,
  });

  const cam = pane.addFolder({ title: 'Cámara', expanded: false });
  cam.addBinding(tuning.camera, 'followRate', {
    label: 'seguimiento',
    min: 0.5,
    max: 30,
    step: 0.1,
  });
  cam.addBinding(tuning.camera, 'lookAhead', { label: 'adelanto (c)', min: 0, max: 5, step: 0.1 });
  cam.addBinding(tuning.camera, 'lookAheadRate', {
    label: 'suav. adelanto',
    min: 0.2,
    max: 20,
    step: 0.1,
  });

  const look = pane.addFolder({ title: 'Aspecto', expanded: false });
  look.addBinding(tuning.bob, 'height', { label: 'saltito (c)', min: 0, max: 0.3, step: 0.005 });
  look.addBinding(tuning.bob, 'squash', {
    label: 'estirar/aplastar',
    min: 0,
    max: 0.3,
    step: 0.005,
  });
  look.addBinding(tuning.bob, 'stepsPerCell', {
    label: 'pasos por celda',
    min: 0.5,
    max: 4,
    step: 0.05,
  });
  look.addBinding(tuning, 'spriteLift', { label: 'elevación glifo', min: 0, max: 0.6, step: 0.01 });
  look.addBinding(tuning.shadow, 'alpha', { label: 'sombra opacidad', min: 0, max: 1, step: 0.01 });
  look.addBinding(tuning.shadow, 'scaleX', {
    label: 'sombra ancho',
    min: 0.2,
    max: 1.5,
    step: 0.01,
  });
  look.addBinding(tuning.shadow, 'scaleY', { label: 'sombra alto', min: 0.1, max: 1, step: 0.01 });
  look.addBinding(tuning.shadow, 'softness', {
    label: 'sombra suavidad',
    min: 0,
    max: 1,
    step: 0.01,
  });
  look.addBinding(tuning, 'snapToPixel', { label: 'ajustar al píxel' });

  pane.addButton({ title: 'Copiar valores' }).on('click', () => {
    const text = JSON.stringify(tuning, null, 2);
    navigator.clipboard?.writeText(text).catch(() => console.info(text));
  });
  pane.addButton({ title: 'Restablecer' }).on('click', () => {
    mergeKnown(
      tuning as unknown as Record<string, unknown>,
      structuredClone(DEFAULT_PLAYER_TUNING),
    );
    pane.refresh();
    save(tuning);
  });
  pane.on('change', () => save(tuning));

  const onKey = (e: KeyboardEvent): void => {
    if (e.code !== 'F2') return;
    e.preventDefault();
    pane.hidden = !pane.hidden;
  };
  window.addEventListener('keydown', onKey);

  return {
    dispose(): void {
      window.removeEventListener('keydown', onKey);
      pane.dispose();
    },
  };
}
