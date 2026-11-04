/**
 * Shader de la capa de entidades (WebGL2 / GLSL ES 3.0).
 *
 * Un quad por instancia. El vertex shader busca el glifo en la misma tabla que usa la rejilla
 * (uv en el atlas y plano dentro de la celda) y coloca el quad alrededor del centro de la
 * entidad, con escala y rotación. El fragment shader dibuja el glifo MSDF.
 */

export const entityVertex = /* glsl */ `#version 300 es
in vec2 aPosition;   // esquina del quad: (0,0) … (1,1)
in vec2 aCenter;     // centro del glifo, en celdas
in vec2 aScale;
in float aRotation;
in float aGlyph;
in vec4 aColor;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform sampler2D uGlyphs;
uniform float uCellDevicePx; // píxeles físicos por celda; 0 = sin ajustar al píxel
uniform float uShape;        // 0 = glifo MSDF; 1 = elipse difuminada (sombras)

out vec2 vUv;
out vec4 vColor;
out vec2 vLocal;             // posición en el quad, de -1 a 1 (para la elipse)

void main() {
  int glyph = int(aGlyph + 0.5);
  vec4 uvRect = texelFetch(uGlyphs, ivec2(0, glyph), 0);
  // La elipse ocupa la celda entera; el glifo, su plano.
  vec4 plane = uShape > 0.5 ? vec4(0.0, 0.0, 1.0, 1.0) : texelFetch(uGlyphs, ivec2(1, glyph), 0);
  vLocal = aPosition * 2.0 - 1.0;

  // Esquina dentro de la celda del glifo, relativa a su centro.
  vec2 local = (mix(plane.xy, plane.zw, aPosition) - 0.5) * aScale;
  float c = cos(aRotation);
  float s = sin(aRotation);
  local = vec2(c * local.x - s * local.y, s * local.x + c * local.y);

  // Centro ajustado al píxel físico: así la entidad no vibra respecto al mundo, que también
  // se dibuja alineado a píxeles.
  vec2 center = uCellDevicePx > 0.0 ? floor(aCenter * uCellDevicePx + 0.5) / uCellDevicePx : aCenter;

  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(center + local, 1.0)).xy, 0.0, 1.0);
  vUv = mix(uvRect.xy, uvRect.zw, aPosition);
  vColor = aColor;
}
`;

export const entityFragment = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
in vec4 vColor;
in vec2 vLocal;

uniform sampler2D uAtlas;
uniform vec2 uAtlasSize;
uniform float uDistanceRange;
uniform float uSoftness; // 0 = borde nítido; 1 = todo difuminado
uniform float uShape;    // 0 = glifo MSDF; 1 = elipse difuminada
uniform vec4 uColor; // tinte y opacidad de la capa (PixiJS)

out vec4 fragColor;

float median3(vec3 v) {
  return max(min(v.r, v.g), min(max(v.r, v.g), v.b));
}

void main() {
  float coverage;
  if (uShape > 0.5) {
    // Elipse: opaca en el centro y difuminada hacia el borde.
    float d = length(vLocal);
    float edge = max(uSoftness, fwidth(d));
    coverage = 1.0 - smoothstep(1.0 - edge, 1.0, d);
  } else {
    vec3 msd = texture(uAtlas, vUv).rgb;
    vec2 unitRange = vec2(uDistanceRange) / uAtlasSize;
    vec2 screenTexSize = vec2(1.0) / fwidth(vUv);
    float screenPxRange = max(0.5 * dot(unitRange, screenTexSize), 1.0);
    coverage = clamp(screenPxRange * (median3(msd) - 0.5) + 0.5, 0.0, 1.0);
  }
  float alpha = coverage * vColor.a;
  if (alpha <= 0.0) discard;
  fragColor = vec4(vColor.rgb * alpha, alpha) * uColor;
}
`;
