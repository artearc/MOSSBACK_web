/**
 * Escena de prueba de rendimiento de la rejilla (solo desarrollo).
 *
 * Tres capas del tamaño de la rejilla; cada frame cambian todas las celdas del suelo, una
 * parte de los objetos y una franja de efectos. Controles:
 *   rueda: zoom · WASD / flechas: mover · 1 2 3: mostrar/ocultar capas · 0: recentrar
 */

import { lerp } from '../core/math';
import { createRng } from '../core/rng';
import { Camera, type Viewport } from '../render/camera';
import type { GlyphId } from '../render/glyphs';
import { TRANSPARENT, type GridLayer } from '../render/gridLayer';
import type { GridRenderer } from '../render/gridRenderer';

const PAN_CELLS_PER_S = 40;
const WHEEL_ZOOM_STEP = 1.15;

export interface GridStressScene {
  readonly camera: Camera;
  update(dt: number): void;
  /** Cambia las celdas del frame y coloca la cámara interpolada. */
  render(alpha: number, timeSeconds: number): void;
  describe(): string;
  destroy(): void;
}

export function createGridStressScene(
  grid: GridRenderer,
  canvas: HTMLCanvasElement,
  getView: () => Viewport,
): GridStressScene {
  const { cols, rows, glyphs } = grid;
  const ground = grid.layer('ground');
  const objects = grid.layer('objects');
  const fx = grid.layer('fx');

  const ids = (chars: string): GlyphId[] => [...chars].map((c) => glyphs.id(c));
  const groundGlyphs = ids('.,\'`"·∙:;░');
  const plantGlyphs = ids('♣♠τ¥Γ¶↑Φ');
  const fxGlyphs = ids('░▒▓▒░');

  // Objetos colocados con el RNG con semilla: misma escena en cada recarga.
  const rng = createRng('grid-stress');
  // Muestra fija de cajas y bloques, para ver que encajan sin costuras al hacer zoom.
  const sample = [
    '╔══════════════╗',
    '║ █▓▒░ ▀▄▌▐ ── ║',
    '║ ┌──┬──┐ ░░░░ ║',
    '║ ├──┼──┤ ▓▓▓▓ ║',
    '║ └──┴──┘ ████ ║',
    '╚══════════════╝',
  ];
  const sampleX = 2;
  const sampleY = 4;
  sample.forEach((line, i) => {
    objects.print(glyphs, sampleX, sampleY + i, line, 0xe8dcb5, 0x2a2f2a);
  });
  const inSample = (x: number, y: number): boolean =>
    x >= sampleX && x < sampleX + 16 && y >= sampleY && y < sampleY + sample.length;

  const plantCells: number[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (rng.chance(0.12) && !inSample(x, y)) plantCells.push(y * cols + x);
    }
  }

  const camera = new Camera();
  // Cámara: estado anterior y actual del paso fijo, para interpolar al dibujar.
  let camX = cols / 2;
  let camY = rows / 2;
  let prevCamX = camX;
  let prevCamY = camY;
  const fitZoom = (): void => {
    const view = getView();
    camera.zoom = Math.min(view.width / cols, view.height / rows) / camera.options.baseCellPx;
  };
  fitZoom();

  const held = new Set<string>();
  const onKeyDown = (e: KeyboardEvent): void => {
    held.add(e.code);
    const layerIndex = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    const name = grid.layerNames[layerIndex];
    if (name !== undefined) grid.setLayerVisible(name, !grid.isLayerVisible(name));
    if (e.code === 'Digit0') {
      camX = prevCamX = cols / 2;
      camY = prevCamY = rows / 2;
      fitZoom();
    }
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    held.delete(e.code);
  };
  const onBlur = (): void => held.clear();
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    camera.x = camX;
    camera.y = camY;
    camera.zoomAt(
      getView(),
      e.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP,
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
    camX = prevCamX = camera.x;
    camY = prevCamY = camera.y;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const axis = (neg: string[], pos: string[]): number =>
    (pos.some((k) => held.has(k)) ? 1 : 0) - (neg.some((k) => held.has(k)) ? 1 : 0);

  let frame = 0;

  const paintGround = (layer: GridLayer, t: number): void => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const w =
          Math.sin(x * 0.11 + t * 1.3) +
          Math.sin(y * 0.17 - t * 0.9) +
          Math.sin((x + y) * 0.05 + t * 0.4);
        const k = (w + 3) / 6; // 0..1
        const g = groundGlyphs[(x * 7 + y * 13 + frame) % groundGlyphs.length] as GlyphId;
        const bgR = 28 + k * 40;
        const bgG = 40 + k * 55;
        const bgB = 24 + k * 20;
        const bg = (bgR << 16) | (bgG << 8) | bgB;
        const fg = ((bgR + 60) << 16) | ((bgG + 70) << 8) | (bgB + 40);
        layer.set(x, y, g, fg, bg);
      }
    }
  };

  const paintObjects = (layer: GridLayer, t: number): void => {
    // Cada frame cambia una de cada cuatro plantas (las demás se quedan como estaban).
    for (let i = frame & 3; i < plantCells.length; i += 4) {
      const cell = plantCells[i] as number;
      const x = cell % cols;
      const y = (cell / cols) | 0;
      const sway = Math.sin(t * 2 + x * 0.3 + y * 0.2);
      const g = plantGlyphs[(cell + (sway > 0.6 ? 1 : 0)) % plantGlyphs.length] as GlyphId;
      const green = 150 + ((sway * 60) | 0);
      layer.set(x, y, g, (60 << 16) | (green << 8) | 70, TRANSPARENT);
    }
  };

  let lastBand = -1;
  const paintFx = (layer: GridLayer, t: number): void => {
    // Franja diagonal que barre la rejilla. Se borra la anterior y se pinta la nueva.
    const span = cols + rows;
    const band = Math.floor((t * 30) % span);
    if (lastBand >= 0) drawBand(layer, lastBand, true);
    drawBand(layer, band, false);
    lastBand = band;
    layer.print(
      glyphs,
      2,
      1,
      ` MOSSBACK · rejilla ${cols}×${rows} · frame ${frame} `,
      0xf2ead3,
      0x1d2420,
    );
  };

  const drawBand = (layer: GridLayer, band: number, erase: boolean): void => {
    // Cada glifo de la franja ocupa 2 columnas; las 3 primeras filas son para el rótulo.
    for (let i = 0; i < fxGlyphs.length; i++) {
      const g = fxGlyphs[i] as GlyphId;
      for (let y = 3; y < rows; y++) {
        const x = band - i * 2 - y;
        for (let dx = 0; dx < 2; dx++) {
          if (erase) layer.clear(x + dx, y);
          else layer.set(x + dx, y, g, 0xdff3ff, TRANSPARENT);
        }
      }
    }
  };

  return {
    camera,
    update(dt: number): void {
      prevCamX = camX;
      prevCamY = camY;
      const speed = (PAN_CELLS_PER_S * dt) / Math.max(camera.zoom, 0.5);
      camX += axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']) * speed;
      camY += axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']) * speed;
    },
    render(alpha: number, timeSeconds: number): void {
      frame++;
      paintGround(ground, timeSeconds);
      paintObjects(objects, timeSeconds);
      paintFx(fx, timeSeconds);
      camera.x = lerp(prevCamX, camX, alpha);
      camera.y = lerp(prevCamY, camY, alpha);
    },
    describe(): string {
      const visible = grid.layerNames.map((n, i) =>
        grid.isLayerVisible(n) ? `${i + 1}:${n}` : `${i + 1}:—`,
      );
      return `zoom       ${camera.zoom.toFixed(2)} · celda ${camera.cellPx(getView().resolution).toFixed(1)} px\ncapas      ${visible.join(' ')}`;
    },
    destroy(): void {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
}
