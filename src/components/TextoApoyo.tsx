import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate} from 'remotion';
// Subtítulo palabra por palabra con "pop" y palabras clave resaltadas
export const TextoApoyo: React.FC<{texto: string; resaltar?: string[]; acento: string; duracion: number}> = ({texto, resaltar = [], acento, duracion}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const palabras = texto.split(' ');
  const salida = interpolate(frame, [duracion - 6, duracion], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 380, opacity: salida}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 22px', maxWidth: 900}}>
        {palabras.map((p, i) => {
          const s = spring({frame: frame - i * 4, fps, config: {damping: 11, stiffness: 180}});
          const clave = resaltar.some((r) => p.toLowerCase().includes(r.toLowerCase()));
          return (
            <span key={i} style={{
              fontSize: clave ? 112 : 92, fontWeight: 900, textTransform: 'uppercase',
              color: clave ? acento : '#fff', opacity: s,
              transform: `translateY(${(1 - s) * 40}px) scale(${0.6 + s * 0.4}) rotate(${clave ? -3 : 0}deg)`,
              WebkitTextStroke: '3px #000', paintOrder: 'stroke fill',
              textShadow: clave ? `0 0 30px ${acento}aa, 0 8px 0 #000` : '0 8px 0 #000',
            }}>{p}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
