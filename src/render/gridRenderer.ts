/**
 * Renderizador de la rejilla ASCII (PixiJS v8, WebGL2).
 *
 * Una draw call por capa. Cada capa tiene su textura de datos (ver `GridLayer`); todas
 * comparten el atlas MSDF y la tabla de glifos. Solo se suben a la GPU los tramos de celdas
 * que han cambiado desde el último frame.
 */

import {
  BufferImageSource,
  Container,
  Mesh,
  MeshGeometry,
  Shader,
  UniformGroup,
  type TextureSource,
} from 'pixi.js';
import type { Camera, LayerTransform, Viewport } from './camera';
import { GLYPH_FLOATS, type GlyphTable } from './glyphs';
import { GridLayer, TEXELS_PER_CELL } from './gridLayer';
import { gridFragment, gridVertex } from './gridShader';

export interface GridLayerSpec {
  readonly name: string;
  /** 1 = se mueve con la cámara; < 1 = más lejos (parallax). Por defecto 1. */
  readonly parallax?: number;
  /** Opacidad de toda la capa. Por defecto 1. */
  readonly alpha?: number;
}

export interface GridRendererOptions {
  readonly cols: number;
  readonly rows: number;
  readonly glyphs: GlyphTable;
  /** Textura del atlas MSDF (filtro lineal, sin mipmaps, sin premultiplicar). */
  readonly atlas: TextureSource;
  /** De abajo arriba. */
  readonly layers: readonly GridLayerSpec[];
}

/** Estadísticas del último `sync`. Se reutiliza el objeto. */
export interface GridSyncStats {
  uploadedTexels: number;
  uploadCalls: number;
  drawCalls: number;
}

interface LayerEntry {
  readonly name: string;
  readonly layer: GridLayer;
  readonly source: BufferImageSource;
  readonly mesh: Mesh<MeshGeometry, Shader>;
  readonly upload: (start: number, end: number) => void;
  parallax: number;
}

export class GridRenderer {
  /** Añádelo al stage. */
  readonly container = new Container();
  readonly glyphs: GlyphTable;
  readonly cols: number;
  readonly rows: number;
  readonly stats: GridSyncStats = { uploadedTexels: 0, uploadCalls: 0, drawCalls: 0 };
  private readonly entries: LayerEntry[] = [];
  private readonly byName = new Map<string, LayerEntry>();
  /** Tabla de glifos en la GPU; la comparten las capas de entidades. */
  readonly glyphSource: BufferImageSource;
  private readonly transform: LayerTransform = { scale: 1, x: 0, y: 0 };

  constructor(options: GridRendererOptions) {
    const { cols, rows, glyphs, atlas } = options;
    this.cols = cols;
    this.rows = rows;
    this.glyphs = glyphs;

    this.glyphSource = new BufferImageSource({
      resource: glyphs.gpuData,
      width: GLYPH_FLOATS / 4,
      height: glyphs.count,
      format: 'rgba32float',
      scaleMode: 'nearest',
      // Son números, no colores: premultiplicar multiplicaría los uv por el cuarto valor.
      alphaMode: 'no-premultiply-alpha',
      autoGenerateMipmaps: false,
    });

    // Un rectángulo en coordenadas de celda; la cámara lo escala y lo coloca.
    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, cols, 0, cols, rows, 0, rows]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    });

    for (const spec of options.layers) {
      if (this.byName.has(spec.name)) throw new Error(`Capa repetida: ${spec.name}`);
      const layer = new GridLayer(cols, rows);
      const source = new BufferImageSource({
        resource: layer.data,
        width: cols * TEXELS_PER_CELL,
        height: rows,
        format: 'rgba8unorm',
        scaleMode: 'nearest',
        alphaMode: 'no-premultiply-alpha',
        autoGenerateMipmaps: false,
      });
      const shader = Shader.from({
        gl: { vertex: gridVertex, fragment: gridFragment, name: 'mossback-grid' },
        resources: {
          uCells: source,
          uGlyphs: this.glyphSource,
          uAtlas: atlas,
          gridUniforms: new UniformGroup({
            uGridSize: { value: new Float32Array([cols, rows]), type: 'vec2<f32>' },
            uAtlasSize: {
              value: new Float32Array([glyphs.atlasWidth, glyphs.atlasHeight]),
              type: 'vec2<f32>',
            },
            uDistanceRange: { value: glyphs.distanceRange, type: 'f32' },
          }),
        },
      });
      const mesh = new Mesh({ geometry, shader });
      mesh.alpha = spec.alpha ?? 1;
      mesh.label = `grid:${spec.name}`;
      this.container.addChild(mesh);

      // Todo el contenido inicial se sube al crear la textura en la GPU.
      layer.collectDirtyRanges(() => undefined);
      const entry: LayerEntry = {
        name: spec.name,
        layer,
        source,
        mesh,
        parallax: spec.parallax ?? 1,
        // Se crea una vez por capa para no reservar memoria en cada frame.
        upload: (start, end) => {
          source.update(start, end);
          this.stats.uploadCalls++;
        },
      };
      this.entries.push(entry);
      this.byName.set(spec.name, entry);
    }
  }

  /** Datos de una capa, para escribir celdas. */
  layer(name: string): GridLayer {
    const entry = this.byName.get(name);
    if (!entry) throw new Error(`Capa desconocida: ${name}`);
    return entry.layer;
  }

  /**
   * Objeto de PixiJS de una capa. Sirve para intercalar capas de rejilla y de entidades en
   * otro contenedor (al añadirlo a otro, PixiJS lo saca de `container`).
   */
  mesh(name: string): Mesh<MeshGeometry, Shader> {
    const entry = this.byName.get(name);
    if (!entry) throw new Error(`Capa desconocida: ${name}`);
    return entry.mesh;
  }

  setLayerVisible(name: string, visible: boolean): void {
    const entry = this.byName.get(name);
    if (entry) entry.mesh.visible = visible;
  }

  isLayerVisible(name: string): boolean {
    return this.byName.get(name)?.mesh.visible ?? false;
  }

  get layerNames(): readonly string[] {
    return this.entries.map((e) => e.name);
  }

  /**
   * Coloca las capas según la cámara y sube a la GPU las celdas cambiadas. Llamar una vez por
   * frame, justo antes de `app.render()`.
   */
  sync(camera: Camera, view: Viewport): GridSyncStats {
    const stats = this.stats;
    stats.uploadedTexels = 0;
    stats.uploadCalls = 0;
    stats.drawCalls = 0;
    for (const entry of this.entries) {
      const t = camera.layerTransform(view, entry.parallax, this.transform);
      entry.mesh.position.set(t.x, t.y);
      entry.mesh.scale.set(t.scale);
      if (entry.mesh.visible) stats.drawCalls++;

      stats.uploadedTexels += entry.layer.collectDirtyRanges(entry.upload);
    }
    return stats;
  }

  destroy(): void {
    this.container.destroy({ children: true });
    for (const e of this.entries) e.source.destroy();
    this.glyphSource.destroy();
  }
}
