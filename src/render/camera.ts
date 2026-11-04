/**
 * Cámara de la rejilla (matemática pura, sin PixiJS).
 *
 * `x`, `y` es la celda (con decimales) que queda en el centro de la vista. El zoom se aplica
 * de forma que cada celda mida un número entero de píxeles físicos: así todas las celdas son
 * iguales y los bordes de los fondos quedan limpios. El MSDF mantiene los glifos nítidos a
 * cualquier tamaño.
 */

import { clamp } from '../core/math';

export interface Viewport {
  /** Tamaño de la vista en píxeles CSS. */
  readonly width: number;
  readonly height: number;
  /** Píxeles físicos por píxel CSS (devicePixelRatio). */
  readonly resolution: number;
}

export interface LayerTransform {
  /** Lado de una celda en píxeles CSS. */
  scale: number;
  /** Posición en pantalla (px CSS) de la esquina de la celda (0, 0). */
  x: number;
  y: number;
}

export interface CameraOptions {
  /** Lado de la celda con zoom 1, en píxeles CSS. */
  readonly baseCellPx: number;
  readonly minZoom: number;
  readonly maxZoom: number;
}

export const DEFAULT_CAMERA: CameraOptions = { baseCellPx: 16, minZoom: 0.25, maxZoom: 6 };

export class Camera {
  x = 0;
  y = 0;
  private zoomValue = 1;
  readonly options: CameraOptions;

  constructor(options: CameraOptions = DEFAULT_CAMERA) {
    this.options = options;
  }

  get zoom(): number {
    return this.zoomValue;
  }

  set zoom(value: number) {
    this.zoomValue = clamp(value, this.options.minZoom, this.options.maxZoom);
  }

  /** Lado de la celda en píxeles CSS, ajustado a un número entero de píxeles físicos. */
  cellPx(resolution: number): number {
    const device = Math.max(1, Math.round(this.options.baseCellPx * this.zoomValue * resolution));
    return device / resolution;
  }

  /**
   * Transformación de una capa. `parallax` 1 = se mueve con la cámara; < 1 = más lejos. El
   * desplazamiento se redondea al píxel físico para que nada vibre al mover la cámara.
   */
  layerTransform(view: Viewport, parallax: number, out: LayerTransform): LayerTransform {
    const scale = this.cellPx(view.resolution);
    const snap = (v: number): number => Math.round(v * view.resolution) / view.resolution;
    out.scale = scale;
    out.x = snap(view.width / 2 - this.x * parallax * scale);
    out.y = snap(view.height / 2 - this.y * parallax * scale);
    return out;
  }

  /** Celda (con decimales) bajo un punto de la pantalla, para la capa con parallax 1. */
  screenToCell(view: Viewport, sx: number, sy: number): { x: number; y: number } {
    const t = this.layerTransform(view, 1, { scale: 0, x: 0, y: 0 });
    return { x: (sx - t.x) / t.scale, y: (sy - t.y) / t.scale };
  }

  /** Cambia el zoom manteniendo fija la celda que hay bajo (sx, sy). */
  zoomAt(view: Viewport, factor: number, sx: number, sy: number): void {
    const before = this.screenToCell(view, sx, sy);
    this.zoom = this.zoomValue * factor;
    const after = this.screenToCell(view, sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }
}
