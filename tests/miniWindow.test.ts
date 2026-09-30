import { expect, it, vi } from 'vitest';
vi.mock('../src/renderer/core/platform', () => ({ appPlatform: async () => 'windows' }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
const calls = vi.hoisted(() => ({
  outerPosition: vi.fn(async () => ({ x: 40, y: 50 })), innerSize: vi.fn(async () => ({ width: 1440, height: 900 })),
  isMaximized: vi.fn(async () => true), setFullscreen: vi.fn(), unmaximize: vi.fn(), setMinSize: vi.fn(),
  setDecorations: vi.fn(), setResizable: vi.fn(), setAlwaysOnTop: vi.fn(), setSize: vi.fn(), setPosition: vi.fn(), maximize: vi.fn(),
  startDragging: vi.fn(), startResizeDragging: vi.fn(), scaleFactor: vi.fn(async () => 1), isFullscreen: vi.fn(async () => false),
}));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => calls,
  availableMonitors: async () => [{ workArea: { position: { x: 0, y: 0 }, size: { width: 1920, height: 1040 } } }],
  PhysicalPosition: class { constructor(public x: number, public y: number) {} },
  PhysicalSize: class { constructor(public width: number, public height: number) {} },
  LogicalSize: class { constructor(public width: number, public height: number) {} },
}));
import { enterMiniWindow, restoreWindow, pinMiniWindow } from '../src/renderer/core/miniWindow';

it('recovers offscreen bounds, enables frame editing, and restores the original window', async () => {
  await enterMiniWindow({ x: 9000, y: 9000, width: 640, height: 360 }, true);
  expect(calls.setPosition).toHaveBeenLastCalledWith({ x: 1280, y: 680 });
  expect(calls.setDecorations).toHaveBeenLastCalledWith(false);
  expect(calls.setResizable).toHaveBeenLastCalledWith(true);
  await pinMiniWindow(true);
  expect(calls.setAlwaysOnTop).toHaveBeenLastCalledWith(true);
  await restoreWindow();
  expect(calls.setAlwaysOnTop).toHaveBeenLastCalledWith(false);
  expect(calls.setSize).toHaveBeenLastCalledWith({ width: 1440, height: 900 });
  expect(calls.setPosition).toHaveBeenLastCalledWith({ x: 40, y: 50 });
  expect(calls.maximize).toHaveBeenCalledOnce();
});
