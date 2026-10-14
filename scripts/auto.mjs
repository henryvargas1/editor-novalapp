// Editor automático: prepara el video, lo transcribe con Whisper (local, gratis)
// y genera guion.json con textos de apoyo y zooms sincronizados.
// Uso:  npm run auto -- MI_VIDEO.MOV --estilo juesar   (estilos en la carpeta estilos/)
//       --sin-escenas  para no generar imágenes de apoyo
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const opcion = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const desdeJson = opcion('--desde-json');
const usarGuion = opcion('--usar-guion'); // re-exportar con un guion ya hecho (no transcribe)
const nombreEstilo = opcion('--estilo') || 'reels';
const entrada = args.find((a, i) => !a.startsWith('--') && !(args[i - 1]?.startsWith('--') && !['--sin-escenas'].includes(args[i - 1])));
const estiloPath = path.join(raiz, 'estilos', nombreEstilo, 'estilo.json');
if (!fs.existsSync(estiloPath)) throw new Error(`No existe el estilo "${nombreEstilo}" (estilos/${nombreEstilo}/estilo.json)`);
const E = JSON.parse(fs.readFileSync(estiloPath, 'utf8'));
if (!entrada) {
  console.log('Uso: npm run auto -- MI_VIDEO.MOV');
  process.exit(1);
}
const MODELO = process.env.MODELO || 'small'; // tiny | base | small | medium
const run = (cmd, a) => execFileSync(cmd, a, {stdio: ['ignore', 'pipe', 'inherit']}).toString();
const tiene = (cmd) => { try { execFileSync('which', [cmd], {stdio: 'ignore'}); return true; } catch { return false; } };

const src = [entrada, path.join(raiz, entrada), path.join(raiz, 'public', entrada)].find((p) => fs.existsSync(p));
if (!src) throw new Error(`No encuentro el video: ${entrada}`);
fs.mkdirSync(path.join(raiz, 'public'), {recursive: true});
fs.mkdirSync(path.join(raiz, 'tmp'), {recursive: true});

// 1) Copia ligera 1080x1920 para editar rápido
const clip = 'clip.mp4';
const clipPath = path.join(raiz, 'public', clip);
console.log('▶ 1/3 Preparando video 1080x1920...');
run('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
  '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '192k', path.join(raiz, 'tmp', 'clip.mp4')]);
fs.renameSync(path.join(raiz, 'tmp', 'clip.mp4'), clipPath); // así se puede usar public/clip.mp4 como entrada
const duracion = parseFloat(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clipPath]));

if (usarGuion) {
  const gu = JSON.parse(fs.readFileSync(usarGuion, 'utf8'));
  gu.video = clip;
  fs.writeFileSync(path.join(raiz, 'guion.json'), JSON.stringify(gu, null, 2));
  console.log(`✔ Usando guion existente: ${usarGuion}`);
  process.exit(0);
}

// 2) Transcripción palabra por palabra
let palabras;
if (desdeJson) {
  palabras = leerWhisper(JSON.parse(fs.readFileSync(desdeJson, 'utf8')));
} else {
  const wav = path.join(raiz, 'tmp', 'audio.wav');
  run('ffmpeg', ['-loglevel', 'error', '-y', '-i', clipPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav]);
  const salida = path.join(raiz, 'tmp', 'transcripcion');
  const whisper = ['whisper-cli', 'whisper-cpp'].find(tiene);
  console.log('▶ 2/3 Transcribiendo audio...');
  if (whisper) {
    const modelo = path.join(raiz, 'modelos', `ggml-${MODELO}.bin`);
    if (!fs.existsSync(modelo)) {
      console.log(`  Descargando modelo de voz "${MODELO}" (solo la primera vez)...`);
      fs.mkdirSync(path.dirname(modelo), {recursive: true});
      run('curl', ['-L', '--fail', '-o', modelo, `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${MODELO}.bin`]);
    }
    run(whisper, ['-m', modelo, '-f', wav, '-l', 'es', '-ml', '1', '-sow', '-oj', '-of', salida, '-np']);
  } else {
    // en la nube (GitHub Actions): faster-whisper en Python
    execFileSync('python3', [path.join(raiz, 'scripts', 'transcribir.py'), wav, `${salida}.json`], {stdio: 'inherit'});
  }
  const json = JSON.parse(fs.readFileSync(`${salida}.json`, 'utf8'));
  fs.copyFileSync(`${salida}.json`, path.join(raiz, 'public', 'transcripcion.json'));
  palabras = leerWhisper(json);
}

// 3) Guion automático
console.log('▶ 3/3 Generando guion.json...');
const guionPath = path.join(raiz, 'guion.json');
const textos = agrupar(palabras, E.maxPalabras || 4);
const clave = (t) => (t.resaltar || []).length > 0;
if (E.nombre === 'juesar') {
  textos.forEach((t) => { t.texto = t.texto.toLowerCase(); t.y = E.textoY; if (E.glow === 'clave' && clave(t) && /\d|\p{L}{8,}/u.test(t.texto)) t.modo = 'glow'; delete t.resaltar; });
}
const zooms = E.zooms ? textos.filter((_, i) => i % 3 === 0 && i > 0).map((t, i) => ({inicio: t.inicio, escala: i % 2 ? 1.15 : 1.1})) : [];
// planos: un cambio de encuadre cada ~ritmo segundos, siempre al inicio de una frase
const planos = [];
if (E.ritmoPlanos) {
  let ultimo = -99;
  textos.forEach((t) => { if (t.inicio - ultimo >= E.ritmoPlanos) { planos.push({inicio: t.inicio, escala: E.escalasPlanos[planos.length % E.escalasPlanos.length]}); ultimo = t.inicio; } });
  if (planos.length) planos[0].inicio = 0;
}
const musica = fs.readdirSync(path.join(raiz, 'public')).find((f) => /^musica\.(mp3|m4a|wav)$/i.test(f));
const guion = {
  video: clip,
  duracionSegundos: Math.round(duracion * 100) / 100,
  estilo: {nombre: E.nombre, color: E.color, acento: E.acento},
  textos,
  hologramas: [], // agrégalos a mano o pídeselo a Claude
  zooms,
  planos,
  ...(musica ? {musica, volumenMusica: E.volumenMusica ?? 0.15} : {}),
};
fs.writeFileSync(guionPath, JSON.stringify(guion, null, 2));
console.log(`✔ Guion (estilo ${E.nombre}): ${textos.length} textos, ${planos.length} planos, ${zooms.length} zooms.`);

// 4) Escenas de apoyo (imágenes IA, videos, animaciones) — todo de una vez
if (!args.includes('--sin-escenas') && !desdeJson) {
  const {spawnSync} = await import('node:child_process');
  spawnSync('node', [path.join(raiz, 'scripts', 'escenas.mjs')], {stdio: 'inherit', cwd: raiz});
} else {
  console.log('Abre el editor con:  npm run editor');
}

// ---------- utilidades ----------
function leerWhisper(json) {
  return (json.transcription || [])
    .map((s) => ({w: s.text.trim(), s: s.offsets.from / 1000, e: s.offsets.to / 1000}))
    .filter((p) => p.w && !/^\[.*\]$/.test(p.w));
}

// Agrupa en bloques de máx. 4 palabras, cortando en pausas y puntuación
function agrupar(ps, max) {
  const out = [];
  let g = [];
  const cerrar = () => {
    if (!g.length) return;
    const texto = g.map((p) => p.w).join(' ').replace(/\s+([,.!?;:])/g, '$1');
    const limpias = g.map((p) => p.w.replace(/[^\p{L}\p{N}$%]/gu, ''));
    const num = limpias.find((w) => /\d/.test(w));
    const larga = [...limpias].sort((a, b) => b.length - a.length)[0];
    const resaltar = num ? [num] : larga && larga.length >= 6 ? [larga] : [];
    out.push({texto: texto.replace(/[.,;:]+$/, ''), tiempos: g.map((p) => +p.s.toFixed(2)), inicio: +g[0].s.toFixed(2), fin: +Math.max(g.at(-1).e, g[0].s + 0.6).toFixed(2), resaltar});
    g = [];
  };
  ps.forEach((p, i) => {
    const pausa = g.length && p.s - g.at(-1).e > 0.35;
    if (pausa || g.length >= max) cerrar();
    g.push(p);
    if (/[.,!?;:]$/.test(p.w)) cerrar();
  });
  cerrar();
  // que un texto no se encime con el siguiente
  out.forEach((t, i) => { if (out[i + 1] && t.fin > out[i + 1].inicio) t.fin = out[i + 1].inicio; });
  return out;
}
