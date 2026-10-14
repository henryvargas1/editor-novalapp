import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {fontCine} from '../fuente';

const useEntradaSalida = (duracion: number) => {
  const f = useCurrentFrame();
  return Math.min(interpolate(f, [0, 6], [0, 1], {extrapolateRight: 'clamp'}), interpolate(f, [duracion - 6, duracion], [1, 0], {extrapolateLeft: 'clamp'}));
};
const brillo = (c: string) => `-4px 0 rgba(255,40,80,0.5), 4px 0 rgba(0,220,255,0.5), 0 0 30px ${c}, 0 0 80px ${c}88`;

// Número que cuenta hasta su valor (precios, cifras, porcentajes)
export const AnimNumero: React.FC<{valor: string; etiqueta?: string; duracion: number; color: string}> = ({valor, etiqueta, duracion, color}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const op = useEntradaSalida(duracion);
  const m = valor.match(/^(\D*)([\d.,]+)(.*)$/);
  const num = m ? parseFloat(m[2].replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')) : NaN;
  const p = interpolate(f, [0, fps * 0.9], [0, 1], {extrapolateRight: 'clamp'});
  const actual = isNaN(num) ? valor : `${m![1]}${Math.round(num * (1 - Math.pow(1 - p, 3))).toLocaleString('es-CO')}${m![3]}`;
  const s = spring({frame: f, fps, config: {damping: 12}});
  return (
    <AbsoluteFill style={{background: 'rgba(0,0,0,0.45)', opacity: op, alignItems: 'center', justifyContent: 'center', fontFamily: fontCine}}>
      <div style={{fontSize: 230, fontWeight: 600, color: '#fff', letterSpacing: '-0.06em', transform: `scale(${0.7 + 0.3 * s})`, textShadow: brillo(color)}}>{actual}</div>
      {etiqueta && <div style={{fontSize: 56, fontWeight: 500, color: '#dff', letterSpacing: '-0.03em', marginTop: 10, opacity: s}}>{etiqueta}</div>}
    </AbsoluteFill>
  );
};

// Palabras clave enormes que entran letra a letra
export const AnimTitulo: React.FC<{texto: string; duracion: number; color: string}> = ({texto, duracion, color}) => {
  const f = useCurrentFrame();
  const op = useEntradaSalida(duracion);
  return (
    <AbsoluteFill style={{background: 'rgba(0,0,0,0.45)', opacity: op, alignItems: 'center', justifyContent: 'center', padding: 60}}>
      <div style={{fontFamily: fontCine, fontSize: 150, fontWeight: 600, color: '#fff', letterSpacing: '-0.06em', textAlign: 'center', lineHeight: 0.95, textShadow: brillo(color)}}>
        {texto.split('').map((c, i) => (
          <span key={i} style={{opacity: interpolate(f, [i * 1.2, i * 1.2 + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
            filter: `blur(${interpolate(f, [i * 1.2, i * 1.2 + 6], [10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px)`}}>{c}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
