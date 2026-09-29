import type { Photo } from '../../shared/types';
import { PhotoFrame } from './PhotoFrame';

export function LandscapeSlide({ photo, paused, maxUpscale }: { photo: Photo; paused: boolean; maxUpscale: number }) {
  return (
    <div className={`slide-content landscape-slide ${paused ? 'is-paused' : ''}`}>
      <PhotoFrame src={photo.url} alt={photo.name} naturalWidth={photo.width} naturalHeight={photo.height} lowResolutionScaleLimit={maxUpscale} />
    </div>
  );
}
