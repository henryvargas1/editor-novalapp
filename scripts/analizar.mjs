// Analiza un video de referencia para que Claude pueda replicar su estilo.
// Uso:  npm run analizar -- Referencia/video.mp4 nombre-estilo
// Crea estilos/<nombre>/ con: datos.json (cortes, ritmo, pausas) y hojas de capturas.
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [entrada, nombre = 'referencia'] = process.argv.slice(2);
if (!entrada || !fs.existsSync(entrada)) {
  console.log('Uso: npm run analizar -- Referencia/video.mp4 nombre-estilo');
  process.exit(1);
}
const dir = path.join('estilos', nombre);
fs.mkdirSync(path.join(dir, 'capturas'), {recursive: true});
const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...a], {stdio: ['ignore', 'pipe', 'pipe']});
const ffErr = (a) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], {maxBuffer: 1 << 28}).stderr.toString();
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', entrada]).toString());
const dur = parseFloat(probe.format.duration);
const v = probe.streams.find((s) => s.codec_type === 'video');

console.log('▶ 1/4 Detectando cortes...');
const sc = ffErr(['-i', entrada, '-vf', "select='gt(scene,0.20)',showinfo", '-an', '-f', 'null', '-']);
const cortes = [...sc.matchAll(/pts_time:([\d.]+)/g)].map((m) => +(+m[1]).toFixed(2))
  .filter((t, i, a) => i === 0 || t - a[i - 1] > 0.3); // quita duplicados de una misma transición

console.log('▶ 2/4 Detectando pausas de voz...');
const si = ffErr(['-i', entrada, '-af', 'silencedetect=n=-32dB:d=0.3', '-vn', '-f', 'null', '-']);
const pausas = [...si.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [+(+m[1]).toFixed(2), +(+m[2]).toFixed(2)]);

console.log('▶ 3/4 Hojas de capturas (1 cada segundo)...');
// Cada hoja: 4x3 = 12 segundos, con el tiempo escrito en cada cuadro
const porHoja = 12;
const hojas = Math.ceil(dur / porHoja);
for (let h = 0; h < hojas; h++) {
  const ini = h * porHoja;
  ff(['-y', '-ss', String(ini), '-t', String(porHoja), '-i', entrada, '-vf',
    `fps=1,scale=300:-2,drawtext=text='%{eif\\:t+${ini}\\:d}s':x=8:y=8:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=4x3`,
    '-frames:v', '1', path.join(dir, 'capturas', `hoja-${String(h + 1).padStart(2, '0')}.jpg`)]);
}

console.log('▶ 4/4 Capturas en detalle (animaciones de texto)...');
// 6 cuadros seguidos (cada 0.1 s) en 3 momentos, para ver cómo se mueven los textos
[0.15, 0.45, 0.75].forEach((p, i) => {
  const t = (dur * p).toFixed(2);
  ff(['-y', '-ss', t, '-i', entrada, '-vf', 'fps=10,scale=360:-2,tile=6x1', '-frames:v', '1', path.join(dir, 'capturas', `detalle-${i + 1}.jpg`)]);
});

const ritmo = cortes.length ? +(dur / (cortes.length + 1)).toFixed(2) : dur;
const datos = {nombre, archivo: entrada, duracion: +dur.toFixed(2), resolucion: `${v.width}x${v.height}`, fps: v.r_frame_rate,
  cortes, segundosPorPlano: ritmo, pausas, hojas};
fs.writeFileSync(path.join(dir, 'datos.json'), JSON.stringify(datos, null, 2));
console.log(`✔ Análisis en ${dir}: ${cortes.length} cortes (1 cada ${ritmo}s), ${hojas} hojas de capturas.`);
console.log('  Ahora pídele a Claude: "Estudia estilos/' + nombre + ' y crea el estilo"');
