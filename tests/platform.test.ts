import { afterEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ isTauri: vi.fn(() => false), invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => api);
import { appPlatform, isFullscreenShortcut, platformLabel } from '../src/renderer/core/platform';
afterEach(() => vi.clearAllMocks());
it('has a web fallback and reads native platform only through Rust', async () => {
  expect(await appPlatform()).toBe('web');
  expect(api.invoke).not.toHaveBeenCalled();
  api.isTauri.mockReturnValue(true);
  api.invoke.mockResolvedValueOnce('macos');
  expect(await appPlatform()).toBe('macos');
  expect(await appPlatform()).toBe('macos');
  expect(api.invoke).toHaveBeenCalledOnce();
  expect(api.invoke).toHaveBeenCalledWith('platform_info');
  expect(platformLabel('macos')).toBe('macOS');
});
it('maps full screen shortcuts without overriding other Mac commands', () => {
  const event = { key: 'f', ctrlKey: true, metaKey: true, altKey: false, shiftKey: false };
  expect(isFullscreenShortcut(event, 'macos')).toBe(true);
  expect(isFullscreenShortcut({ ...event, ctrlKey: false }, 'macos')).toBe(false);
  expect(isFullscreenShortcut({ ...event, key: 'F11' }, 'macos')).toBe(false);
  expect(isFullscreenShortcut({ ...event, key: 'F11' }, 'windows')).toBe(true);
  expect(isFullscreenShortcut(event, 'web')).toBe(false);
});
