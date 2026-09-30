import { expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  platform: vi.fn(async () => 'windows'), invoke: vi.fn(),
  isFullscreen: vi.fn(async () => false), setFullscreen: vi.fn(),
  innerSize: vi.fn(async () => ({ width: 1920, height: 1080 })),
  outerPosition: vi.fn(async () => ({ x: 0, y: 0 })),
}));
vi.mock('../src/renderer/core/platform', () => ({ appPlatform: api.platform }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: api.invoke }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => api }));
import { windowOperation, commitWindowMode, windowMode, applyFullscreen } from '../src/renderer/core/windowSession';

it('serializes four window modes and recovers queue after errors', async () => {
  const order: string[] = [];
  let release!: () => void;
  const first = windowOperation(async () => { order.push('first'); await new Promise<void>(resolve => { release = resolve; }); commitWindowMode('fullscreenPlayback'); });
  const second = windowOperation(async () => { order.push(windowMode()); commitWindowMode('miniSetup'); throw new Error('fail'); });
  const third = windowOperation(async () => { order.push(windowMode()); commitWindowMode('miniPlayback'); });
  const failed = expect(second).rejects.toThrow('fail');
  await Promise.resolve();
  expect(order).toEqual(['first']);
  release(); await first; await failed; await third;
  expect(order).toEqual(['first', 'fullscreenPlayback', 'miniSetup']);
  expect(windowMode()).toBe('miniPlayback');
  await windowOperation(async () => commitWindowMode('settings'));
});
it('waits for settled macOS geometry before enabling wake assertion', async () => {
  vi.useFakeTimers();
  api.platform.mockResolvedValue('macos');
  api.isFullscreen.mockResolvedValueOnce(false).mockResolvedValue(true);
  api.invoke.mockClear();
  const promise = applyFullscreen(true);
  await vi.advanceTimersByTimeAsync(1200);
  await promise;
  expect(api.innerSize).toHaveBeenCalled();
  expect(api.invoke).toHaveBeenCalledWith('set_display_awake', { enabled: true });
  api.isFullscreen.mockResolvedValue(false);
  await applyFullscreen(false);
  expect(api.invoke).toHaveBeenLastCalledWith('set_display_awake', { enabled: false });
  vi.useRealTimers();
});
it('times out a native transition without enabling idle prevention', async () => {
  vi.useFakeTimers();
  api.platform.mockResolvedValue('macos');
  api.isFullscreen.mockResolvedValue(false);
  api.invoke.mockClear();
  const failed = expect(applyFullscreen(true)).rejects.toThrow('全螢幕切換尚未完成');
  await vi.advanceTimersByTimeAsync(5100);
  await failed;
  expect(api.invoke).not.toHaveBeenCalledWith('set_display_awake', { enabled: true });
  vi.useRealTimers();
});
