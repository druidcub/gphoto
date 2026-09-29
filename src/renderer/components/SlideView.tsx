import type { Slide } from '../../shared/types';
import { LandscapeSlide } from './LandscapeSlide';
import { PanZoomSlide } from './PanZoomSlide';
import { VerticalPairSlide } from './VerticalPairSlide';

export function SlideView({ slide, paused, maxUpscale }: { slide: Slide; paused: boolean; maxUpscale: number }) {
  switch (slide.type) {
    case 'landscape':
      return <LandscapeSlide photo={slide.photo} paused={paused} maxUpscale={maxUpscale} />;
    case 'verticalPair':
      return <VerticalPairSlide left={slide.left} right={slide.right} maxUpscale={maxUpscale} />;
    case 'panzoom':
      return <PanZoomSlide photo={slide.photo} paused={paused} maxUpscale={maxUpscale} />;
  }
}
