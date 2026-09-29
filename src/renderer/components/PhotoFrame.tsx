import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { calculateFramePresentation, type FramePresentation } from '../core/presentation';

export type PhotoFrameProps = {
  src: string;
  alt?: string;
  naturalWidth: number;
  naturalHeight: number;
  mode?: 'static' | 'panZoom';
  lowResolutionScaleLimit?: number;
  sharedBackground?: boolean;
};

type FrameStyle = CSSProperties & Record<`--${string}`, string>;
const useFrameLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function PhotoFrame({
  src,
  alt = '',
  naturalWidth,
  naturalHeight,
  mode = 'static',
  lowResolutionScaleLimit = 2,
  sharedBackground = false,
}: PhotoFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [presentation, setPresentation] = useState<FramePresentation>();

  useFrameLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => {
      // Layout dimensions exclude the thumbnail parent's CSS transform.
      setPresentation(calculateFramePresentation(
        naturalWidth, naturalHeight, frame.clientWidth, frame.clientHeight, lowResolutionScaleLimit,
      ));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [lowResolutionScaleLimit, naturalHeight, naturalWidth]);

  const style = presentation ? {
    '--photo-blur': `${presentation.blur}px`,
    '--photo-brightness': `${presentation.brightness}`,
    '--photo-background-scale': `${presentation.backgroundScale}`,
    '--photo-width': `${presentation.foregroundWidth}px`,
    '--photo-height': `${presentation.foregroundHeight}px`,
    '--photo-animation-scale': `${presentation.animationScale}`,
    '--photo-animation-scale-soft': `${1 + (presentation.animationScale - 1) * 0.2}`,
    '--photo-animation-scale-medium': `${1 + (presentation.animationScale - 1) * 0.45}`,
  } as FrameStyle : undefined;

  return (
    <div ref={frameRef} className={`photo-frame ${sharedBackground ? 'photo-frame-shared' : ''} photo-frame-${presentation?.animationScale === 1 ? 'static' : mode}`} style={style}>
      {!sharedBackground && <><img className="photo-background" src={src} alt="" aria-hidden="true" draggable={false} /><div className="photo-overlay" /></>}
      <img className="photo-foreground" src={src} alt={alt} draggable={false} />
    </div>
  );
}
