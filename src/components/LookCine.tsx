import {AbsoluteFill, useCurrentFrame, random} from 'remotion';
// Look cinematográfico oscuro (teal), viñeta fuerte y grano de película
export const LookCine: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(20,70,95,0.55), rgba(5,25,40,0.45))', mixBlendMode: 'soft-light'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(0,0,0,0.85) 100%)'}} />
      <AbsoluteFill style={{
        opacity: 0.07, mixBlendMode: 'overlay',
        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>")',
        backgroundPosition: `${Math.floor(random(`gx${f}`) * 200)}px ${Math.floor(random(`gy${f}`) * 200)}px`,
      }} />
    </>
  );
};
