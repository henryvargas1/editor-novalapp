import {AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {fontFamily} from './fuente';
import {Fondo} from './components/Fondo';
import {TextoApoyo} from './components/TextoApoyo';
import {TextoCine} from './components/TextoCine';
import {LookCine} from './components/LookCine';
import {Holograma} from './components/Holograma';
import {Escena} from './components/Escena';
import {AnimNumero, AnimTitulo} from './components/Animaciones';

export type Guion = {
  video: string;
  duracionSegundos: number;
  estilo: {nombre?: 'reels' | 'juesar'; color: string; acento: string};
  textos: {texto: string; inicio: number; fin: number; resaltar?: string[]; tiempos?: number[]; modo?: 'normal' | 'glow'; x?: number; y?: number}[];
  hologramas: {inicio: number; fin: number; titulo: string; items: string[]; posicion?: 'arriba' | 'centro'}[];
  zooms: {inicio: number; escala: number}[];
  // "planos": simulan cortes de cámara con un solo video (encuadre distinto + empuje lento)
  planos?: {inicio: number; escala: number; x?: number; y?: number}[];
  // escenas de apoyo (las crea `npm run escenas`)
  escenas?: {inicio: number; fin: number; tipo: 'imagen' | 'video' | 'numero' | 'titulo' | 'lista'; archivo?: string; prompt?: string;
    valor?: string; etiqueta?: string; texto?: string; titulo?: string; items?: string[]}[];
  musica?: string;
  volumenMusica?: number;
};

// Zoom "punch-in": salto rápido y regreso suave
const useZoom = (zooms: Guion['zooms']) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return zooms.reduce((s, z) => {
    const f = z.inicio * fps;
    const pulse = interpolate(frame, [f, f + 4, f + 45], [0, 1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
    });
    return s * (1 + (z.escala - 1) * pulse);
  }, 1);
};

// Plano activo: encuadre del plano + empuje lento (Ken Burns) durante su duración
const usePlano = (planos: NonNullable<Guion['planos']>, total: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const i = planos.findLastIndex((p) => p.inicio <= t);
  if (i < 0) return {escala: 1, x: 0, y: 0};
  const p = planos[i];
  const fin = planos[i + 1]?.inicio ?? total;
  const avance = interpolate(t, [p.inicio, fin], [0, 1], {extrapolateRight: 'clamp'});
  return {escala: p.escala * (1 + 0.05 * avance), x: p.x ?? 0, y: p.y ?? 0};
};

export const Edicion: React.FC<Guion> = (g) => {
  const {fps} = useVideoConfig();
  const zoom = useZoom(g.zooms);
  const plano = usePlano(g.planos ?? [], g.duracionSegundos);
  const sec = (s: number) => Math.round(s * fps);
  const cine = g.estilo.nombre === 'juesar';
  return (
    <AbsoluteFill style={{backgroundColor: '#05070d', fontFamily}}>
      <AbsoluteFill style={{transform: `scale(${zoom * plano.escala}) translate(${plano.x}%, ${plano.y}%)`}}>
        {g.video
          ? <OffthreadVideo src={staticFile(g.video)} style={{width: '100%', height: '100%', objectFit: 'cover',
              filter: cine ? 'contrast(1.15) saturate(0.68) brightness(0.74)' : undefined}} />
          : <Fondo color={g.estilo.color} />}
      </AbsoluteFill>
      {(g.escenas ?? []).filter((e) => (e.tipo === 'imagen' || e.tipo === 'video') && e.archivo).map((e, i) => (
        <Sequence key={`e${i}`} from={sec(e.inicio)} durationInFrames={sec(e.fin - e.inicio)}>
          <Escena archivo={e.archivo!} tipo={e.tipo as 'imagen' | 'video'} duracion={sec(e.fin - e.inicio)} semilla={i} />
        </Sequence>
      ))}
      {cine ? <LookCine /> : <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)'}} />}
      {(g.escenas ?? []).filter((e) => ['numero', 'titulo', 'lista'].includes(e.tipo)).map((e, i) => {
        const d = sec(e.fin - e.inicio);
        return (
          <Sequence key={`a${i}`} from={sec(e.inicio)} durationInFrames={d}>
            {e.tipo === 'numero' && <AnimNumero valor={e.valor ?? ''} etiqueta={e.etiqueta} duracion={d} color={g.estilo.color} />}
            {e.tipo === 'titulo' && <AnimTitulo texto={e.texto ?? ''} duracion={d} color={g.estilo.color} />}
            {e.tipo === 'lista' && <Holograma titulo={e.titulo ?? ''} items={e.items ?? []} color={g.estilo.color} duracion={d} posicion="arriba" />}
          </Sequence>
        );
      })}
      {g.musica && <Audio src={staticFile(g.musica)} volume={g.volumenMusica ?? 0.15} />}
      {g.hologramas.map((h, i) => (
        <Sequence key={i} from={sec(h.inicio)} durationInFrames={sec(h.fin - h.inicio)}>
          <Holograma {...h} color={g.estilo.color} duracion={sec(h.fin - h.inicio)} />
        </Sequence>
      ))}
      {g.textos.filter((t) => !(g.escenas ?? []).some((e) => (e.tipo === 'numero' || e.tipo === 'titulo') && t.inicio >= e.inicio && t.inicio < e.fin)).map((t, i) => (
        <Sequence key={i} from={sec(t.inicio)} durationInFrames={Math.max(1, sec(t.fin - t.inicio))}>
          {cine
            ? <TextoCine {...t} tiempos={t.tiempos?.map((x) => x - t.inicio)} duracion={sec(t.fin - t.inicio)} />
            : <TextoApoyo {...t} acento={g.estilo.acento} duracion={sec(t.fin - t.inicio)} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
