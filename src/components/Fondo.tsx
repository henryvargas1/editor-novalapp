import {AbsoluteFill, useCurrentFrame} from 'remotion';
// Fondo de demostración cuando no hay video
export const Fondo: React.FC<{color: string}> = ({color}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at ${50 + Math.sin(f / 40) * 20}% ${40 + Math.cos(f / 50) * 15}%, ${color}33, #05070d 60%)`}}>
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(${color}14 1px, transparent 1px), linear-gradient(90deg, ${color}14 1px, transparent 1px)`,
        backgroundSize: '80px 80px', backgroundPosition: `0 ${f * 1.5}px`,
        transform: 'perspective(900px) rotateX(55deg) translateY(35%) scale(2)',
      }} />
    </AbsoluteFill>
  );
};
