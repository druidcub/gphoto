import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Photo, Slide } from '../../shared/types';
import { SlideView } from '../components/SlideView';
import { describeSlide } from '../core/slideDescription';

// Use a fixed 4K layout and scale it down, so the 2x limit and blur match TV playback.
function Thumbnail({ slide }: { slide: Slide }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '200px' });
    const resize = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 3840));
    observer.observe(node);
    resize.observe(node);
    return () => { observer.disconnect(); resize.disconnect(); };
  }, []);
  return <div className="preview-thumbnail" ref={ref}>
    {visible && scale > 0 && <div className="preview-canvas" style={{ transform: `scale(${scale})` }}>
      <SlideView slide={slide} paused maxUpscale={2} />
    </div>}
  </div>;
}

export function PreviewPage({ slides, photos, syncing, onBack, onPlay, softMode = true }: {
  slides: Slide[]; photos: Photo[]; syncing: boolean;
  onBack: () => void; onPlay: (index: number) => void;
  softMode?: boolean;
}) {
  const numbers = new Map(photos.map((photo, index) => [photo.id, index + 1]));
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onBack(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onBack]);
  return <main className={`preview-page ${softMode ? 'soft-mode' : ''}`}>
    <header className="preview-header">
      <div><h1>投影片預覽</h1><p>{slides.length} 頁 · {photos.length} 張照片 · 點選縮圖即可從該頁播放</p>
        <small>右上角標示投影片與照片序號；版型說明以 4K、16:9 為基準，實際依螢幕尺寸調整。各頁以 1.2 秒淡入淡出切換。{syncing && ' 相簿同步中，此預覽保持固定；返回設定後可重新預覽。'}</small>
      </div>
      <button type="button" className="preview-button" onClick={onBack}>返回設定 · Esc</button>
    </header>
    <div className="preview-grid">
      {slides.map((slide, index) => {
        const items = slide.type === 'verticalPair' ? [slide.left, slide.right] : [slide.photo];
        const label = items.map((photo) => `照片 #${numbers.get(photo.id)}`).join(' ／ ');
        return <button type="button" className="preview-card" key={slide.id} onClick={() => onPlay(index)} aria-label={`播放第 ${index + 1} 頁，${label}`}>
          <div className="preview-image-wrap">
            <Thumbnail slide={slide} />
            <span className="slide-number">投影片 {index + 1} · {label}</span>
            <div className="preview-photo-numbers" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` } as CSSProperties}>
              {items.map((photo) => <span key={photo.id}>照片 #{numbers.get(photo.id)}</span>)}
            </div>
          </div>
          <div className="preview-caption">{describeSlide(slide).map((line) => <span key={line}>{line}</span>)}</div>
        </button>;
      })}
    </div>
  </main>;
}
