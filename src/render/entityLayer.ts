/**
 * Capa de entidades (PixiJS v8, WebGL2): glifos que se mueven libremente, sin rejilla.
 *
 * Todas las entidades de la capa se dibujan en una sola draw call con quads instanciados.
 * Reutiliza el atlas MSDF y la tabla de glifos de la rejilla. Los datos se escriben cada frame
 * con `batch` (ver `EntityBatch`) y se suben en `sync`.
 */

import {
  Buffer,
  BufferUsage,
  Geometry,
  Mesh,
  Shader,
  UniformGroup,
  type TextureSource,
} from 'pixi.js';
import type { Camera, LayerTransform, Viewport } from './camera';
import { EntityBatch, INSTANCE_BYTES } from './entityBatch';
import { entityFragment, entityVertex } from './entityShader';
import type { GlyphTable } from './glyphs';

export interface EntityLayerOptions {
  readonly name: string;
  readonly glyphs: GlyphTable;
  /** Textura de la tabla de glifos (la misma que usa la rejilla). */
  readonly glyphSource: TextureSource;
  readonly atlas: TextureSource;
  readonly parallax?: number;
  readonly alpha?: number;
  readonly initialCapacity?: number;
  /**
   * `glyph`: cada instancia dibuja su glifo. `softEllipse`: dibuja una elipse difuminada del
   * tamaño de su escala, sin glifo (sombras).
   */
  readonly shape?: 'glyph' | 'softEllipse';
  /** Difuminado del borde de la elipse (0 = nítido, 1 = todo difuminado). */
  readonly softness?: number;
}

export class EntityLayer {
  readonly name: string;
  readonly batch: EntityBatch;
  readonly mesh: Mesh<Geometry, Shader>;
  parallax: number;
  /** Ajustar el centro de cada entidad al píxel físico. */
  snapToPixel = true;
  /** Bytes subidos en el último `sync`. */
  uploadedBytes = 0;
  private readonly geometry: Geometry;
  private readonly instanceBuffer: Buffer;
  private readonly uniforms: UniformGroup<{
    uCellDevicePx: { value: number; type: 'f32' };
    uSoftness: { value: number; type: 'f32' };
    uShape: { value: number; type: 'f32' };
  }>;
  private readonly transform: LayerTransform = { scale: 1, x: 0, y: 0 };

  constructor(options: EntityLayerOptions) {
    this.name = options.name;
    this.parallax = options.parallax ?? 1;
    this.batch = new EntityBatch(options.initialCapacity ?? 256);

    this.instanceBuffer = new Buffer({
      data: this.batch.data,
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST,
      label: `entities:${options.name}`,
    });
    const instance = (format: 'float32x2' | 'float32' | 'unorm8x4', offset: number) => ({
      buffer: this.instanceBuffer,
      format,
      offset,
      stride: INSTANCE_BYTES,
      instance: true,
    });
    this.geometry = new Geometry({
      attributes: {
        aPosition: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        aCenter: instance('float32x2', 0),
        aScale: instance('float32x2', 8),
        aRotation: instance('float32', 16),
        aGlyph: instance('float32', 20),
        aColor: instance('unorm8x4', 24),
      },
      indexBuffer: new Uint32Array([0, 1, 2, 0, 2, 3]),
      instanceCount: 0,
    });

    const { glyphs } = options;
    this.uniforms = new UniformGroup({
      uCellDevicePx: { value: 0, type: 'f32' },
      uSoftness: { value: options.softness ?? 0, type: 'f32' },
      uShape: { value: options.shape === 'softEllipse' ? 1 : 0, type: 'f32' },
    });
    const shader = Shader.from({
      gl: { vertex: entityVertex, fragment: entityFragment, name: 'mossback-entities' },
      resources: {
        uGlyphs: options.glyphSource,
        uAtlas: options.atlas,
        entityUniforms: this.uniforms,
        atlasUniforms: new UniformGroup({
          uAtlasSize: {
            value: new Float32Array([glyphs.atlasWidth, glyphs.atlasHeight]),
            type: 'vec2<f32>',
          },
          uDistanceRange: { value: glyphs.distanceRange, type: 'f32' },
        }),
      },
    });
    this.mesh = new Mesh({ geometry: this.geometry, shader });
    this.mesh.label = `entities:${options.name}`;
    this.mesh.alpha = options.alpha ?? 1;
  }

  /** Coloca la capa según la cámara y sube las instancias. Llamar después de `batch.end()`. */
  sync(camera: Camera, view: Viewport): void {
    const t = camera.layerTransform(view, this.parallax, this.transform);
    this.mesh.position.set(t.x, t.y);
    this.mesh.scale.set(t.scale);
    this.uniforms.uniforms.uCellDevicePx = this.snapToPixel ? t.scale * view.resolution : 0;

    const batch = this.batch;
    // Si el batch creció, su array es otro: se cambia el del buffer (PixiJS lo reasigna).
    if (this.instanceBuffer.data !== batch.data) this.instanceBuffer.data = batch.data;
    const bytes = batch.count * INSTANCE_BYTES;
    if (bytes > 0) this.instanceBuffer.update(bytes);
    this.uploadedBytes = bytes;
    this.geometry.instanceCount = batch.count;
    // Con 0 instancias no se dibuja nada (PixiJS dibujaría 1 si instanceCount fuera 0).
    this.mesh.renderable = batch.count > 0;
  }

  /** Difuminado del borde de la elipse (0 = nítido, 1 = todo difuminado). */
  get softness(): number {
    return this.uniforms.uniforms.uSoftness;
  }

  set softness(value: number) {
    this.uniforms.uniforms.uSoftness = Math.min(Math.max(value, 0), 1);
  }

  get visible(): boolean {
    return this.mesh.visible;
  }

  set visible(value: boolean) {
    this.mesh.visible = value;
  }

  destroy(): void {
    this.mesh.destroy();
    this.geometry.destroy();
    this.instanceBuffer.destroy();
  }
}
