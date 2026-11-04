// Genera el atlas MSDF y su manifiesto a partir de assets/fonts/fonts.json.
//
//   npm run font
//
// Salida (se guarda en el repo, no hace falta regenerar para trabajar):
//   assets/fonts/atlas.png   atlas MSDF (una sola página)
//   assets/fonts/atlas.json  manifiesto: por glifo, su rectángulo en el atlas y su «plano»
//                            (dónde va dentro de una celda cuadrada de lado 1)
//
// El renderizador solo lee el manifiesto, así que añadir glifos no requiere tocarlo.

import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = join(root, 'assets', 'fonts');
const config = JSON.parse(readFileSync(join(fontsDir, 'fonts.json'), 'utf8'));
const cp437 = JSON.parse(readFileSync(join(root, 'src', 'data', 'cp437.json'), 'utf8'));
const cli = join(root, 'node_modules', 'msdf-bmfont-xml', 'cli.js');

/** Caracteres que no se dibujan: se resuelven al glifo vacío (id 0). */
const isBlank = (cp) => cp <= 0x20 || cp === 0x7f || cp === 0xa0;

const PRESETS = {
  ascii: () => range(0x21, 0x7e),
  latin1: () => range(0xa1, 0xff),
  cp437: () => cp437,
};

function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function parseRange(text) {
  const [a, b] = text.split('-').map((s) => parseInt(s.replace(/^U\+/i, ''), 16));
  return [a, b ?? a];
}

function parseCodepoint(text) {
  return parseInt(text.replace(/^U\+/i, ''), 16);
}

const fillRanges = config.layout.fill.map(parseRange);
const isFill = (cp) => fillRanges.some(([a, b]) => cp >= a && cp <= b);

const { image, manifest, textureSize, fontSize, distanceRange } = config.output;
const tmp = mkdtempSync(join(tmpdir(), 'mossback-font-'));
// msdf-bmfont crea el .cfg en la primera fuente; las siguientes lo reutilizan para añadirse
// al mismo atlas.
let reuseFile = null;

const glyphs = [];
const missing = [];
const seen = new Set();

try {
  for (const font of config.fonts) {
    const names = Object.fromEntries(
      Object.entries(font.names ?? {}).map(([name, cp]) => [parseCodepoint(cp), name]),
    );
    const wanted = new Set();
    for (const preset of font.charsets ?? []) {
      const make = PRESETS[preset];
      if (!make) throw new Error(`Charset desconocido: ${preset}`);
      for (const cp of make()) wanted.add(cp);
    }
    for (const ch of font.extra ?? '') wanted.add(ch.codePointAt(0));
    for (const cp of Object.keys(names)) wanted.add(Number(cp));
    const requested = [...wanted].filter((cp) => !isBlank(cp) && !seen.has(cp));

    const charsetFile = join(tmp, 'charset.txt');
    writeFileSync(charsetFile, String.fromCodePoint(...requested), 'utf8');

    const before = new Set(readdirSync(tmp));
    execFileSync(
      process.execPath,
      [
        cli,
        // `--reuse` va primero: sin ruta, se comería el argumento siguiente.
        '--reuse',
        ...(reuseFile ? [reuseFile] : []),
        '-f',
        'json',
        '-o',
        join(tmp, image),
        '-s',
        String(fontSize),
        '-r',
        String(distanceRange),
        '-m',
        textureSize.join(','),
        '-t',
        'msdf',
        '-i',
        charsetFile,
        join(fontsDir, font.file),
      ],
      { stdio: 'pipe' },
    );
    if (!reuseFile) {
      const cfg = readdirSync(tmp).find((f) => f.endsWith('.cfg'));
      if (!cfg) throw new Error('msdf-bmfont no creó el archivo .cfg de reutilización');
      reuseFile = join(tmp, cfg);
    }
    const jsonName = readdirSync(tmp).find((f) => f.endsWith('.json') && !before.has(f));
    if (!jsonName) throw new Error(`msdf-bmfont no generó JSON para ${font.file}`);
    const bm = JSON.parse(readFileSync(join(tmp, jsonName), 'utf8'));

    if (bm.common.pages > 1 || bm.chars.some((c) => c.page !== 0)) {
      throw new Error('El atlas no cabe en una página: sube output.textureSize');
    }

    const pad = bm.info.padding[0];
    const advance = bm.chars.find((c) => c.id === 0x4d /* M */)?.xadvance ?? bm.chars[0].xadvance;
    const lineHeight = bm.common.lineHeight;
    // Si la fuente no tiene un carácter, msdf-bmfont pone su glifo 0 (.notdef, una caja con
    // una X). Esos se tratan como ausentes.
    const byCp = new Map(bm.chars.filter((c) => c.index !== 0).map((c) => [c.id, c]));

    for (const cp of requested) if (!byCp.has(cp)) missing.push(cp);
    const present = requested.filter((cp) => byCp.has(cp));

    // Caja que contiene el dibujo de todos los glifos de texto (sin el margen del campo de
    // distancia). Escalar esa caja a la celda garantiza que ningún glifo se recorta.
    let top = Infinity;
    let bottom = -Infinity;
    let left = Infinity;
    let right = -Infinity;
    for (const cp of present) {
      if (isFill(cp)) continue;
      const c = byCp.get(cp);
      top = Math.min(top, c.yoffset + pad);
      bottom = Math.max(bottom, c.yoffset + c.height - pad);
      left = Math.min(left, c.xoffset + pad - advance / 2);
      right = Math.max(right, c.xoffset + c.width - pad - advance / 2);
    }
    const halfW = Math.max(-left, right);
    const stretchX = config.layout.textStretchX;
    const scale =
      config.layout.textScale * Math.min(1 / (bottom - top), 1 / (2 * halfW * stretchX));
    const centerY = (top + bottom) / 2;
    const bleed = config.layout.fillBleed;

    for (const cp of present) {
      const c = byCp.get(cp);
      let plane;
      if (isFill(cp)) {
        // Caja de la celda de la fuente (0..advance × 0..lineHeight) → celda entera, con un
        // pequeño exceso para que bloques y líneas vecinas se toquen sin costuras.
        const fx = (px) => -bleed + (px / advance) * (1 + 2 * bleed);
        const fy = (py) => -bleed + (py / lineHeight) * (1 + 2 * bleed);
        plane = [fx(c.xoffset), fy(c.yoffset), fx(c.xoffset + c.width), fy(c.yoffset + c.height)];
      } else {
        const tx = (px) => 0.5 + (px - advance / 2) * scale * stretchX;
        const ty = (py) => 0.5 + (py - centerY) * scale;
        plane = [tx(c.xoffset), ty(c.yoffset), tx(c.xoffset + c.width), ty(c.yoffset + c.height)];
      }
      glyphs.push({
        cp,
        ...(names[cp] ? { name: names[cp] } : {}),
        rect: [c.x, c.y, c.width, c.height],
        plane: plane.map((v) => Math.round(v * 1e5) / 1e5),
      });
      seen.add(cp);
    }
    console.log(`${font.file}: ${present.length} glifos`);
  }

  copyFileSync(join(tmp, image), join(fontsDir, image));
  // msdf-bmfont recorta el atlas a lo que ocupa: el tamaño real sale de la cabecera del PNG.
  const png = readFileSync(join(fontsDir, image));
  const out = {
    version: 1,
    atlas: {
      image,
      width: png.readUInt32BE(16),
      height: png.readUInt32BE(20),
      distanceRange,
      fontSize,
    },
    glyphs,
  };
  writeFileSync(join(fontsDir, manifest), JSON.stringify(out) + '\n');
  console.log(`Escrito ${image} y ${manifest} (${glyphs.length} glifos + vacío).`);
  if (missing.length > 0) {
    console.warn(
      `Sin glifo en la fuente (se ignoran): ${missing.map((cp) => String.fromCodePoint(cp)).join(' ')}`,
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
