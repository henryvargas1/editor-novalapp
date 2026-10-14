import {AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, interpolate, random} from 'remotion';
// Escena de apoyo a pantalla completa: imagen o video con empuje lento (Ken Burns) y entrada con desenfoque
export const Escena: React.FC<{archivo: string; tipo: 'imagen' | 'video'; duracion: number; semilla?: number}> = ({archivo, tipo, duracion, semilla = 0}) => {
  const f = useCurrentFrame();
  const dir = random(`d${semilla}`) > 0.5 ? 1 : -1;
  const avance = f / Math.max(1, duracion);
  const escala = 1.08 + 0.1 * avance;
  const x = dir * (avance - 0.5) * 3;
  const entrada = interpolate(f, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  const salida = interpolate(f, [duracion - 5, duracion], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const estilo: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};
  return (
    <AbsoluteFill style={{opacity: Math.min(entrada, salida), filter: `blur(${(1 - entrada) * 14}px)`,
      transform: `scale(${escala}) translateX(${x}%)`}}>
      {tipo === 'video'
        ? <OffthreadVideo src={staticFile(archivo)} muted style={estilo} />
        : <Img src={staticFile(archivo)} style={estilo} />}
    </AbsoluteFill>
  );
};
