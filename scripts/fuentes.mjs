// Copia las fuentes (Inter, Montserrat) a public/fonts después de npm install
import fs from 'node:fs';
const dst = 'public/fonts';
fs.mkdirSync(dst, {recursive: true});
for (const [fam, pesos] of [['inter', ['500', '600']], ['montserrat', ['600', '900']]]) {
  for (const w of pesos) {
    const f = `${fam}-latin-${w}-normal.woff2`;
    const src = `node_modules/@fontsource/${fam}/files/${f}`;
    if (fs.existsSync(src)) fs.copyFileSync(src, `${dst}/${f}`);
  }
}
