import { describe, expect, it } from 'vitest';
import type { Photo } from '../src/shared/types';
import { buildSlides, slidePhotoUrls } from '../src/renderer/core/playlist';

function photo(id: string, aspectRatio: number): Photo {
  return { id, path: id, url: `gphoto://image/${id}`, name: id, width: 1000, height: 1000 / aspectRatio, aspectRatio };
}

describe('buildSlides', () => {
  it('uses landscape, portrait pair, and panzoom layouts', () => {
    const slides = buildSlides([
      photo('wide', 1.78),
      photo('portrait-a', 0.65),
      photo('portrait-b', 0.72),
      photo('square', 1),
    ]);
    expect(slides.map((slide) => slide.type).sort()).toEqual(['landscape', 'panzoom', 'verticalPair']);
  });

  it('falls back to panzoom for an unpaired portrait', () => {
    expect(buildSlides([photo('portrait', 0.7)])[0].type).toBe('panzoom');
  });

  it('returns both image urls for a vertical pair', () => {
    const slide = buildSlides([photo('a', 0.7), photo('b', 0.7)])[0];
    expect(slidePhotoUrls(slide)).toEqual(['gphoto://image/a', 'gphoto://image/b']);
  });
});
