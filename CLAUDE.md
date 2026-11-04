# Mossback

Juego cozy de granja y construcción en ASCII detallado y animado. Tu hogar está sobre el lomo de **Mossback**, una bestia colosal y anciana que migra por una ruta de seis regiones. El jugador cultiva, construye y cuida de la bestia mientras el mundo cambia a su alrededor.

Desarrollador en solitario (Alex). Plataforma objetivo: PC (Steam, incluido Steam Deck) y demo web en itch.io.

El diseño completo está en `docs/GDD.md`. Este archivo es el resumen operativo; consulta el GDD cuando trabajes en una mecánica, zona, región o personaje concreto. Si el GDD y este archivo se contradicen, pregunta.

## Pilares (toda decisión se mide contra esto)

1. **Un hogar que viaja.** El mundo se renueva solo: clima, cultivos, visitantes y recursos cambian por región.
2. **Vínculo con la bestia.** Mossback es un personaje vivo, no un escenario. Responde a cómo se la trata.
3. **Progreso visible.** De un parche de tierra en el cuello a un pueblo por todo su cuerpo.
4. **Calma sin castigo.** Sin combate obligatorio, sin derrota, sin estrés por tiempo.

## Dirección visual

- ASCII de alto detalle con muchas animaciones (referencias: *Stone Story RPG*, *Cogmind*).
- Rejilla de celdas: carácter + color de texto + color de fondo por celda.
- Fuente propia en MSDF con glifos extra (brotes, hojas, frutos) además del ASCII clásico.
- **Nunca una pantalla quieta**: viento, partículas, respiración de la bestia, fauna ambiental.
- Lo que se mueve (personaje, animales, hojas, lluvia) se desplaza **suave entre celdas**, sin saltar de celda en celda. El mundo estático sí vive en la rejilla.
- Iluminación dinámica, ciclo día/noche con gradación de color, bloom suave, parallax por capas.
- Paleta por región (valle: verdes/ocres; dunas: naranjas; cumbres: azules fríos).

## Stack

| Capa | Herramienta |
| --- | --- |
| Lenguaje / build | TypeScript (strict) + Vite |
| Render | PixiJS v8 sobre **WebGL2** (de momento sin WebGPU) + shader propio de rejilla ASCII |
| Fuente | MSDF generada con msdf-bmfont-xml (`npm run font`); base JetBrains Mono (OFL) |
| Postprocesado | pixi-filters + shaders propios |
| Simulación | miniplex (ECS) |
| Utilidades | rot.js, simplex-noise |
| Animación / tweens | GSAP |
| UI | SolidJS sobre el canvas, estilo monoespaciado |
| Audio | Howler.js (SFX) + Tone.js (música adaptativa por capas) |
| Guardado | Zod (esquema versionado) |
| Escritorio / Steam | Electron + steamworks.js |
| Ajuste en vivo | Tweakpane (solo en desarrollo) |
| Arte a mano | REXPaint (.xp importados) |

**No añadas dependencias fuera de esta lista sin preguntar antes.** Electron, no Tauri (WebKitGTK rinde mal con WebGL en Steam Deck).

**Solo WebGL2, sin WebGPU, por ahora.** Con los dos habría que escribir cada shader dos veces (GLSL y WGSL), incluidos los de iluminación y postprocesado, y WebGPU en Linux / Steam Deck dentro de Electron no está garantizado. WebGL2 funciona en todas las plataformas objetivo. Se reconsiderará si el rendimiento lo pide. Los shaders se escriben en GLSL ES 3.0.

## Estructura

```
src/
  core/        bucle de juego, tiempo, input (teclado + gamepad), eventos, RNG con semilla
  render/      renderizador de rejilla, atlas de glifos, cámara, iluminación, postfx, parallax
  sim/         ECS: componentes y sistemas (cultivos, fauna, NPCs, clima)
  world/       Mossback (estado, zonas del cuerpo), regiones, ruta migratoria
  ui/          componentes SolidJS (HUD, inventario, menús, diálogos)
  audio/       gestor de SFX y música adaptativa
  data/        definiciones de contenido (cultivos, recetas, huéspedes, regiones) en TS/JSON
  save/        esquemas Zod, migraciones, persistencia
  debug/       Tweakpane, overlay de rendimiento
assets/
  fonts/       fuentes y atlas MSDF
  rex/         arte REXPaint (.xp)
  audio/
electron/      proceso principal, integración Steam
```

## Reglas de arquitectura

- **Simulación a paso fijo (60 Hz) separada del render.** El render interpola entre estados para el movimiento suave.
- **Todo el mundo se dibuja a través del renderizador de rejilla.** Nada de texto DOM ni sprites sueltos para el mundo de juego.
- **Rendimiento:** 60 fps estables en Steam Deck. Todo lo masivo (rejilla, partículas, luz) va en GPU con instancing. Nada de reservar memoria por frame en bucles calientes.
- **Determinismo:** toda la aleatoriedad pasa por el RNG con semilla de `core/`.
- **Contenido como datos:** cultivos, regiones, huéspedes, etc. viven en `data/`, no hardcodeados en sistemas.
- **Valores ajustables** (viento, colores, velocidades, luz) se exponen en Tweakpane en desarrollo.
- **Guardados versionados** con migraciones; una partida antigua nunca debe romperse.
- **Textos de UI** pasan por i18n (es y en) desde el principio.

## Convenciones

- Código, nombres e identificadores en inglés. Comentarios y documentación en español.
- Funciones pequeñas y puras donde se pueda; los sistemas ECS no guardan estado propio.
- Sin `any`. Tipos explícitos en las fronteras de módulo.
- Tests con Vitest para lógica de simulación, guardado y datos (no para render).

## Comandos

```
npm run dev        # servidor de desarrollo
npm run build      # build web
npm run typecheck  # tsc --noEmit
npm run test       # vitest
npm run format     # prettier
npm run font       # regenera el atlas MSDF desde assets/fonts/fonts.json
npm run electron   # app de escritorio en desarrollo
```

En desarrollo (`npm run dev`), parámetros de URL y teclas:

- `?scene=stress` escena de estrés de la rejilla (`&cells=400x240`); por defecto, el huerto de prueba.
- `?bench=500` mide ms/frame sin vsync (separa simulación, preparar frame y subida + render). En el huerto añade 2.000 entidades; `&entities=N` para cambiarlo.
- F2 panel de ajustes (Tweakpane) · F3 overlay de rendimiento.
- Consola: `__mossback.step(120)` simula 120 pasos de golpe; `__mossback.tuning` son los ajustes.

## Render en vista 3/4

Capas de abajo arriba: `ground` (rejilla) → `objects` (rejilla: troncos, vallas, muros) → `shadows` (entidades) → `actors` (entidades, ordenadas por Y) → `overhead` (rejilla: copas, tejados) → `sky` (entidades) → `fx`. Lo que se mueve va en capas de entidades (quads instanciados, mismo atlas y tabla de glifos que la rejilla). Las colisiones van en un mapa de sólidos aparte de lo que se dibuja.

## Pulido pendiente

En orden; se hace cuando el loop sea divertido.

1. **Transparentar copas y tejados** cuando el personaje está debajo (fundido suave de esas celdas de `overhead`; el formato de celda ya guarda alfa).

## Forma de trabajar

- **Pasos pequeños.** Un hito o subtarea cada vez; que funcione y se vea bien antes de pasar a lo siguiente.
- Tras cada cambio: `npm run typecheck` y, si hay lógica, `npm run test`.
- En mecánicas, **arte provisional** primero; el pulido llega cuando el loop sea divertido.
- Si algo del diseño no está claro, pregunta en lugar de inventar mecánicas.

## Hitos

1. **Rejilla viva** — renderizador ASCII con MSDF y color por celda; personaje con movimiento suave; cultivos meciéndose con viento procedural.
2. **La escena que vende** — ciclo día/noche con iluminación, Mossback caminando con parallax y respiración, fauna ambiental.
3. **MVP jugable** — zonas cuello y lomo, 8–10 cultivos, dos regiones, una parada, hambre y confianza de la bestia, un huésped con su casa.
4. **Vertical slice** — 3 regiones, 4 zonas, 5 huéspedes, arte final; demo de Steam.

Hito actual: **1**.
