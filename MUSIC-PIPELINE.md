# Pipeline de música lo-fi con ComfyUI

Plan para reemplazar el loop sintetizado de 48 s (`compose()` en `app/solar.tsx`) por música lo-fi original, generada localmente en ComfyUI y reproducida en la web por disco.

## Punto de partida (verificado)

| | |
|---|---|
| ComfyUI | Desktop 0.34.0 en `http://127.0.0.1:8000` |
| GPU / RAM | RTX 2060 Max-Q **6 GB VRAM** · 16 GB RAM |
| Nodos de audio | `TextEncodeAceStepAudio1.5`, `EmptyAceStep1.5LatentAudio`, `VAEDecodeAudio`, `SaveAudioOpus/MP3`, `TrimAudioDuration`, `AudioConcat` |
| Modelos de audio instalados | ninguno |
| ffmpeg | 8.1.1 en PATH |
| Catálogo | 6 discos × 4 temas en `app/records.ts` (título, género, año, descripción) |

## Modelo

**Principal: ACE-Step 1.5 Turbo** — plantilla *ACE-Step 1.5 Music Generation AIO* (`audio_ace_step_1_5_checkpoint`).
- Checkpoint: `ace_step_1.5_turbo_aio.safetensors` → `models/checkpoints` (Comfy-Org/ace_step_1.5_ComfyUI_files). La plantilla declara ~10 GB.
- Sampler de la plantilla: 8 pasos, cfg 1, euler/simple. Instrumental con `lyrics: "[Instrumental]"`.
- Con 6 GB, ComfyUI descarga capas a RAM: funciona pero lento. Si da OOM o tarda demasiado: variante *split* con `qwen_0.6b_ace15` como encoder y `generate_audio_codes=false`.

**Alternativa local:** Stable Audio Open 1.0 (`stable-audio-open-1.0.safetensors` + `t5-base`). Cabe mejor en 6 GB, pero genera clips de ≤47 s: sirve para loops cortos, no para temas.

**Alternativa en la nube:** Comfy Cloud (cuenta ya conectada) para ACE-Step 1.5 XL si la GPU local no alcanza. Consume créditos.

> Antes de publicar: confirmar la licencia en la model card de ACE-Step 1.5 (y de Stable Audio Open si se usa, que tiene licencia comunitaria de Stability) y registrarla abajo, como se hizo con la imagen en `IMAGE-PROMPT.md`.

## Etapas

### 0 · Prueba de humo
1. Abrir la plantilla AIO en ComfyUI y dejar que descargue el checkpoint.
2. Generar 30 s con el prompt de *Blue Hours* (abajo). Medir tiempo y VRAM.
3. Decidir: AIO turbo / split 0.6B / Stable Audio / nube. Esa medición fija cuántas variantes por tema son razonables.

### 1 · Hoja de temas — `music/tracks.json`
Una entrada por tema, derivada de `records.ts`:
```json
{ "record": "blue-hours", "track": "sunday-5-am", "title": "Sunday, 5 AM",
  "tags": "…", "bpm": 72, "keyscale": "Bb major", "duration": 150, "seeds": [11, 12, 13], "chosen": null }
```

### 2 · Generación en lote — `scripts/music/generate.mjs`
- Exportar el workflow ajustado con *Export (API)* → `music/workflows/ace15-lofi.api.json`.
- El script lee `tracks.json`, parchea `tags`, `bpm`, `keyscale`, `duration`, `seed` y `filename_prefix` (`music/raw/<record>/<track>-<seed>`), envía a `POST /prompt`, sigue `/history/<id>` y baja el resultado con `/view`.
- Guardar en FLAC/WAV sin pérdida (la masterización codifica después). Reanudable: saltea lo que ya existe.

### 3 · Curaduría
Escuchar las variantes y marcar `chosen` en `tracks.json`. Criterios: sin voces fantasma, groove estable, sin cortes bruscos, dinámica suave para trabajar.

### 4 · Masterización y loop — `scripts/music/master.mjs` (ffmpeg)
1. Recortar a compases enteros: `bars = floor(duration·bpm/240)` → `bars·240/bpm` s.
2. Loop sin costura: cola cruzada con la cabeza (`acrossfade`, 2 compases).
3. Loudness: `loudnorm=I=-16:TP=-1.5:LRA=9` (dos pasadas), para que los 6 discos suenen parejos.
4. Codificar a `public/music/<record>/<track>.webm` (Opus 96 kbps, ~0,7 MB/min) y `.m4a` (AAC 128 kbps) para Safari.

### 5 · Integración web
- `records.ts`: `tracks` pasa de `string[]` a `{ title, src }[]`.
- `solar.tsx`: reemplazar `compose()` por un `HTMLAudioElement` conectado con `createMediaElementSource` al mismo `AnalyserNode` → streaming (un tema de 3 min decodificado en `AudioBuffer` ocupa ~70 MB), la aurora y la ciudad siguen reaccionando a graves y agudos.
- Playlist: al terminar un tema pasa al siguiente del disco; el dock muestra el título del tema.
- Quitar los `48` hardcodeados (usar `audio.duration`).
- `navigator.mediaSession` con título, disco y portada → controles del sistema con la pestaña en segundo plano.
- Desbloqueo: `audio.play()` debe llamarse dentro del clic sobre la portada (Safari); arrancar en silencio y subir el gain cuando el brazo baja a los 4,4 s.
- Mantener `compose()` como respaldo si el archivo no carga.

### 6 · Documentación
Registrar modelo, licencia, prompts y seeds elegidas en este archivo; actualizar README ("no utiliza servicios musicales" sigue siendo cierto si todo es local).

## Prompts base (instrumentales)

Sufijo común: `instrumental, no vocals, lo-fi, soft mix, gentle dynamics, warm tape saturation, subtle vinyl crackle, music for focus`

| Disco | Tags | BPM | Tonalidad |
|---|---|---|---|
| Solar — El Sur (psicodelia) | lo-fi psychedelic, warm fuzzed electric guitar with tape wobble, lazy dusty drums, round bass, hazy summer afternoon, 70s | 78 | E minor |
| Blue Hours — The Sunday Quartet (jazz) | lo-fi jazz hop, felt piano chords, muted trumpet, upright bass, brushed swing drums, soft rain, late night city | 72 | Bb major |
| After Dark — Luna (ambient) | nocturnal ambient, analog synth pads, slow arpeggio, distant radio signals, soft sub bass, barely any percussion, wide reverb | 60 | D minor |
| Jardín — Casa Abierta (latin) | lo-fi bossa nova, nylon guitar, wooden percussion and shaker, rhodes, warm round bass, sunny and relaxed | 84 | G major |
| Soft Signal — Forma (ambient electrónica) | lo-fi ambient electronica, soft granular textures, glassy gentle melody, muted kick, warm pads, intimate | 70 | F major |
| Frecuencia — Estudio 84 (electrónica) | lo-fi electronic, analog drum machine, repetitive synth bassline, arpeggiated synth, hypnotic steady pulse | 84 | A minor |

Cada uno de los 4 temas de un disco varía instrumentación y energía dentro del mismo carácter (por ejemplo, *Luz de enero* más luminoso, *Hasta desaparecer* más espacioso).

## Alcance sugerido
- **MVP:** 1 tema por disco (6 × 2,5 min), 3 seeds cada uno → 18 generaciones.
- **Completo:** 24 temas → ~72 generaciones; ~100 MB en Opus + AAC.

## Registro
**Etapa 0 (2026-09-15):** ACE-Step 1.5 Turbo AIO (`ace_step_1.5_turbo_aio.safetensors`, 10,03 GB, en `C:\Users\mboth\ComfyUI-Shared\models\checkpoints`). Prueba *Blue Hours*, seed 31, 30 s, `generate_audio_codes=true`: **455 s en la RTX 2060 Max-Q (15,2× tiempo real, incluye la primera carga del modelo)**. Salida FLAC 48 kHz estéreo, −14,4 LUFS integrados, pico 0,0 dBFS → la masterización (etapa 4) debe bajar el pico a −1,5 dBTP.

A ese ritmo un tema de 150 s tarda ~35–40 min: el MVP con 3 seeds por disco (18 generaciones) serían ~11 h. Opciones: 1 seed por tema y re-generar solo los que no convencen; probar `generate_audio_codes=false`; o correr el lote en Comfy Cloud.

_Licencia y seeds elegidas: pendiente._
