# Mossback — Game Design Document

Nov 4, 2026 · @Alex Ruiz Chazarra

## Visión general

**Pitch:** Mossback es un juego cozy de granja y construcción en el que tu hogar está sobre el lomo de una criatura colosal que migra. No eliges dónde vives: la bestia viaja, el mundo cambia a tu alrededor y tú cuidas de ella mientras levantas un pequeño pueblo sobre su cuerpo.

**Pilares de diseño**

1. **Un hogar que viaja.** El mundo se renueva solo: cada región trae clima, cultivos, visitantes y recursos distintos.
2. **Un vínculo con la bestia.** Mossback es tu compañera y no un escenario. Responde a cómo la tratas y cambia contigo.
3. **Progreso que se ve.** Del parche de tierra del primer día a un pueblo repartido por todo su cuerpo.
4. **Calma sin castigo.** No hay combate obligatorio ni derrota. Las decisiones importan, pero nada se pierde para siempre.

**Ficha**

| Campo | Propuesta |
| --- | --- |
| Género | Cozy sim de granja y construcción con exploración ligera |
| Cámara | ASCII 2D, vista cenital o 3/4 (por decidir) |
| Plataformas | PC (Steam) primero; Switch como objetivo secundario |
| Jugadores | Un jugador; cooperativo de 2 a 4 como ampliación posterior |
| Duración objetivo | 30–40 h la historia principal (3 años de juego); 80–100 h para completarlo todo; rejugable sin fin |
| Público | Jugadores de Stardew Valley, Spiritfarer, Ooblets y Minecraft en modo creativo |

**Referencias:** Stardew Valley (rutina y relaciones), Spiritfarer (barco-hogar que viaja y huéspedes con historia), El castillo ambulante (casa viva que camina), Minecraft (libertad para construir).

## Mossback, la bestia

Mossback es una criatura ancestral, lenta y amable, que lleva siglos recorriendo la misma ruta migratoria. Está vieja y cansada; al principio del juego cojea y tiene el lomo pelado. Cuidarla es el hilo emocional de toda la partida.

**Cómo crece**

- **Salud:** heridas y cicatrices que se curan con medicinas, cuidados y descanso. Al curarse se abren zonas nuevas del cuerpo.
- **Tamaño y vitalidad:** con buena alimentación crece y aguanta más carga, así que caben más edificios.
- **Flora propia:** lo que cultivas acaba creciendo en ella. Si plantas mucho helecho, su lomo se vuelve un bosque húmedo; si plantas flores, atrae polinizadores.
- **Confianza:** sube con cada comida, caricia o canción. Con más confianza te deja influir en la ruta y desbloquea habilidades.

**Necesidades diarias (suaves, nunca punitivas)**

| Necesidad | Cómo se cubre | Si se descuida |
| --- | --- | --- |
| Hambre | Cosechas especiales que solo ella come | Camina más lento; la ruta tarda más |
| Limpieza | Quitar parásitos y hongos de su piel | Bajan las cosechas en la zona afectada |
| Ánimo | Tocar música, rascarle, visitar su cabeza | Está apagada y no comparte recuerdos |
| Descanso | Elegir paradas largas en oasis | Se agota y para unos días por su cuenta |

**Habilidades que se desbloquean**

- **Bramido:** atrae lluvia o despeja tormentas.
- **Sumergirse:** cruza lagos poco profundos y abre rutas acuáticas.
- **Recuerdos:** al dormir sueña con sitios antiguos; esos sueños marcan en el mapa lugares ocultos de la ruta.
- **Desvío:** con mucha confianza, eliges el siguiente destino entre dos o tres opciones.

## Loop de juego

El loop alterna la vida a bordo con las paradas, y cada vuelta deja a la bestia más fuerte y con más espacio.

&#91;embedded content: loop principal · 4 fases y el crecimiento de la bestia\]

- **Diario (un día, 15–20 min):** regar y cosechar, atender a Mossback, hablar con huéspedes, construir o decorar.
- **Por viaje (unos 5–7 días por región):** tramo en marcha, llegada, parada en la región y vuelta a bordo con semillas, recursos y quizá un huésped nuevo.
- **A largo plazo (un año = una vuelta a la ruta):** la bestia se cura y crece, se abren zonas del cuerpo, desvíos y capítulos de la historia.

## Mecánicas

Todas las mecánicas clásicas del género están, pero cada una depende del viaje o de la bestia. Eso es lo que las hace distintas.

**Cultivo**

- Los cultivos dependen del clima de la región por la que pasas, no solo de la estación.
- Semillas regionales: solo se consiguen en ciertas paradas, así que cada viaje llena tu catálogo.
- Suelo vivo: la fertilidad depende de la salud de la bestia en esa zona. Cuidarla mejora tus cosechas.
- Cultivos para Mossback: una línea de plantas que solo sirven para alimentarla y curarla.

**Construcción**

- Construcción por piezas en cuadrícula, con libertad para decorar al estilo Stardew o Minecraft creativo.
- Cada edificio tiene **peso**. La capacidad de carga de la bestia pone un límite y crece con ella.
- Puentes, escaleras y poleas conectan las zonas del cuerpo.
- Los edificios se adaptan al movimiento: si no están bien anclados, se tambalean al subir cuestas.

**Recolección en paradas**

- En cada parada bajas al suelo durante un tiempo limitado: un día, o una semana en las paradas largas.
- Recoges recursos, pescas, exploras ruinas y conoces gente.
- Un aviso suave (el bramido de la bestia) indica que vuelve a ponerse en marcha. Si te quedas, puedes alcanzarla al día siguiente sin penalización.

**Mientras caminas**

- Pesca y recolección al paso: redes colgadas de los costados, pájaros que traen semillas.
- Eventos de camino: manadas que acompañan un tramo, tormentas, viajeros que piden subir.

**Cocina y artesanía**

- Recetas que mezclan ingredientes de regiones distintas; las mejores necesitan haber viajado mucho.
- Talleres para tejer, destilar y fabricar herramientas.
- Algunos objetos solo se fabrican con materiales que la bestia muda: escamas, pelo, musgo antiguo.

**Comercio**

- Cada región paga mejor por lo que allí escasea. Llevar ventaja de una zona a otra forma parte del juego.
- Comerciantes itinerantes que suben a bordo un tramo del viaje.
- Moneda única para no complicar, con trueque opcional en regiones concretas.

## Zonas de la bestia y ruta migratoria

El mundo tiene dos capas: el cuerpo de Mossback, que es tu hogar y crece contigo, y la ruta, que cambia lo que te rodea.

**Zonas del cuerpo** (en orden de desbloqueo)

| Zona | Bioma | Uso principal | Se desbloquea al… |
| --- | --- | --- | --- |
| Cuello | Pradera templada | Primera granja y casa | Inicio |
| Lomo | Llanura amplia y llana | Campos grandes y el pueblo | Curar la primera herida |
| Joroba | Bosque de musgo húmedo | Hongos, madera, colmenas | Ganar tamaño 2 |
| Cuernos | Altura ventosa y fría | Molinos, observatorio, cultivos de montaña | Ganar confianza 3 |
| Costados | Paredes verticales | Redes, nidos, jardines colgantes | Construir poleas |
| Cola | Pantano cálido | Arrozales, plantas raras, pesca | Curar la cojera |
| Interior (fin del juego) | Cuevas bajo la piel, cristales | Recuerdos y secretos de la bestia | Confianza máxima |

**Regiones de la ruta** (un ciclo dura un año de juego)

| Región | Clima | Qué aporta |
| --- | --- | --- |
| Valle de los Sauces | Templado y lluvioso | Semillas básicas, el pueblo de partida, tutorial |
| Mar de Dunas | Seco y caluroso | Cactus, especias, comerciantes del desierto, ruinas |
| Marismas Grises | Húmedo y con niebla | Pesca, arroz, huéspedes misteriosos |
| Cumbres Nevadas | Frío | Lana, minerales, aguas termales para la bestia |
| Bosque de Gigantes | Sombra perpetua | Otras bestias migratorias, madera antigua |
| Costa de Coral | Cálido y salino | Comercio marítimo, conchas, recetas exóticas |

- La ruta base es fija, pero con más confianza se abren desvíos a regiones ocultas.
- Cada año la ruta trae cambios: una sequía, un pueblo que ha crecido, un puente caído. Así el segundo viaje no es igual al primero.

## Huéspedes y NPCs

Hay dos tipos de personajes: los **huéspedes**, que viven a bordo, y los **lugareños**, que te esperan en cada región y te ven pasar una vez al año.

**Huéspedes a bordo**

- Viajeros que piden subir en las paradas. Para que se queden necesitan una casa construida a su gusto.
- Cada uno tiene una historia en 5–10 capítulos que avanza con regalos, conversaciones y misiones.
- Aportan algo práctico: una tienda, una receta, una habilidad o una mejora para la bestia.
- Pueden bajarse al final de su historia, como en Spiritfarer, o quedarse para siempre si les das un motivo.
- Tienen relaciones entre ellos (amistades, rencillas, romances) que dan vida al pueblo.

**Ejemplos de huéspedes**

| Huésped | Quién es | Qué aporta |
| --- | --- | --- |
| Bruma | Veterinaria anciana que ya cuidó a Mossback hace décadas | Medicinas y la historia de la bestia |
| Tito y Pelín | Hermanos comerciantes que discuten por todo | Tienda y mejores precios entre regiones |
| Ona | Cartógrafa que busca la ruta original de las bestias | Mapas y desvíos ocultos |
| Gruño | Topo herrero que odia el viento | Herramientas y mejoras de construcción |
| La Tejedora | Araña gigante tímida que vive en los costados | Telas, redes y ropa |

**Lugareños**

- Cada región tiene 3–5 personajes fijos con los que te reencuentras cada año.
- Su vida avanza mientras no estás: un niño crece, se abre una tienda, alguien se casa. Volver tiene algo de reencuentro.

**Romance**

- Opcional, con huéspedes y algunos lugareños. Si te casas con un lugareño, puede subir a vivir a bordo.

## Progresión y temporadas

Los años son tiempo dentro del juego, no tiempo real. Un año de juego es una vuelta completa a la ruta por sus seis regiones: unos 36 días de juego, entre 10 y 13 horas reales. La progresión avanza en tres ejes a la vez: la bestia, el pueblo y el mundo.

**Estructura por años**

| Año | Objetivo narrativo | Lo que el jugador consigue |
| --- | --- | --- |
| 1 | Conocer a Mossback y salvarla del agotamiento | Cuello y lomo; primeros 4–5 huéspedes; curar las primeras heridas |
| 2 | Entender por qué las bestias migratorias desaparecen | Joroba, cuernos y costados; desvíos; habilidad de recuerdos |
| 3 | Encontrar la ruta original y el lugar de origen de la especie | Cola e interior; confianza máxima; final de la historia principal |
| 4 en adelante | Juego libre | Rutas generadas, retos de temporada, coleccionables y decoración |

**Fuentes de progreso**

- **Bestia:** salud, tamaño y confianza desbloquean zonas y habilidades.
- **Pueblo:** cada huésped que se queda abre tiendas, recetas y mejoras.
- **Catálogo:** semillas, peces, recetas y recuerdos para completar, como el centro cívico de Stardew.
- **Mundo:** las regiones cambian según lo que hiciste en ellas el año anterior.

**Final abierto**

- Al terminar la historia, Mossback puede tener una cría. Puedes empezar un nuevo ciclo sobre la cría heredando parte de tu pueblo y tu catálogo, o seguir con la bestia original.
- Esto da una mecánica de **legado** para alargar la vida del juego cientos de horas sin perder lo conseguido.

## Estética, audio y tono

El tono es cálido, melancólico y un poco mágico: un viaje lento con alguien mayor que tú y que está cansado. Tiene humor en los huéspedes y una ternura de fondo con la bestia.

**Visual: ASCII detallado y animado**

El juego usa ASCII de alto detalle con muchas animaciones, en la línea de *Stone Story RPG* y *Cogmind*. Encaja con un desarrollador en solitario, se presta a lo procedural y un cozy en ASCII casi no existe, así que diferencia al juego.

- **Rejilla de celdas con color por celda** (carácter, color de texto y de fondo). Las celdas son generosas para que se lea bien.
- **Fuente propia con glifos extra** (brotes, hojas, frutos, huellas) además del ASCII clásico, para distinguir cultivos de un vistazo.
- **Animación procedural:** viento en los cultivos, lluvia, niebla, musgo que crece y la respiración de la bestia, todo con ruido, shaders y partículas de caracteres en lugar de fotogramas dibujados.
- **El movimiento de Mossback:** el suelo ondula a cada paso y el paisaje se desplaza por capas (parallax ASCII).
- **Paleta por región:** verdes y ocres en el valle, naranjas en las dunas, azules fríos en las cumbres.
- **Vistas abiertas:** al llegar a una región o al amanecer, la cámara se aleja y la bestia entera aparece dibujada en caracteres.
- **Herramientas:** REXPaint para el arte a mano; PixiJS con un shader propio de rejilla (ver Stack técnico). La IA sirve para pasar bocetos a una base ASCII y generar variaciones que luego se retocan.
- **Opcional más adelante:** retratos ilustrados para los huéspedes en los diálogos.

**Alternativas descartadas por ahora:** pixel art 16×16 (demasiadas horas de animación), 3D low poly pixelado (curva de Blender y shaders) y siluetas planas (poco detalle en cultivos).

**Audio**

- Música acústica (cuerdas, flautas, percusión suave) con un tema distinto por región.
- Los pasos de la bestia como ritmo de fondo: un latido lento que marca el viaje.
- Mossback se comunica con sonidos graves, no con palabras. El jugador aprende a reconocer si está contenta, cansada o inquieta.

**Lo que evitamos**

- Estrés por tiempo, castigo por fallar o mecánicas de muerte.
- Monetización agresiva: pago único; más adelante, expansiones con regiones nuevas.

## Stack técnico

El juego se hace en web (TypeScript + WebGL) y se empaqueta con Electron para Steam. Encaja con un desarrollo en solitario apoyado en Claude Code, el ASCII es básicamente texto renderizado y una demo en el navegador sirve para validar el concepto. Las consolas quedan para un port posterior si el juego funciona.

| Capa | Elección | Para qué |
| --- | --- | --- |
| Lenguaje y build | TypeScript + Vite | Recarga instantánea al cambiar código |
| Render | PixiJS v8 (WebGPU con WebGL de respaldo) + shader propio para la rejilla ASCII | Decenas de miles de glifos animados a 60 fps |
| Fuente | Fuente propia convertida a MSDF (msdf-bmfont-xml) | Glifos nítidos a cualquier zoom; contorno y brillo |
| Postprocesado | pixi-filters + shaders propios | Bloom, viñeta, gradación de color según la hora, niebla |
| Iluminación | Mapa de luz 2D propio (shader) | Farolillos, amanecer, luciérnagas que iluminan celdas |
| Simulación | miniplex (ECS) | Cientos de entidades vivas: cultivos, insectos, NPCs |
| Utilidades | rot.js + simplex-noise | Pathfinding, generación procedural, ruido para viento, nubes y agua |
| Animación | GSAP | Transiciones, UI y curvas de suavizado |
| UI | SolidJS sobre el canvas, estilo monoespaciado | Menús e inventario coherentes con el ASCII |
| Audio | Howler.js (efectos) + Tone.js (música adaptativa) | Música por capas según región, hora y paso de la bestia |
| Guardado | Zod para el esquema + sistema de archivos de Electron | Partidas largas que sobreviven a las actualizaciones |
| Escritorio y Steam | Electron + steamworks.js | Logros, nube y Steam Deck |
| Ajuste en vivo | Tweakpane | Afinar viento, luz y colores mientras se juega |
| Arte a mano | REXPaint (importando archivos .xp) | Edificios, la bestia, decorados |

Se usa Electron y no Tauri porque Tauri usa el navegador del sistema, y en Linux (Steam Deck) es WebKitGTK, que rinde peor con WebGL. Electron lleva su propio Chromium y se ve igual en todas partes.

**Lo que hace que se sienta pulido**

1. **Movimiento sin rejilla:** el mundo está en celdas, pero lo que se mueve (personaje, animales, hojas, lluvia) se desplaza suave entre ellas.
2. **Luz y color:** ciclo día/noche con gradación de color, bloom suave y sombras de nubes sobre el lomo.
3. **Vida ambiental:** bandadas de pájaros, insectos, polen, cultivos que se mecen y el suelo que sube y baja con la respiración de Mossback. Nunca hay una pantalla quieta.
4. **Profundidad:** varias capas de parallax entre el paisaje lejano, el suelo y el lomo.
5. **Feedback en cada acción:** animación, partículas y sonido al cosechar, regar o construir.
6. **Audio adaptativo:** los pasos de la bestia marcan el tempo de la música.
7. **60 fps estables:** todo en la GPU y con presupuesto de rendimiento desde el primer día.

**Orden de construcción**

1. Renderizador de rejilla con fuente MSDF y movimiento suave entre celdas.
2. Iluminación y ciclo día/noche.
3. Mossback caminando, con parallax y respiración.
4. Vida ambiental: viento, partículas, pájaros.
5. Mecánicas: cultivo, construcción y paradas.

## Alcance para un desarrollador en solitario

Lo primero es demostrar que mirar a Mossback caminar en ASCII con un huerto encima ya da gusto. Si esa escena funciona, el estilo y el concepto están validados y el resto se monta encima.

**MVP (prototipo jugable)**

- [ ] Mossback en ASCII caminando, con respiración, ondulación del suelo y paisaje en parallax
- [ ] Dos zonas (cuello y lomo) y un huerto con 8–10 cultivos animados por el viento
- [ ] Ciclo día/noche con cambio de paleta y dos regiones con climas distintos
- [ ] Una parada para bajar al suelo y una necesidad de la bestia (hambre) con indicador de confianza
- [ ] Un huésped con historia corta y una casa que construirle

**Principios para no ahogarse en contenido**

- Lo procedural primero: clima, crecimiento, animación y variaciones de región salen de sistemas, no de dibujos a mano.
- Reutilizar piezas ASCII entre regiones cambiando paleta y glifos.
- Empezar con 3 regiones y 4 zonas; el resto llega en acceso anticipado o expansiones.

**Fases**

1. **Prototipo:** validar el loop de viaje y parada.
2. **Vertical slice:** un año recortado con 3 regiones, 4 zonas y 5 huéspedes, con arte final. Sirve para la demo de Steam y para buscar financiación o editora.
3. **Producción:** contenido de los años 1 a 3 completo.
4. **Acceso anticipado (opcional):** lanzar con el año 1 y ampliar con la comunidad.
5. **Lanzamiento 1.0** y después expansiones con regiones nuevas.

**Riesgos**

| Riesgo | Por qué preocupa | Cómo reducirlo |
| --- | --- | --- |
| Un mundo en movimiento cuesta de programar | Fondos y colisiones sobre un suelo que se mueve | Simular el movimiento con el fondo y la cámara; el suelo de la bestia es estático en código |
| El viaje puede sentirse como prisa | Choca con el ritmo cozy | Paradas sin límite estricto y posibilidad de pedir a la bestia que espere |
| Mucho contenido por región | Seis regiones y siete zonas son mucho trabajo para una persona | Reutilizar piezas con paletas distintas; empezar con tres regiones |
| Comparación con Spiritfarer | Comparte el concepto de hogar que viaja con huéspedes | Centrar la identidad en la bestia como ser vivo y en la granja, no en la despedida |

- **Riesgo propio del ASCII:** que no se lea bien. Para reducirlo, color por celda, celdas grandes, glifos propios y pruebas tempranas con jugadores que no conocen el estilo.

## Preguntas abiertas

- [ ] ¿ASCII clásico puro o fuente propia con glifos extra?
- [ ] ¿Habrá port a consolas más adelante y con qué herramienta?
- [ ] ¿Cuántas horas a la semana puedes dedicarle y qué plazo te pones para el prototipo?
- [ ] ¿Cooperativo desde el principio o como ampliación?
- [ ] ¿Mossback tiene una sola forma o puede variar por partida (especies distintas)?
- [ ] ¿Comprobar que el nombre está libre en Steam, itch.io y EUIPO?

