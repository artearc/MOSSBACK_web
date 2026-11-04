/**
 * Shader de la rejilla (WebGL2 / GLSL ES 3.0).
 *
 * Cada capa es un único rectángulo que cubre toda la rejilla. Para cada píxel, el fragment
 * shader calcula su celda, lee glifo y colores de la textura de la capa, busca el glifo en la
 * tabla y lo dibuja desde el atlas MSDF sobre el color de fondo.
 */

export const gridVertex = /* glsl */ `#version 300 es
in vec2 aPosition;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

out vec2 vCell;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vCell = aPosition; // posición en celdas
}
`;

export const gridFragment = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 vCell;

uniform sampler2D uCells;   // (columnas × 3) × filas, RGBA8: glifo, texto, fondo
uniform sampler2D uGlyphs;  // 2 × glifos, RGBA32F: uv del atlas, plano en la celda
uniform sampler2D uAtlas;   // atlas MSDF
uniform vec2 uGridSize;
uniform vec2 uAtlasSize;
uniform float uDistanceRange;
uniform vec4 uColor;        // tinte y opacidad de la capa (PixiJS)

out vec4 fragColor;

float median3(vec3 v) {
  return max(min(v.r, v.g), min(max(v.r, v.g), v.b));
}

void main() {
  // Derivadas fuera de cualquier rama: vCell es continuo en toda la capa.
  vec2 cellsPerPx = fwidth(vCell);

  vec2 cell = floor(vCell);
  ivec2 c = ivec2(clamp(cell, vec2(0.0), uGridSize - 1.0));
  vec4 glyphTexel = texelFetch(uCells, ivec2(c.x * 3, c.y), 0);
  vec4 fg = texelFetch(uCells, ivec2(c.x * 3 + 1, c.y), 0);
  vec4 bg = texelFetch(uCells, ivec2(c.x * 3 + 2, c.y), 0);
  int glyph = int(glyphTexel.r * 255.0 + 0.5) + int(glyphTexel.g * 255.0 + 0.5) * 256;

  float coverage = 0.0;
  if (glyph > 0) {
    vec4 uvRect = texelFetch(uGlyphs, ivec2(0, glyph), 0);
    vec4 plane = texelFetch(uGlyphs, ivec2(1, glyph), 0);
    vec2 planeSize = plane.zw - plane.xy;
    vec2 t = (vCell - cell - plane.xy) / planeSize;
    if (t == clamp(t, 0.0, 1.0)) {
      vec2 uv = mix(uvRect.xy, uvRect.zw, t);
      vec3 msd = textureLod(uAtlas, uv, 0.0).rgb;
      // Cuántos píxeles de pantalla ocupa un texel del atlas, para un borde de ~1 px.
      vec2 texelsPerCell = (uvRect.zw - uvRect.xy) * uAtlasSize / planeSize;
      vec2 pxPerTexel = 1.0 / (cellsPerPx * texelsPerCell);
      float screenPxRange = max(uDistanceRange * 0.5 * (pxPerTexel.x + pxPerTexel.y), 1.0);
      coverage = clamp(screenPxRange * (median3(msd) - 0.5) + 0.5, 0.0, 1.0);
    }
  }

  // Glifo encima del fondo, en alfa premultiplicado.
  float alpha = coverage * fg.a + bg.a * (1.0 - coverage * fg.a);
  vec3 rgb = fg.rgb * coverage * fg.a + bg.rgb * bg.a * (1.0 - coverage * fg.a);
  fragColor = vec4(rgb, alpha) * uColor;
}
`;
