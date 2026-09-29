import type { Photo } from '../../shared/types';
import { PhotoFrame } from './PhotoFrame';

export function VerticalPairSlide({ left, right, maxUpscale }: { left: Photo; right: Photo; maxUpscale: number }) {
  return (
    <div className="slide-content vertical-pair-slide">
      <div className="pair-background" aria-hidden="true">
        <img src={left.url} alt="" draggable={false} />
        <div className="pair-background-blend"><img src={right.url} alt="" draggable={false} /></div>
      </div>
      <PhotoFrame sharedBackground src={left.url} alt={left.name} naturalWidth={left.width} naturalHeight={left.height} lowResolutionScaleLimit={maxUpscale} />
      <PhotoFrame sharedBackground src={right.url} alt={right.name} naturalWidth={right.width} naturalHeight={right.height} lowResolutionScaleLimit={maxUpscale} />
    </div>
  );
}
