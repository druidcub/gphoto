import type { Photo } from '../../shared/types';
import { PhotoFrame } from './PhotoFrame';

export function PanZoomSlide({ photo, paused, maxUpscale }: { photo: Photo; paused: boolean; maxUpscale: number }) {
  return (
    <div className={`slide-content panzoom-slide ${paused ? 'is-paused' : ''}`}>
      <PhotoFrame src={photo.url} alt={photo.name} naturalWidth={photo.width} naturalHeight={photo.height} mode="panZoom" lowResolutionScaleLimit={maxUpscale} />
    </div>
  );
}
