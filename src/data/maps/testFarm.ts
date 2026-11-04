/**
 * Mapa de prueba: un huerto con valla, dos árboles, una casita, un estanque y caminos.
 * Sirve para probar colisiones y la oclusión en vista 3/4 (pasar por detrás de copas y
 * tejados y por delante de troncos y fachadas). Arte provisional.
 */

import { composeRows, type MapDefinition, type TileStyle } from '../../world/tileMap';

// Paleta del valle: verdes y ocres.
const GRASS_BG = 0x24331f;
const SOIL_BG = 0x3a2a1d;
const FLOOR_BG = 0x5a4632;
const WALL_BG = 0x7a6648;
const ROOF_BG = 0x6e2f22;
const CANOPY_BG = 0x1f3a1c;

const grass: TileStyle = { glyphs: ".,'` ", fg: 0x3f5a35, bg: GRASS_BG };
const soil: TileStyle = { glyphs: '~-', fg: 0x52402c, bg: SOIL_BG };
const floor: TileStyle = { glyphs: '·', fg: 0x7a6248, bg: FLOOR_BG };
const fence = (glyphs: string): TileStyle => ({ glyphs, fg: 0xa8835a });
const roof = (glyphs: string): TileStyle => ({ glyphs, fg: 0xc0664a, bg: ROOF_BG });
const wall = (glyphs: string, fg = 0xc9b48a): TileStyle => ({ glyphs, fg, bg: WALL_BG });

// --- Bloques (el espacio = «no tocar») ---

const W = 24; // ancho del huerto, con la valla
const inner = W - 2;
const garden = [
  `┌${'─'.repeat(inner)}┐`,
  `│${'~~v'.repeat(7)}~│`,
  `│${'~'.repeat(inner)}│`,
  `│${'~~y'.repeat(7)}~│`,
  `│${'.'.repeat(inner)}│`,
  `│${'~~p'.repeat(7)}~│`,
  `│${'~'.repeat(inner)}│`,
  `│${'~~v'.repeat(7)}~│`,
  `│${'.'.repeat(inner)}│`,
  `└${'─'.repeat(9)}:::${'─'.repeat(inner - 12)}┘`,
];

// Copa en `overhead` (por encima del personaje) y tronco sólido en `objects`.
const tree = [' ooo ', 'ooooo', 'ooooo', ' oTo ', '  T  '];

// Tejado sobre el muro trasero (sólido) y sobre el suelo interior (transitable).
// La fachada (última fila) queda a la vista, con ventanas y puerta.
const house = ['/BBBBBBB\\', '/RRRRRRR\\', '/RRRRRRR\\', 'HWHHDHHWH'];

const pond = [' ≈≈≈ ', '≈≈≈≈≈', ' ≈≈≈ '];

const WIDTH = 56;
const HEIGHT = 34;

const rows = composeRows(WIDTH, HEIGHT, '.', [
  { x: 0, y: 0, rows: ['"'.repeat(WIDTH), '"'.repeat(WIDTH)] },
  { x: 0, y: HEIGHT - 2, rows: ['"'.repeat(WIDTH), '"'.repeat(WIDTH)] },
  { x: 4, y: 4, rows: garden },
  // Camino desde la puerta del huerto hasta la casa.
  { x: 14, y: 14, rows: [':::', ':::', ':::', ':::', ':::', ':::', ':::', ':::', ':::'] },
  { x: 14, y: 23, rows: [':'.repeat(23)] },
  { x: 34, y: 20, rows: [':', ':', ':'] },
  { x: 34, y: 4, rows: tree },
  { x: 47, y: 12, rows: tree },
  { x: 30, y: 16, rows: house },
  { x: 44, y: 24, rows: pond },
  { x: 9, y: 19, rows: ['r', '', '', '  * *', '*'] },
  { x: 26, y: 27, rows: ['* r', '  *'] },
  { x: 40, y: 9, rows: ['r'] },
  { x: 20, y: 20, rows: ['@'] },
]);

export const TEST_FARM: MapDefinition = {
  name: 'test-farm',
  rows,
  defaultGround: grass,
  legend: {
    '.': {},
    '"': { ground: { glyphs: '"\',', fg: 0x587a43, bg: GRASS_BG } },
    ':': { ground: { glyphs: '·∙.', fg: 0x8a7050, bg: 0x4a3b2a } },
    '*': { ground: { glyphs: '*', fg: 0xe0a0c0, bg: GRASS_BG } },
    '@': { spawn: true },

    // Huerto
    '~': { ground: soil },
    v: { ground: soil, objects: { glyphs: 'τ', fg: 0x7fbf5a } },
    y: { ground: soil, objects: { glyphs: '¥', fg: 0xd8c060 } },
    p: { ground: soil, objects: { glyphs: '♣', fg: 0x5aa04a } },
    '┌': { objects: fence('┌'), solid: true },
    '┐': { objects: fence('┐'), solid: true },
    '└': { objects: fence('└'), solid: true },
    '┘': { objects: fence('┘'), solid: true },
    '─': { objects: fence('─'), solid: true },
    '│': { objects: fence('│'), solid: true },

    // Árbol
    o: { overhead: { glyphs: '♣♠♣', fg: 0x4f8f3a, bg: CANOPY_BG } },
    T: { objects: { glyphs: '║', fg: 0x8a5e36 }, solid: true },

    // Casa
    '/': { ground: floor, objects: wall('▓'), overhead: roof('/'), solid: true },
    '\\': { ground: floor, objects: wall('▓'), overhead: roof('\\'), solid: true },
    B: { ground: floor, objects: wall('▓'), overhead: roof('≡'), solid: true },
    R: { ground: floor, overhead: roof('≡') },
    H: { objects: wall('▓'), solid: true },
    W: { objects: wall('◘', 0x9fc6d8), solid: true },
    D: { ground: floor, objects: { glyphs: '∩', fg: 0x2a1d12, bg: FLOOR_BG } },

    // Otros
    r: { objects: { glyphs: '●', fg: 0x8a8a80 }, solid: true },
    '≈': { ground: { glyphs: '≈~', fg: 0x7ab0d0, bg: 0x2a4a66 }, solid: true },
  },
};
