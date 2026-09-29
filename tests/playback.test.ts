import { expect, it } from 'vitest';
import { normalizeDuration, SLIDE_DURATIONS, playbackKey } from '../src/renderer/core/playback';
import { describeSlide } from '../src/renderer/core/slideDescription';
import type { Photo } from '../src/shared/types';
const photo = (width: number, height: number): Photo => ({ id: '1', path: '', url: '', name: '', width, height, aspectRatio: width / height });
it('supports logical keys from virtual keyboards as well as physical key codes', () => {
  expect(playbackKey({ key: 'Escape', code: '' })).toBe('Escape');
  expect(playbackKey({ key: 'ArrowRight', code: 'Unidentified' })).toBe('ArrowRight');
  expect(playbackKey({ key: ' ', code: 'Space' })).toBe('Space');
  expect(playbackKey({ key: 'Unidentified', code: 'ArrowLeft' })).toBe('ArrowLeft');
});
it('supports common durations up to five minutes and defaults to fifteen seconds', () => {
  expect(Math.max(...SLIDE_DURATIONS)).toBe(300);
  for (const value of [60, 120, 300]) expect(normalizeDuration(value)).toBe(value);
  for (const value of [0, 301, NaN]) expect(normalizeDuration(value)).toBe(15);
});
it('describes actual containment and disables motion at the upscale limit', () => {
  expect(describeSlide({ id: '1', type: 'landscape', photo: photo(4000, 3000) })[0]).toContain('左右留白');
  expect(describeSlide({ id: '1', type: 'landscape', photo: photo(4000, 1000) })[0]).toContain('上下留白');
  expect(describeSlide({ id: '1', type: 'panzoom', photo: photo(800, 600) })[0]).toContain('四周留白 · 靜態、不裁切');
  expect(describeSlide({ id: '1', type: 'panzoom', photo: photo(4000, 4000) })[0]).toContain('中段邊緣可能裁切');
});
