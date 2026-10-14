import {staticFile, continueRender, delayRender} from 'remotion';
// Fuentes locales: funcionan sin internet
export const fontFamily = 'Montserrat';
export const fontCine = 'Inter';
const h = delayRender('fuentes');
const cargar = (fam: string, archivo: string, w: string) =>
  new FontFace(fam, `url(${staticFile(`fonts/${archivo}-latin-${w}-normal.woff2`)})`, {weight: w}).load().then((f) => document.fonts.add(f));
Promise.all([cargar(fontFamily, 'montserrat', '600'), cargar(fontFamily, 'montserrat', '900'), cargar(fontCine, 'inter', '500'), cargar(fontCine, 'inter', '600')])
  .then(() => continueRender(h));
