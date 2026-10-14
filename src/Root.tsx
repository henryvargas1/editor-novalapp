import {Composition} from 'remotion';
import {Edicion, Guion} from './Edicion';
import guion from '../guion.json';

const FPS = 30;
export const RemotionRoot = () => (
  <Composition
    id="Edicion"
    component={Edicion}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={Math.round((guion as Guion).duracionSegundos * FPS)}
    defaultProps={guion as Guion}
  />
);
