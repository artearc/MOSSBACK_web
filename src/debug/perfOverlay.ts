/**
 * Overlay de rendimiento (solo desarrollo). Texto DOM por encima del canvas: es una
 * herramienta de depuración, no parte del mundo de juego. F3 lo muestra u oculta.
 */

import type { FrameStats } from '../core/loop';

/** Cada cuánto se refresca el texto (ms). Más a menudo solo añade ruido y trabajo al DOM. */
const REFRESH_MS = 250;

export interface PerfOverlayOptions {
  readonly backend: string;
  readonly stepHz: number;
  /** Líneas extra fijas (leyendas, ayudas). */
  readonly notes?: readonly string[];
  /** Líneas que cambian; se piden en cada refresco del texto, no en cada frame. */
  readonly live?: () => string;
}

export interface PerfOverlay {
  frame(stats: Readonly<FrameStats>): void;
  destroy(): void;
}

export function createPerfOverlay(parent: HTMLElement, options: PerfOverlayOptions): PerfOverlay {
  const el = document.createElement('pre');
  Object.assign(el.style, {
    position: 'fixed',
    top: '8px',
    left: '8px',
    margin: '0',
    padding: '6px 8px',
    font: '12px/1.4 ui-monospace, Consolas, monospace',
    color: '#d8e6d0',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '4px',
    pointerEvents: 'none',
    zIndex: '10',
    whiteSpace: 'pre',
  } satisfies Partial<CSSStyleDeclaration>);
  parent.appendChild(el);

  const footer = [...(options.notes ?? []), 'F3: ocultar overlay'].join('\n');

  // Acumuladores de la ventana actual.
  let windowStart = -1;
  let frames = 0;
  let sumFrameMs = 0;
  let maxFrameMs = 0;
  let sumSteps = 0;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'F3') return;
    event.preventDefault();
    el.hidden = !el.hidden;
  };
  window.addEventListener('keydown', onKeyDown);

  return {
    frame(stats: Readonly<FrameStats>): void {
      if (windowStart < 0) windowStart = stats.now;
      frames++;
      sumFrameMs += stats.frameMs;
      sumSteps += stats.steps;
      if (stats.frameMs > maxFrameMs) maxFrameMs = stats.frameMs;

      const elapsed = stats.now - windowStart;
      if (elapsed < REFRESH_MS) return;

      const fps = (frames * 1000) / elapsed;
      el.dataset['fps'] = fps.toFixed(1);
      if (!el.hidden) {
        el.textContent =
          `FPS        ${fps.toFixed(0)}\n` +
          `frame      ${(sumFrameMs / frames).toFixed(2)} ms (máx ${maxFrameMs.toFixed(1)})\n` +
          `sim        ${options.stepHz} Hz · ${(sumSteps / frames).toFixed(2)} pasos/frame\n` +
          `render     ${options.backend}\n` +
          (options.live ? `${options.live()}\n` : '') +
          footer;
      }

      windowStart = stats.now;
      frames = 0;
      sumFrameMs = 0;
      maxFrameMs = 0;
      sumSteps = 0;
    },
    destroy(): void {
      window.removeEventListener('keydown', onKeyDown);
      el.remove();
    },
  };
}
