import { describe, expect, it } from 'vitest';
import { Camera, type Viewport } from './camera';

const view: Viewport = { width: 800, height: 600, resolution: 1 };
const hiDpi: Viewport = { width: 800, height: 600, resolution: 1.5 };

describe('Camera', () => {
  it('las celdas miden un número entero de píxeles físicos', () => {
    const camera = new Camera({ baseCellPx: 16, minZoom: 0.1, maxZoom: 10 });
    for (const zoom of [0.33, 0.5, 1, 1.37, 2.71]) {
      camera.zoom = zoom;
      const device = camera.cellPx(hiDpi.resolution) * hiDpi.resolution;
      expect(device).toBeCloseTo(Math.round(device), 9);
      expect(device).toBeGreaterThanOrEqual(1);
    }
  });

  it('limita el zoom', () => {
    const camera = new Camera({ baseCellPx: 16, minZoom: 0.5, maxZoom: 4 });
    camera.zoom = 100;
    expect(camera.zoom).toBe(4);
    camera.zoom = 0;
    expect(camera.zoom).toBe(0.5);
  });

  it('centra la celda de la cámara y ajusta el desplazamiento al píxel', () => {
    const camera = new Camera({ baseCellPx: 10, minZoom: 1, maxZoom: 1 });
    camera.x = 10.33;
    camera.y = 5;
    const t = camera.layerTransform(hiDpi, 1, { scale: 0, x: 0, y: 0 });
    expect(t.scale * hiDpi.resolution).toBe(15);
    expect((t.x * hiDpi.resolution) % 1).toBeCloseTo(0, 9);
    const center = camera.screenToCell(hiDpi, 400, 300);
    expect(center.x).toBeCloseTo(10.33, 1);
    expect(center.y).toBeCloseTo(5, 1);
  });

  it('el parallax mueve las capas lejanas más despacio', () => {
    const camera = new Camera({ baseCellPx: 10, minZoom: 1, maxZoom: 1 });
    const near = camera.layerTransform(view, 1, { scale: 0, x: 0, y: 0 }).x;
    const far = camera.layerTransform(view, 0.5, { scale: 0, x: 0, y: 0 }).x;
    camera.x = 20;
    expect(near - camera.layerTransform(view, 1, { scale: 0, x: 0, y: 0 }).x).toBe(200);
    expect(far - camera.layerTransform(view, 0.5, { scale: 0, x: 0, y: 0 }).x).toBe(100);
  });

  it('zoomAt mantiene fija la celda bajo el cursor', () => {
    const camera = new Camera({ baseCellPx: 16, minZoom: 0.1, maxZoom: 10 });
    camera.x = 50;
    camera.y = 30;
    const before = camera.screenToCell(view, 123, 456);
    camera.zoomAt(view, 2.5, 123, 456);
    const after = camera.screenToCell(view, 123, 456);
    // El ajuste al píxel deja un error de menos de un píxel.
    const tolerance = 1 / camera.cellPx(view.resolution);
    expect(Math.abs(after.x - before.x)).toBeLessThan(tolerance);
    expect(Math.abs(after.y - before.y)).toBeLessThan(tolerance);
  });
});
