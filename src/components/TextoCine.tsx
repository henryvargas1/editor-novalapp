import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
import {fontCine} from '../fuente';
// Estilo "Juesar": subtítulo pequeño y elegante. Cada palabra aparece cuando se dice,
// primero gris y luego blanca. Modo "glow": brillo + aberración cromática (para frases fuertes).
export const TextoCine: React.FC<{
  texto: string; duracion: number; tiempos?: number[]; modo?: 'normal' | 'glow'; x?: number; y?: number;
}> = ({texto, duracion, tiempos, modo = 'normal', x = 0.5, y = 0.6}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const palabras = texto.split(' ');
  // si no hay tiempos por palabra, se reparten en el primer 70% del bloque
  const t = tiempos ?? palabras.map((_, i) => (i * duracion * 0.7) / palabras.length / fps);
  const salida = interpolate(frame, [duracion - 4, duracion], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const glow = modo === 'glow';
  return (
    <AbsoluteFill style={{opacity: salida}}>
      <div style={{
        position: 'absolute', left: x * width, top: y * height, transform: 'translate(-50%, -50%)',
        width: 720, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: glow ? 24 : 11,
        fontFamily: fontCine, fontWeight: glow ? 500 : 600, fontSize: glow ? 66 : 58, letterSpacing: '-0.05em', lineHeight: 1.05,
      }}>
        {palabras.map((p, i) => {
          const f0 = t[i] * fps;
          const aparece = interpolate(frame, [f0, f0 + 3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const blanco = interpolate(frame, [f0 + 2, f0 + 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const blur = glow ? interpolate(frame, [f0, f0 + 8], [8, 0.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
          const gris = Math.round(150 + 105 * blanco);
          return (
            <span key={i} style={{
              opacity: aparece,
              color: glow ? `rgba(235,252,255,${0.6 + 0.4 * blanco})` : `rgb(${gris},${gris},${gris})`,
              filter: blur ? `blur(${blur}px)` : undefined,
              textShadow: glow
                ? '-3px 0 rgba(255,40,80,0.55), 3px 0 rgba(0,220,255,0.55), 0 0 18px rgba(170,240,255,0.9), 0 0 40px rgba(120,220,255,0.6)'
                : '0 2px 10px rgba(0,0,0,0.45)',
            }}>{p}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
