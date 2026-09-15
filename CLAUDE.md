@AGENTS.md

# Lo Fi Studio

Experiencia web de escucha ambiental lo-fi para acompañar el trabajo. El usuario entra (cámara animada) a un loft 3D procedural, elige uno de seis vinilos ficticios de la consola, el disco viaja al tocadiscos y empieza a sonar un canal en vivo de SomaFM asociado a ese disco. Mientras suena, una aurora exterior reactiva al audio (con colores y dinámica propios de cada disco) ilumina el ambiente, nieva sobre una ciudad estilo Brooklyn y un reproductor de vidrio líquido controla la escucha. Todo corre en el cliente, sin backend. Servicios externos: los streams y el "qué suena ahora" de SomaFM (radio independiente sostenida por oyentes; el dock muestra el crédito con enlace al canal), y de forma opcional clima (Open-Meteo) y nombre de ciudad (BigDataCloud), solo si el visitante toca el cartel de ubicación. Sin conexión, suena el loop sintetizado local. El pipeline alternativo para música original generada con ComfyUI está en `MUSIC-PIPELINE.md` (en pausa).

UI y copy en español rioplatense (voseo: "Activá", "Intentá"); comentarios de código en inglés.

## Comandos

```sh
npm run dev        # next dev en http://127.0.0.1:3000 (host fijo en 127.0.0.1)
npm run build      # build de producción
npm run typecheck  # tsc --noEmit — la única verificación automática
```

No hay tests, linter ni formatter configurados. Para validar cambios visuales hay que levantar `npm run dev` y mirar la escena en el navegador (probar también ancho mobile: la cámara cambia con `camera.aspect < .8`).

## Stack

- **Next.js 16.3** (App Router) + React 19 + TypeScript strict. Leer `node_modules/next/dist/docs/` antes de tocar APIs de Next (ver AGENTS.md).
- **three** 0.186 para el loft; WebGL crudo para el shader 2D de `solar.tsx`.
- **Web Audio API**: `<audio>` con el stream → `MediaElementSource` → analizador (graves/agudos/golpes para la escena). Síntesis offline a `AudioBuffer` solo como respaldo.
- `lucide-react` para íconos. `motion` está instalado pero **no se usa**.
- Alias `@/*` → raíz del repo.

## Arquitectura

```
app/layout.tsx    Metadata + <html lang="es">, importa globals.css
app/page.tsx      "use client" → <Solar/>
app/solar.tsx     Orquestador: audio (pausa/reanudar, volumen persistido, detección de golpes), teclado
                  (Espacio, ←/→, M), Media Session, shader 2D ambiental; monta <Loft/> y <Dock/>
app/dock.tsx      Reproductor "liquid glass": portada, transporte con anillo de progreso, visualizador, volumen.
                  Niveles y progreso se escriben a estilos desde su propio rAF (sin re-render por frame)
app/place.tsx     Cartel de ciudad/clima/hora. Sin permiso: ciudad por zona horaria. Al tocarlo pide geolocalización,
                  redondea a ~1 km y consulta Open-Meteo + BigDataCloud; cachea 30 min en localStorage
app/moods.ts      Carácter visual por disco: colores de aurora, velocidad, amplitud, ganancias, nieve y viento
app/snow.ts       Nieve en tres capas de THREE.Points animadas en el vertex shader (afuera, junto al vidrio, claraboya)
app/loft.tsx      Escena Three.js completa: renderer, luces, arquitectura base, consola, tocadiscos,
                  raycasting de portadas, secuencia de cámara/disco, loop de render, cleanup
app/aurora.ts     ShaderMaterial del cielo (esfera BackSide r=28) — uniforms time/intensity/bass/high/palette
app/lounge.ts     Living: Chesterfield, alfombra persa procedural (texturas en canvas), dos sillas BKF
                  (marco de dos varillas curvadas en X + eslinga de cuero con pliegues y bolsillos),
                  lámpara de arco y libros. Todo se re-parenta al grupo `living` (z −2.4)
app/architecture.ts  Detalles arquitectónicos extra (acero, óxido, lino, texturas de ruido)
app/gallery.ts    Cuadros enmarcados con arte original dibujado en canvas: par de cuadros iguales y alineados sobre la
                  consola DJ (pared del pilar, x −5.8) y 2 piezas grandes arriba en la pared del fondo (z −4.6)
app/workspace.ts  Rincón habitado junto al pilar de ladrillo: mesa de nogal con consola DJ y un atril.
                  Props a escala real × S=1.4 (el loft está construido ~1.4×)
app/city.ts       Brooklyn desde un 4.º piso, a escala real en metros (M=.56 unidades/m, calle en y=−14·M):
                  brownstones/conventillos con tanques y árboles, depósitos, río con puente colgante, Manhattan
                  a 1–2 km y Midtown en la bruma. Todas las masas son instancias de un box; las fachadas
                  (6 estilos: ventanas, dinteles, escaleras de incendio, locales) se resuelven en el shader vía
                  aStyle por instancia, con LOD por fwidth para que las grillas lejanas no parpadeen.
                  update(time, night): atardecer en reposo, noche con ventanas encendidas al sonar música
app/brick.ts      Textura de ladrillo pintado generada en canvas (PRNG con seed fija → determinista)
app/records.ts    Catálogo de 6 discos + `crop` [x,y,w,h] sobre el atlas 1536×1024
app/globals.css   Todo el CSS (una sola hoja, reglas minificadas en líneas largas)
public/vinyl-table.png  Atlas de portadas (arte IA, prompt en IMAGE-PROMPT.md)
```

### Flujo de datos Solar ↔ Loft

`Solar` pasa tres callbacks a `Loft`:
- `onPrepare(index)` → `prepare()` — al hacer clic en una portada: crea/reanuda el `AudioContext` y el `<audio>` (tiene que ser dentro del gesto del usuario), sintoniza el canal y lo reproduce **con gain 0**, así el stream carga durante la animación.
- `onPlay(index)` → `begin()` — ~4.4 s después, cuando el brazo bajó: fija `currentRecord`, elige el ambiente (`index 1 → 1 Marea`, `index 3 → 2 Bosque`, resto → `0 Órbita`) y sube el gain con fundido.
- `getAudio()` — llamado **en cada frame** por Loft; devuelve `{bass, high, beat, playing, record}` leyendo el `AnalyserNode`. `beat` es una envolvente que salta a 1 en cada ataque de graves sobre su promedio y decae. Mantenerlo barato.
- `onPhase(phase)` — Loft avisa `loading/ready/placing/listening`; Solar deshabilita el transporte durante `placing`.
- `api` — ref que Loft completa con `{ select(index) }`; anterior/siguiente del dock la usan para repetir la animación de cambio de disco.

Loft guarda los callbacks en un ref (`callbacks.current`) porque el `useEffect` de la escena corre una sola vez (`[]`). Mismo patrón con `environmentRef`/`roomVisible` en Solar: el loop de render lee refs, no estado de React.

### Audio (`solar.tsx`)

- Cada disco en `records.ts` tiene `station: { id, name }`; el stream es `https://ice1.somafm.com/<id>-128-mp3` (enlaces permanentes, CORS abierto → el analizador funciona). Mapeo: Solar→Groove Salad, Blue Hours→Sonic Universe, After Dark→Deep Space One, Jardín→Illinois Street Lounge, Soft Signal→Space Station Soma, Frecuencia→Fluid.
- Grafo: `<audio crossOrigin=anonymous>` → `MediaElementSource` → `Analyser(fftSize 512)` → `Gain(volume)` → destination. El loop de respaldo (`startSynth`) entra por el mismo analizador.
- Estados (`StreamStatus`): `connecting` → `live` (evento `playing`) · `idle` en pausa · `offline` si el `<audio>` falla o `play()` rechaza con algo distinto de `AbortError`; ahí `fallback()` pasa a `compose()` (cacheado por disco).
- Pausar es radio: fundido a 0 y se suelta el stream (`release()`); reanudar vuelve a sintonizar el borde en vivo. Anterior/siguiente cambian de disco = de canal.
- "Qué suena ahora": `https://somafm.com/songs/<id>.json` → `songs[0].{title,artist}`, cada 30 s mientras está en vivo; alimenta el dock y Media Session.
- `compose()` sigue sintetizando 48 s por disco (`variant` 0–5) pero solo como respaldo.
- **Vista previa del Browser pane (app de escritorio de Claude):** SomaFM responde **403 `text/html` a cualquier User-Agent que contenga `Claude/…`** (verificado con curl: el mismo pedido con UA de Chrome da 206 `audio/mpeg`). En ese panel en modo escritorio el `<audio>` da "Format error" y la app cae al respaldo `offline`. Para probar la radio: Chrome/Edge normales, o el panel en viewport **Mobile** (emula UA de Chrome Android) — así se verificó en vivo con Sonic Universe, "qué suena ahora" y analizador funcionando. No es un bug del código.

### Escena 3D (`loft.tsx`)

- Helpers locales `box / cylinder / sphere(…, material, parent = scene)` que ya activan sombras. Materiales vía `mat(color, roughness, metalness)`.
- **Gestión de memoria:** todo material y textura creado debe pushearse a los arrays `materials` / `textures`; el cleanup del effect los libera junto con geometrías y renderer. Los módulos `addLounge` / `addArchitecturalDetails` reciben esos arrays con la firma `(scene, materials, textures)` — seguir esa convención para nuevos módulos.
- **Console rig (trampa):** todo lo agregado a `scene` entre `const consoleStart = scene.children.length` y `scene.children.slice(consoleStart)` se re-parenta a `consoleRig` (rotado π/2 y trasladado). Las coordenadas de esa sección — y las del disco animado — están en espacio local del rig; usar `rigPoint()` para pasar a mundo. Agregar objetos no relacionados con la consola **después** del slice.
- Secuencia al elegir disco (segundos desde `selectedAt`): extracción 0–1.2 → traslado 1.2–2.7 → apoyo 2.7–3.8 → brazo 3.8–4.3 → `onPlay` a 4.4 → retirada de cámara hacia el ventanal 4.4–7.9 (FOV 51→70). Al pausar, `pauseBlend` devuelve la cámara a la vista de consola.
- Reactividad: `auroraLevel` sube al reproducir, baja sol/hemi/fill y sube tres PointLights de color moduladas por graves/agudos y por `beat`. El estado `mood` interpola hacia `moods[record.id]` (colores de aurora, velocidad, amplitud, ganancias, densidad y viento de la nieve), así que cambiar de disco hace un fundido de ~2 s. Las tres luces interiores quedan siempre en la paleta cálida de Solar (`warmA/B/C`, `WARMTH=.8`) y solo toman un 20 % del color del disco.
- Portadas: `atlas.clone()` por disco con `repeat/offset` calculados desde `records[i].crop`. Si se cambia el atlas, actualizar los crops.
- Picking con `Raycaster` sobre `fronts`; `userData.index` identifica el disco.
- Exterior: la esfera del cielo (r=28, sin escritura de profundidad) tiene `renderOrder=-1` para que el skyline que está más allá la tape. La cámara llega a far=3600 y la niebla (40–2800, 4200 de noche) solo alcanza la ciudad; su color va del atardecer a la noche con `auroraLevel`.

### Accesibilidad y robustez (mantener)

- `prefers-reduced-motion`: sin intro animada, secuencia instantánea, sin modulación por audio.
- Botones ocultos `.loft-keyboard` permiten elegir discos con Tab/Enter; si WebGL falla o se pierde el contexto, se muestran como `.loft-fallback`.
- El render se saltea con `document.hidden`; pixel ratio limitado (1.7 loft, 1.5 shader 2D). El audio sigue sonando en otra pestaña.

## Estado actual / deuda conocida

El README describe algunas cosas que el código ya no tiene; confiar en el código:

- **No hay** selector de ambientes (Órbita/Marea/Bosque): el `environment` del shader 2D se asigna según el disco y el carácter visual de la escena 3D sale de `moods.ts`.
- `showDiscs` nunca pasa a `false`, así que el shader 2D ambiental de `solar.tsx` (que solo renderiza con el loft oculto), el botón `.open-discs` y el foco a `playButton` son hoy código inalcanzable. El loft queda montado siempre.
- `globals.css` arrastra mucho CSS de una versión anterior (mesa fotográfica, header, `.record-dialog`, `.solar-title`, `.disc-picker`…) que ya no se usa. `public/library.jpg` tampoco se referencia.
- Campos `description`, `tracks`, `genre`, `year` de `records.ts` no se muestran en la UI actual.

No borrar esto sin confirmar con la usuaria: puede ser trabajo a medio camino que quiere retomar.

## Estilo de código

- Los archivos Three.js están escritos en formato muy denso (varias sentencias por línea, sin espacios). Al editar, respetar el estilo del bloque circundante en vez de reformatear archivos enteros — reformatear rompe los diffs.
- Sin librerías de animación: interpolación manual con `THREE.MathUtils.lerp` y `ease` (smoothstep) dentro del `requestAnimationFrame`.
- Todo el contenido es original/ficticio; no reutilizar fotogramas ni assets de referencias (Entergalactic, Basement Studio) como texturas.

## Notas de entorno

- El repo está dentro de OneDrive (Windows); la sincronización puede bloquear `node_modules`/`.next` durante builds.
- Repo en GitHub: https://github.com/meryboth/lofi-studio (rama `main`). Pensado para deploy en Vercel sin variables de entorno.
