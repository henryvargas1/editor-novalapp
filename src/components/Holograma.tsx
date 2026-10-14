import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate, random} from 'remotion';
// Panel holográfico: aparece con escaneo, parpadeo, anillos girando y lista animada
export const Holograma: React.FC<{titulo: string; items: string[]; color: string; duracion: number; posicion?: 'arriba' | 'centro'}> = ({titulo, items, color, duracion, posicion = 'arriba'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrada = spring({frame, fps, config: {damping: 14}});
  const salida = interpolate(frame, [duracion - 10, duracion], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const flicker = random(`f${Math.floor(frame / 2)}`) > 0.93 ? 0.55 : 1;
  const glitchX = random(`g${frame}`) > 0.96 ? (random(`x${frame}`) - 0.5) * 30 : 0;
  const scan = interpolate(frame, [0, 18], [0, 100], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: salida * flicker,
      // 'arriba' = más pequeño y en la parte superior para no tapar la cara
      transform: posicion === 'arriba' ? 'translateY(-430px) scale(0.78)' : undefined}}>
      {/* anillos */}
      {posicion === 'centro' && [560, 680].map((d, i) => (
        <div key={d} style={{
          position: 'absolute', width: d, height: d, borderRadius: '50%',
          border: `3px ${i ? 'dashed' : 'solid'} ${color}66`, boxShadow: `0 0 40px ${color}55`,
          transform: `rotateX(70deg) rotate(${frame * (i ? -1.2 : 0.8)}deg) scale(${entrada})`, top: 1180,
        }} />
      ))}
      {/* haz de proyección */}
      {posicion === 'centro' && <div style={{position: 'absolute', top: 760, width: 620, height: 700, opacity: 0.35 * entrada,
        background: `linear-gradient(to top, ${color}88, transparent)`, clipPath: 'polygon(35% 100%, 65% 100%, 100% 0, 0 0)'}} />}
      {/* panel */}
      <div style={{
        position: 'absolute', top: 520, minWidth: 840, whiteSpace: 'nowrap', padding: '50px 60px',
        transform: `translateX(${glitchX}px) perspective(1200px) rotateY(${Math.sin(frame / 25) * 6}deg) scaleY(${entrada})`,
        border: `2px solid ${color}`, borderRadius: 24, backgroundColor: 'rgba(0,18,28,0.6)',
        boxShadow: `0 0 60px ${color}66, inset 0 0 60px ${color}33`,
        clipPath: `inset(0 0 ${100 - scan}% 0)`, color,
        backgroundImage: `repeating-linear-gradient(0deg, ${color}18 0 2px, transparent 2px 6px)`,
      }}>
        <div style={{fontSize: 40, letterSpacing: 14, fontWeight: 600, opacity: 0.8}}>// {titulo}</div>
        {items.map((it, i) => {
          const s = spring({frame: frame - 14 - i * 8, fps, config: {damping: 13}});
          return (
            <div key={it} style={{fontSize: 74, fontWeight: 900, marginTop: 18, opacity: s,
              transform: `translateX(${(1 - s) * -80}px)`, textShadow: `0 0 24px ${color}`, color: '#eaffff'}}>
              <span style={{color, marginRight: 24}}>0{i + 1}</span>{it}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
