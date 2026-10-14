# Editor de video (Remotion + Whisper + Claude)

## Modo nube (recomendado, no instala nada en tu Mac)
Todo corre en GitHub Actions (gratis):
1. Deja tu video en Descargas y dile a Claude: "edita IMG_xxxx con estilo juesar".
2. Claude lo sube a `entrada/`, lanza **Actions → Editar video** y te devuelve el video final.
También puedes hacerlo tú: sube el video a `entrada/` en la web de GitHub (máx. 25 MB) y en
**Actions → Editar video → Run workflow** escribe `entrada/tu-video.mp4`.
El video queda para descargar en la ejecución (sección *Artifacts*) y el guion en `resultados/`.

Claves opcionales (Settings → Secrets and variables → Actions): `OPENAI_API_KEY` (mejores imágenes),
`PEXELS_API_KEY` (videos reales gratis), `ANTHROPIC_API_KEY` (mejor director de escenas).
Sin claves funciona gratis con Pollinations.

---
## Modo local (opcional)

## Instalar (una sola vez, en la Terminal de tu Mac)
1. Si no tienes Homebrew: https://brew.sh (copia y pega el comando de esa página)
2. `brew install node`
3. Entra a la carpeta:  `cd ~/Downloads/editor-novalapp`
4. `npm run instalar`   (instala Remotion, FFmpeg y Whisper)

## Copiar el estilo de un video de referencia
1. Pon la referencia en la carpeta `Referencia/`
2. `npm run analizar -- Referencia/VIDEO.mp4 nombre-del-estilo`
3. Pídele a Claude: "Estudia estilos/nombre-del-estilo y crea el estilo" (solo una vez por referencia)
4. Edita tus videos con ese estilo:  `npm run auto -- MI_VIDEO.MOV --estilo nombre-del-estilo`

Estilos listos: `reels` y `juesar`.
Música de fondo: pon un archivo `public/musica.mp3` (de una librería libre de derechos) y se agrega sola.

## Editar un video (3 comandos)
1. Pon tu video en esta carpeta (ej: `IMG_4828.MOV`)
2. `npm run auto -- IMG_4828.MOV --estilo juesar`
   → crea una copia ligera, transcribe tu voz y llena `guion.json` con textos de apoyo y zooms sincronizados.
   (La primera vez descarga el modelo de voz, ~470 MB.)
3. `npm run editor` → se abre el editor en el navegador con vista previa en vivo.
4. `npm run render` → exporta `out/video.mp4` listo para publicar.

## Escenas de apoyo automáticas (imágenes con IA, videos y animaciones)
`npm run auto` ya las crea solo: Claude lee lo que dices, decide qué se ve en cada frase y el editor genera las imágenes.
- Requiere Claude Code en tu Mac (una vez): `npm install -g @anthropic-ai/claude-code` y luego `claude` para entrar con tu cuenta.
- Imágenes gratis por defecto (Pollinations). Para más calidad usa OpenAI: copia `.env.ejemplo` como `.env` y pon tu clave.
  Ojo: ChatGPT Plus NO incluye la API; se paga aparte por uso.
- Videos reales gratis: pon tu clave de Pexels en `.env`.
- Rehacer solo las imágenes: `npm run escenas -- --solo-imagenes` (no vuelve a gastar en las que ya existen).
- Para cambiar una escena: edita su `prompt` en `guion.json`, borra su archivo en `public/escenas/` y corre el comando anterior.

## Ajustes
- Textos, colores, hologramas y zooms: todo está en `guion.json`.
- Holograma: `"posicion": "arriba"` (pequeño, no tapa la cara) o `"centro"` (grande, con proyector).
- Modelo de voz más rápido: `MODELO=base npm run auto -- video.MOV`  (más preciso: `MODELO=medium`).

## Pedirle ediciones a Claude
Abre esta carpeta en Claude y di, por ejemplo:
"Revisa guion.json y agrega un holograma cuando hablo de precios, y corrige palabras mal transcritas."
