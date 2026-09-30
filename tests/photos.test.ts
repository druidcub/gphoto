import { expect, it, vi } from 'vitest';
vi.mock('@tauri-apps/api/core', () => ({ convertFileSrc: (path: string) => `asset:${path}` }));
import { inspectPhotos } from '../src/renderer/core/photos';
it('keeps distinct full-path IDs on case-sensitive filesystems', async () => {
  class TestImage {
    naturalWidth = 800; naturalHeight = 600;
    onload?: () => void;
    set src(_: string) { queueMicrotask(() => this.onload?.()); }
  }
  vi.stubGlobal('Image', TestImage);
  try {
    const photos = await inspectPhotos(['/photos/A.jpg', '/photos/a.jpg']);
    expect(photos.map(photo => photo.id)).toEqual(['/photos/A.jpg', '/photos/a.jpg']);
  } finally { vi.unstubAllGlobals(); }
});
