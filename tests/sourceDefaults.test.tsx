import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { AppSettings, SyncEvent } from '../src/shared/types';
import App from '../src/renderer/App';
vi.mock('../src/renderer/core/platform', () => ({ appPlatform: async () => 'web', platformLabel: () => '網頁預覽', isFullscreenShortcut: () => false }));
import { SettingsPage } from '../src/renderer/pages/SettingsPage';
const api = vi.hoisted(() => ({ loadSettings: vi.fn(), saveSettings: vi.fn(async () => {}), scanPhotoFolder: vi.fn(async () => []), syncGoogleAlbum: vi.fn(), choosePhotoFolder: vi.fn(async () => null) }));
vi.mock('../src/renderer/core/desktop', () => ({ ...api, setFullscreen: vi.fn(), toggleFullscreen: vi.fn() }));
vi.mock('../src/renderer/core/photos', () => ({ inspectPhotos: async () => [] }));
const defaults: AppSettings = { sourceMode: 'googlePhotos', albumUrl: '', localFolderPath: 'cache/files', immersiveMode: true, maxUpscale: 2, syncIntervalMinutes: 5, slideDurationSeconds: 15, softMode: true, miniWindowMode: false, miniWindowBounds: { x: 80, y: 80, width: 640, height: 360 } };
let renderer: ReactTestRenderer;
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval }); api.loadSettings.mockResolvedValue({ ...defaults }); });
afterEach(() => { if (renderer) act(() => renderer.unmount()); vi.unstubAllGlobals(); });
async function mount() { await act(async () => { renderer = create(<App />); }); }
it('does not sync an empty first-run URL and uses the remembered folder as picker default', async () => {
  await mount();
  expect(api.syncGoogleAlbum).not.toHaveBeenCalled();
  expect(renderer.root.findByType(SettingsPage).props.settings.albumUrl).toBe('');
  await act(async () => renderer.root.findByType(SettingsPage).props.onChooseFolder());
  expect(api.choosePhotoFolder).toHaveBeenCalledWith('cache/files');
});
it('loads the remembered local folder on startup and when switching source', async () => {
  api.loadSettings.mockResolvedValue({ ...defaults, sourceMode: 'local' });
  await mount();
  expect(api.scanPhotoFolder).toHaveBeenCalledWith('cache/files');
  await act(async () => renderer.root.findByType(SettingsPage).props.onSettingsChange({ sourceMode: 'googlePhotos' }));
  await act(async () => renderer.root.findByType(SettingsPage).props.onSettingsChange({ sourceMode: 'local' }));
  expect(api.scanPhotoFolder).toHaveBeenCalledTimes(2);
});
it('sets the sync cache as the local default without erasing the user album URL', async () => {
  api.loadSettings.mockResolvedValue({ ...defaults, albumUrl: 'https://photos.google.com/share/example' });
  api.syncGoogleAlbum.mockImplementation(async (_url: string, onEvent: (event: SyncEvent) => void) => {
    onEvent({ type: 'cached', paths: [], folderPath: 'new-cache/files' });
    return { paths: [], added: 0, removed: 0 };
  });
  await mount();
  const settings = renderer.root.findByType(SettingsPage).props.settings;
  expect(settings.localFolderPath).toBe('new-cache/files');
  expect(settings.albumUrl).toBe('https://photos.google.com/share/example');
});
