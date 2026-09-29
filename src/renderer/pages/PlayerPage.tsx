import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Slide } from '../../shared/types';
import { SlideView } from '../components/SlideView';

type PlayerPageProps = {
  slide: Slide;
  previousSlide: Slide | null;
  paused: boolean;
  slideNumber: number;
  totalSlides: number;
  immersiveMode: boolean;
  maxUpscale: number;
  slideDurationSeconds?: number;
  softMode?: boolean;
  miniWindowMode?: boolean;
  pinned?: boolean;
  onDrag?: () => void;
  onPin?: () => void;
  error?: string;
  onExit: () => void;
};

export function PlayerPage({
  slide, previousSlide, paused, slideNumber, totalSlides,
  immersiveMode, maxUpscale, slideDurationSeconds = 15, onExit,
  softMode = true, miniWindowMode = false, pinned = false, onDrag, onPin, error,
}: PlayerPageProps) {
  const [hudVisible, setHudVisible] = useState(paused);
  const hideTimer = useRef<number>();

  useEffect(() => {
    window.clearTimeout(hideTimer.current);
    if (immersiveMode) setHudVisible(false);
    else if (paused) setHudVisible(true);
    else hideTimer.current = window.setTimeout(() => setHudVisible(false), 3000);
    return () => window.clearTimeout(hideTimer.current);
  }, [immersiveMode, paused]);

  const revealHud = () => {
    if (immersiveMode) return;
    setHudVisible(true);
    window.clearTimeout(hideTimer.current);
    if (!paused) hideTimer.current = window.setTimeout(() => setHudVisible(false), 3000);
  };

  return (
    <main
      style={{ '--slide-duration': `${slideDurationSeconds}s` } as CSSProperties}
      className={`player-page ${softMode ? 'soft-mode' : ''} ${miniWindowMode ? 'mini-player' : ''} ${paused ? 'player-paused' : ''} ${immersiveMode ? 'player-immersive' : ''} ${hudVisible ? 'hud-visible' : ''}`}
      onPointerMove={revealHud}
      onPointerDown={(event) => { if (miniWindowMode && event.button === 0 && !(event.target as HTMLElement).closest('button')) onDrag?.(); }}
    >
      {(previousSlide && previousSlide.id !== slide.id ? [previousSlide, slide] : [slide]).map((item) => (
        <div className={`slide-layer ${item.id === slide.id ? 'slide-entering' : 'slide-leaving'}`} key={item.id}>
          <SlideView slide={item} paused={paused || item.id !== slide.id} maxUpscale={maxUpscale} />
        </div>
      ))}

      {miniWindowMode && <div className="mini-toolbar">
        <button type="button" onClick={onPin} aria-label={pinned ? '取消置頂' : '釘選置頂'} aria-pressed={pinned} title={pinned ? '取消置頂' : '釘選置頂'}>📌</button>
        <button type="button" onClick={onExit} aria-label="返回設定" title="返回設定 · Esc">×</button>
      </div>}
      {error && <div className="playback-error" role="alert">{error} · Esc 返回</div>}

      {!immersiveMode && !miniWindowMode && (
        <div className="player-hud" aria-hidden={!hudVisible}>
          <button type="button" onClick={onExit} aria-label="回到設定">×</button>
          <div>
            <span>{paused ? '已暫停' : slide.type === 'verticalPair' ? '雙幅人像' : slide.type === 'panzoom' ? '動態取景' : '完整照片'}</span>
            <small>{slideNumber} / {totalSlides}</small>
          </div>
        </div>
      )}
    </main>
  );
}
