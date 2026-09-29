import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PlayerPage } from '../src/renderer/pages/PlayerPage';
import type { Photo, Slide } from '../src/shared/types';

const photo: Photo = {
  id: 'photo', path: 'photo.jpg', url: 'asset://photo.jpg', name: 'photo',
  width: 4000, height: 3000, aspectRatio: 4 / 3,
};
const slide: Slide = { id: 'single', type: 'landscape', photo };

describe('PlayerPage immersive mode', () => {
  it('does not render HUD markup in immersive mode', () => {
    const html = renderToStaticMarkup(<PlayerPage slide={slide} previousSlide={null} paused={false}
      slideNumber={1} totalSlides={1} immersiveMode maxUpscale={2} onExit={() => undefined} />);
    expect(html).not.toContain('player-hud');
  });

  it('renders controls outside immersive mode', () => {
    const html = renderToStaticMarkup(<PlayerPage slide={slide} previousSlide={null} paused={false}
      slideNumber={1} totalSlides={1} immersiveMode={false} maxUpscale={2} onExit={() => undefined} />);
    expect(html).toContain('player-hud');
    expect(html).toContain('1 / 1');
  });
});
