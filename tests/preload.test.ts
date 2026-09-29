import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { preloadImages } from '../src/renderer/core/preload';
let images: FakeImage[];
class FakeImage {
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  decode = vi.fn(async () => {});
  constructor() { images.push(this); }
}
beforeEach(() => { images = []; vi.useFakeTimers(); vi.stubGlobal('Image', FakeImage); vi.stubGlobal('window', { setTimeout, clearTimeout }); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
it('waits for both photos in a pair and decodes before switching', async () => {
  const ready = vi.fn(); const pending = preloadImages(['left', 'right']).then(ready);
  images[0].onload?.(); await Promise.resolve();
  expect(ready).not.toHaveBeenCalled();
  images[1].onload?.(); await pending;
  expect(images[0].decode).toHaveBeenCalledOnce();
  expect(images[1].decode).toHaveBeenCalledOnce();
  expect(ready).toHaveBeenCalledOnce();
});
it('rejects broken images instead of switching to an empty frame', async () => {
  const pending = preloadImages(['missing']);
  const assertion = expect(pending).rejects.toThrow('照片無法載入');
  images[0].onerror?.(); await assertion;
});
it('times out stalled image loads', async () => {
  const pending = preloadImages(['stalled']);
  const assertion = expect(pending).rejects.toThrow('照片載入逾時');
  await vi.advanceTimersByTimeAsync(15000); await assertion;
});
