// Escenas de apoyo automáticas.
// 1) DIRECTOR: Claude (Claude Code en tu Mac) lee lo que dices y decide qué se ve en cada frase.
// 2) GENERADOR: crea/descarga cada imagen o video (OpenAI, Pollinations gratis o Pexels gratis).
// Uso:  npm run escenas            (plan + imágenes)
//       npm run escenas -- --solo-imagenes   (usa el plan que ya está en guion.json)
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
cargarEnv();

const guionPath = path.join(raiz, 'guion.json');
const g = JSON.parse(fs.readFileSync(guionPath, 'utf8'));
const nombreEstilo = g.estilo?.nombre || 'reels';
const E = JSON.parse(fs.readFileSync(path.join(raiz, 'estilos', nombreEstilo, 'estilo.json'), 'utf8'));
const dirEscenas = path.join(raiz, 'public', 'escenas');
fs.mkdirSync(dirEscenas, {recursive: true});

// ---------- 1) DIRECTOR ----------
if (!args.includes('--solo-imagenes') || !g.escenas?.length) {
  const transcripcion = g.textos.map((t) => `[${t.inicio.toFixed(1)}-${t.fin.toFixed(1)}] ${t.texto}`).join('\n');
  const instrucciones = `Eres director de edición de videos verticales cortos. Estilo: ${E.descripcion}
Video de ${g.duracionSegundos}s. Transcripción con tiempos (segundos):
${transcripcion}

Diseña escenas de apoyo visual. Reglas:
- Los primeros 2 s y los últimos 1.5 s se ve a la persona (sin escenas).
- Cubre entre 30% y 45% del video con escenas de 1.5 a 3.5 s, alineadas a las frases (inicio/fin de los tiempos).
- Tipos: "imagen" (escena generada con IA: metáfora visual de lo que se dice), "video" (clip real de stock: algo concreto y común),
  "numero" (cuando se dice una cifra/precio/porcentaje), "titulo" (1-3 palabras clave enormes), "lista" (cuando se enumeran cosas).
- Usa sobre todo "imagen"; "numero"/"titulo"/"lista" solo cuando aporten.
- "prompt" en INGLÉS, concreto y visual, vertical 9:16, sin texto en la imagen. "busqueda" en inglés, 2-3 palabras.
Responde SOLO con JSON válido, sin explicación:
{"escenas":[{"inicio":2.1,"fin":4.3,"tipo":"imagen","prompt":"...","busqueda":"..."},
{"inicio":6,"fin":8,"tipo":"numero","valor":"15","etiqueta":"modelos nuevos"},
{"inicio":9,"fin":11,"tipo":"titulo","texto":"envíos gratis"},
{"inicio":12,"fin":15,"tipo":"lista","titulo":"incluye","items":["a","b","c"]}]}`;
  fs.mkdirSync(path.join(raiz, 'tmp'), {recursive: true});
  fs.writeFileSync(path.join(raiz, 'tmp', 'pedido-director.txt'), instrucciones);
  const respuesta = await director(instrucciones);
  const m = respuesta && respuesta.match(/\{[\s\S]*\}/);
  let plan = null;
  try { plan = m ? JSON.parse(m[0]).escenas : null; } catch { console.log('  ⚠ Plan inválido; uso el director básico.'); }
  g.escenas = Array.isArray(plan) ? plan : directorBasico();
  // seguridad: escenas dentro del video y sin solaparse
  g.escenas = g.escenas.filter((e) => e.inicio >= 0 && e.fin <= g.duracionSegundos && e.fin - e.inicio >= 0.8)
    .sort((x, y) => x.inicio - y.inicio).filter((e, i, arr) => i === 0 || e.inicio >= arr[i - 1].fin);
}

// ---------- 2) GENERADOR ----------
const proveedor = process.env.IMAGENES || (process.env.OPENAI_API_KEY ? 'openai' : 'pollinations');
const estiloImg = E.promptImagen || 'cinematic, photorealistic, dramatic lighting, shallow depth of field, film grain';
console.log(`▶ Generando escenas (imágenes: ${proveedor}${process.env.PEXELS_API_KEY ? ' + videos Pexels' : ''})...`);
for (const [i, e] of g.escenas.entries()) {
  if (!['imagen', 'video'].includes(e.tipo)) continue;
  if (e.archivo && fs.existsSync(path.join(raiz, 'public', e.archivo))) continue; // ya existe: no gastar
  const base = `escenas/escena-${String(i + 1).padStart(2, '0')}`;
  try {
    if (e.tipo === 'video' && process.env.PEXELS_API_KEY) {
      e.archivo = await pexels(e.busqueda || e.prompt, `${base}.mp4`);
    } else {
      if (e.tipo === 'video') e.tipo = 'imagen';
      e.archivo = await imagen(`${e.prompt}, ${estiloImg}, vertical 9:16 composition, no text`, `${base}.jpg`, i);
    }
    console.log(`  ✔ ${e.archivo}  ← ${(e.prompt || e.busqueda).slice(0, 60)}`);
  } catch (err) {
    console.log(`  ✖ escena ${i + 1}: ${err.message} (se omite)`);
    e.tipo = 'omitida';
  }
}
g.escenas = g.escenas.filter((e) => e.tipo !== 'omitida');

// Durante escenas a pantalla completa, los textos pasan a modo "glow" y al centro (como la referencia)
const llenas = g.escenas.filter((e) => ['imagen', 'video'].includes(e.tipo));
g.textos.forEach((t) => {
  if (llenas.some((e) => t.inicio >= e.inicio - 0.1 && t.inicio < e.fin)) { t.modo = 'glow'; t.y = 0.42; }
});
fs.writeFileSync(guionPath, JSON.stringify(g, null, 2));
console.log(`✔ ${g.escenas.length} escenas en guion.json. Revisa con:  npm run editor`);

// ---------- director: Claude Code → API de Claude → Pollinations (gratis) → básico ----------
async function director(pedido) {
  try {
    if (tiene('claude')) {
      console.log('▶ Director: Claude Code está planeando las escenas...');
      return spawnSync('claude', ['-p', pedido, '--output-format', 'text'], {encoding: 'utf8', maxBuffer: 1 << 24}).stdout;
    }
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('▶ Director: Claude (API) está planeando las escenas...');
      const r = await fetch('https://api.anthropic.com/v1/messages', {method: 'POST',
        headers: {'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
        body: JSON.stringify({model: process.env.ANTHROPIC_MODELO || 'claude-sonnet-4-5', max_tokens: 4000, messages: [{role: 'user', content: pedido}]})});
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || r.statusText);
      return j.content[0].text;
    }
    console.log('▶ Director: IA gratis (Pollinations) está planeando las escenas...');
    const r = await fetch('https://text.pollinations.ai/openai', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({model: 'openai', messages: [{role: 'user', content: pedido}]})});
    if (!r.ok) throw new Error(r.statusText);
    return (await r.json()).choices[0].message.content;
  } catch (err) {
    console.log(`  ⚠ El director no respondió (${err.message}); uso el director básico.`);
    return null;
  }
}

// Sin IA: una escena cada ~3 frases, ilustrando la frase
function directorBasico() {
  const out = [];
  g.textos.forEach((t, i) => {
    if (i % 3 !== 1 || t.inicio < 2 || t.fin > g.duracionSegundos - 1.5) return;
    const num = t.texto.match(/[$]?\d[\d.,]*%?/);
    out.push(num ? {inicio: t.inicio, fin: Math.min(t.inicio + 2.5, g.duracionSegundos - 1.5), tipo: 'numero', valor: num[0], etiqueta: ''}
      : {inicio: t.inicio, fin: Math.min(t.inicio + 2.5, g.duracionSegundos - 1.5), tipo: 'imagen', prompt: `cinematic scene that visually represents: "${t.texto}"`, busqueda: t.texto});
  });
  return out;
}

// ---------- proveedores ----------
async function imagen(prompt, archivo, semilla) {
  const destino = path.join(raiz, 'public', archivo);
  if (proveedor === 'openai') {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({model: process.env.OPENAI_MODELO || 'gpt-image-1', prompt, size: '1024x1536', quality: process.env.OPENAI_CALIDAD || 'medium', n: 1}),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.statusText);
    fs.writeFileSync(destino, Buffer.from(j.data[0].b64_json, 'base64'));
  } else if (proveedor === 'prueba') {
    // sin internet: imagen de prueba
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `gradients=s=1080x1920:seed=${semilla}:duration=1`, '-frames:v', '1', destino]);
  } else {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1920&nologo=true&model=flux&seed=${semilla + 7}`;
    await descargar(url, destino);
  }
  return archivo;
}

async function pexels(busqueda, archivo) {
  const r = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(busqueda)}&orientation=portrait&per_page=5`,
    {headers: {Authorization: process.env.PEXELS_API_KEY}});
  const j = await r.json();
  const files = (j.videos || []).flatMap((v) => v.video_files).filter((f) => f.height >= 1280 && f.height <= 2400 && f.width < f.height);
  if (!files.length) throw new Error(`sin resultados en Pexels para "${busqueda}"`);
  await descargar(files[0].link, path.join(raiz, 'public', archivo));
  return archivo;
}

async function descargar(url, destino) {
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const r = await fetch(url, {signal: AbortSignal.timeout(120000)});
      if (r.ok) { fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer())); return; }
    } catch {}
    await new Promise((ok) => setTimeout(ok, 3000 * intento));
  }
  throw new Error('no se pudo descargar');
}

function tiene(cmd) { try { execFileSync('which', [cmd], {stdio: 'ignore'}); return true; } catch { return false; } }
function cargarEnv() {
  const f = path.join(raiz, '.env');
  if (!fs.existsSync(f)) return;
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
