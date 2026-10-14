# Instrucciones para Claude: Editor de video de Henry

Proyecto Remotion (vertical 1080x1920, 30fps). Objetivo: replicar el estilo de un video de
referencia en los videos de Henry, gastando pocos créditos.

## Flujo
1. Referencia nueva → `npm run analizar -- Referencia/video.mp4 <nombre>`
   crea `estilos/<nombre>/datos.json` (cortes, ritmo) y `capturas/` (hojas de 12 s + detalles de animación).
2. Claude estudia SOLO esas capturas (no el video completo) y escribe `estilos/<nombre>/estilo.json`.
   Si el estilo necesita un efecto nuevo, crearlo UNA vez en `src/components/` y conectarlo en `Edicion.tsx`
   según `estilo.nombre`.
3. Video de Henry → `npm run auto -- VIDEO.MOV --estilo <nombre>`: transcribe y genera `guion.json`.
4. Claude revisa `guion.json`: corrige palabras mal transcritas, decide frases en `"modo": "glow"`,
   mueve textos (`x`,`y` de 0 a 1) para no tapar caras, agrega hologramas.
5. Verificar con `npx remotion still` en 2-3 frames, no renders completos.

## Escenas de apoyo
- `npm run escenas` (lo llama `auto`): Claude Code decide el plan (`guion.escenas`) y se generan imágenes/videos en `public/escenas/`.
- Si te piden "haz el plan de escenas" en el chat: lee `tmp/pedido-director.txt`, escribe `guion.escenas` con ese formato
  y pide correr `npm run escenas -- --solo-imagenes`.
- Tipos: imagen (IA), video (Pexels), numero, titulo, lista. Prompts en inglés, sin texto en la imagen.

## Ahorro de créditos
- No reescribir componentes por video. Solo editar `guion.json`.
- No volver a analizar una referencia que ya tiene `estilo.json`.

## Estilos guardados
- `reels`: subtítulos grandes MAYÚSCULAS, palabra clave amarilla, hologramas cian, zooms punch-in.
- `juesar`: cinematográfico oscuro teal + viñeta + grano; subtítulos Inter pequeños en minúscula,
  palabra por palabra (gris → blanco); frases fuertes con brillo + aberración cromática;
  cambio de plano cada ~3.5 s con empuje lento; música suave (`public/musica.mp3`).

## Componentes
- `TextoApoyo` (reels), `TextoCine` (juesar), `LookCine` (look juesar), `Holograma`, `Fondo`
- `guion.planos`: simulan cortes de cámara con un solo video (encuadre + empuje lento)
- `guion.zooms`: punch-in rápidos
