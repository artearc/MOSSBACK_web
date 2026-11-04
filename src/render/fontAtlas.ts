/** Carga el atlas MSDF generado por `npm run font` y su tabla de glifos. */

import { Assets, type Texture, type TextureSource } from 'pixi.js';
import manifestJson from '../../assets/fonts/atlas.json';
import atlasUrl from '../../assets/fonts/atlas.png';
import { GlyphTable, parseGlyphManifest } from './glyphs';

export interface GlyphAtlas {
  readonly glyphs: GlyphTable;
  readonly atlas: TextureSource;
}

export async function loadGlyphAtlas(): Promise<GlyphAtlas> {
  const glyphs = new GlyphTable(parseGlyphManifest(manifestJson));
  const texture = await Assets.load<Texture>({
    src: atlasUrl,
    data: {
      // El MSDF guarda distancias en los canales: no se puede premultiplicar ni hacer mipmaps.
      alphaMode: 'no-premultiply-alpha',
      scaleMode: 'linear',
      autoGenerateMipmaps: false,
    },
  });
  return { glyphs, atlas: texture.source };
}
