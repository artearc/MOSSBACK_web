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

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontsDir = join(root, 'assets', 'fonts');
const config = JSON.parse(readFileSync(join(fontsDir, 'fonts.json'), 'utf8'));
const cp437 = JSON.parse(readFileSync(join(root, 'src', 'data', 'cp437.json'), 'utf8'));

// Se usa la API de Node y no la línea de comandos: en Windows, el CLI rechaza cualquier ruta
// en --reuse (bug de su dependencia is-invalid-path), y sin --reuse no se pueden juntar
// varias fuentes en un atlas.
const generateBMFont = createRequire(import.meta.url)('msdf-bmfont-xml');
const silentLogger = { log() {}, warn: console.warn, error: console.error };

function generate(fontPath, options) {
  return new Promise((resolvePromise, reject) => {
    generateBMFont(
      fontPath,
      options,
      (error, textures, font) => (error ? reject(error) : resolvePromise({ textures, font })),
      silentLogger,
    );
  });
}

/** Caracteres que no se dibujan: se resuelven al glifo vacío (id 0). */
const isBlank = (cp) => cp <= 0x20 || cp === 0x7f || cp === 0xa0 || cp === 0xad;

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
// msdf-bmfont guarda en este .cfg cómo ha empaquetado el atlas; cada fuente lo reutiliza
// para añadirse al mismo atlas sin mover los glifos anteriores.
const reuseFile = join(tmp, 'atlas.cfg');
/** PNG del atlas tras la última fuente (contiene los glifos de todas). */
let atlasPng = null;
/** Escala y centro del texto de la fuente principal; las de respaldo los reutilizan. */
let primaryText = null;

const glyphs = [];
const missing = new Set();
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

    if (requested.length === 0) {
      console.log(`${font.file}: nada que añadir`);
      continue;
    }
    const { textures, font: generated } = await generate(join(fontsDir, font.file), {
      outputType: 'json',
      filename: join(tmp, 'atlas'),
      fontSize,
      distanceRange,
      textureSize,
      fieldType: 'msdf',
      charset: String.fromCodePoint(...requested),
      reuse: reuseFile,
    });
    if (textures.length !== 1) {
      throw new Error('El atlas no cabe en una página: sube output.textureSize');
    }
    atlasPng = textures[0].texture;
    // La siguiente fuente lee de disco el .cfg y el PNG del atlas para añadirse a él.
    writeFileSync(`${textures[0].filename}.png`, atlasPng);
    writeFileSync(reuseFile, JSON.stringify(generated.settings));
    const bm = JSON.parse(generated.data);

    const pad = bm.info.padding[0];
    const advance = bm.chars.find((c) => c.id === 0x4d /* M */)?.xadvance ?? bm.chars[0].xadvance;
    const lineHeight = bm.common.lineHeight;
    // Si la fuente no tiene un carácter, msdf-bmfont pone su glifo 0 (.notdef, una caja con
    // una X). Esos se tratan como ausentes.
    const byCp = new Map(bm.chars.filter((c) => c.index !== 0).map((c) => [c.id, c]));

    for (const cp of requested) if (!byCp.has(cp)) missing.add(cp);
    const present = requested.filter((cp) => byCp.has(cp));

    const stretchX = config.layout.textStretchX;
    const baseline = bm.common.base;
    if (!primaryText) {
      // Fuente principal: caja que contiene el dibujo de todos sus glifos de texto (sin el
      // margen del campo de distancia). Escalar esa caja a la celda garantiza que ningún
      // glifo se recorta.
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
      primaryText = {
        scale: config.layout.textScale * Math.min(1 / (bottom - top), 1 / (2 * halfW * stretchX)),
        // Centro vertical medido desde la línea base, para alinear las fuentes de respaldo.
        centerFromBaseline: (top + bottom) / 2 - baseline,
      };
    }
    // Las fuentes de respaldo usan la escala de la principal (todas se generan con los mismos
    // píxeles por em) y se alinean por la línea base: así sus glifos no cambian de tamaño.
    const scale = primaryText.scale;
    const centerY = baseline + primaryText.centerFromBaseline;
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

  if (!atlasPng) throw new Error('No se generó ningún glifo');
  writeFileSync(join(fontsDir, image), atlasPng);
  // msdf-bmfont recorta el atlas a lo que ocupa: el tamaño real sale de la cabecera del PNG.
  const png = atlasPng;
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
  // Solo se avisa de lo que no ha aportado ninguna fuente.
  const stillMissing = [...missing].filter((cp) => !seen.has(cp));
  if (stillMissing.length > 0) {
    console.warn(
      `Sin glifo en ninguna fuente (se ignoran): ${stillMissing.map((cp) => String.fromCodePoint(cp)).join(' ')}`,
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
