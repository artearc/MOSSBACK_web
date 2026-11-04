/**
 * Mapas en texto: cada carácter del mapa se busca en una leyenda que dice qué dibujar en cada
 * capa de la rejilla y si la celda es sólida. Más adelante los mapas de REXPaint se traducirán
 * a este mismo formato.
 */

import { createRng } from '../core/rng';
import type { GlyphId, GlyphTable } from '../render/glyphs';
import { TRANSPARENT, type GridLayer, type Rgb } from '../render/gridLayer';
import type { SolidMap } from '../sim/collision';

export interface TileStyle {
  /** Uno o varios caracteres; con varios, cada celda elige uno (variación determinista). */
  readonly glyphs: string;
  readonly fg: Rgb;
  /** Sin `bg`, el fondo es transparente. */
  readonly bg?: Rgb;
}

export interface LegendEntry {
  /** Suelo. Si falta, se usa `MapDefinition.defaultGround`. */
  readonly ground?: TileStyle;
  /** Bases de objetos: troncos, vallas, muros (por debajo de las entidades). */
  readonly objects?: TileStyle;
  /** Copas, tejados (por encima de las entidades). */
  readonly overhead?: TileStyle;
  readonly solid?: boolean;
  /** Punto de aparición del jugador. */
  readonly spawn?: boolean;
}

export interface MapDefinition {
  readonly name: string;
  readonly rows: readonly string[];
  readonly legend: Readonly<Record<string, LegendEntry>>;
  readonly defaultGround: TileStyle;
}

export interface TileMap extends SolidMap {
  readonly name: string;
  /** Entrada de leyenda de cada celda (fila a fila). */
  readonly cells: readonly LegendEntry[];
  readonly solid: Uint8Array;
  readonly spawn: { readonly x: number; readonly y: number };
  readonly defaultGround: TileStyle;
}

export function parseMap(def: MapDefinition): TileMap {
  const rows = def.rows.map((r) => [...r]);
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (height === 0 || width === 0) throw new Error(`Mapa "${def.name}" vacío`);

  const cells: LegendEntry[] = [];
  const solid = new Uint8Array(width * height);
  let spawn: { x: number; y: number } | null = null;

  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(`Mapa "${def.name}": la fila ${y} mide ${row.length}, se esperaba ${width}`);
    }
    row.forEach((ch, x) => {
      const entry = def.legend[ch];
      if (!entry)
        throw new Error(`Mapa "${def.name}": carácter sin leyenda "${ch}" en (${x}, ${y})`);
      cells.push(entry);
      if (entry.solid) solid[y * width + x] = 1;
      if (entry.spawn) {
        if (spawn) throw new Error(`Mapa "${def.name}": más de un punto de aparición`);
        spawn = { x, y };
      }
    });
  });
  if (!spawn) throw new Error(`Mapa "${def.name}": falta el punto de aparición`);

  return {
    name: def.name,
    cols: width,
    rows: height,
    cells,
    solid,
    spawn,
    defaultGround: def.defaultGround,
    isSolid(x: number, y: number): boolean {
      if (x < 0 || y < 0 || x >= width || y >= height) return true;
      return solid[y * width + x] === 1;
    },
  };
}

export interface MapLayers {
  readonly ground: GridLayer;
  readonly objects: GridLayer;
  readonly overhead: GridLayer;
}

/** Dibuja el mapa en las capas de la rejilla. */
export function paintMap(map: TileMap, layers: MapLayers, glyphs: GlyphTable): void {
  // La variación de glifos sale del RNG con semilla del mapa: siempre igual.
  const rng = createRng(`map:${map.name}`);
  const pick = (style: TileStyle): GlyphId => {
    const chars = [...style.glyphs];
    return glyphs.id(chars.length > 1 ? rng.pick(chars) : (chars[0] ?? ' '));
  };
  const paint = (layer: GridLayer, x: number, y: number, style: TileStyle | undefined): void => {
    if (!style) {
      layer.clear(x, y);
      return;
    }
    layer.set(x, y, pick(style), style.fg, style.bg ?? TRANSPARENT);
  };

  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const entry = map.cells[y * map.cols + x] as LegendEntry;
      paint(layers.ground, x, y, entry.ground ?? map.defaultGround);
      paint(layers.objects, x, y, entry.objects);
      paint(layers.overhead, x, y, entry.overhead);
    }
  }
}

/**
 * Ayuda para componer mapas: parte de un relleno y estampa bloques de texto en posiciones.
 * En los bloques, el espacio significa «no tocar».
 */
export function composeRows(
  width: number,
  height: number,
  fill: string,
  blocks: readonly { readonly x: number; readonly y: number; readonly rows: readonly string[] }[],
): string[] {
  const grid = Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
  for (const block of blocks) {
    block.rows.forEach((row, dy) => {
      [...row].forEach((ch, dx) => {
        const x = block.x + dx;
        const y = block.y + dy;
        if (ch === ' ' || x < 0 || y < 0 || x >= width || y >= height) return;
        (grid[y] as string[])[x] = ch;
      });
    });
  }
  return grid.map((r) => r.join(''));
}
