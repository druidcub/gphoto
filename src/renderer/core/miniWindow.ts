import { availableMonitors, getCurrentWindow, LogicalSize, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import type { MiniWindowBounds } from '../../shared/types';
import { applyFullscreen, commitWindowMode, windowOperation } from './windowSession';
import { fitWindowBounds } from './windowBounds';
import { appPlatform } from './platform';
import { resizedBounds, type ResizeEdge } from './resizeBounds';

let original: { position: PhysicalPosition; size: PhysicalSize; maximized: boolean } | null = null;
let stopMonitoring: (() => void) | undefined;
let cancelResize: (() => void) | undefined;
let resizing = false;
function monitorMiniBounds() {
  stopMonitoring?.();
  let checking = false;
  // Also checks topology changes when no movement event is delivered by the OS.
  const timer = setInterval(() => {
    if (checking || resizing) return;
    checking = true;
    void windowOperation(async () => {
      if (!stopMonitoring) return;
      const win = getCurrentWindow();
      const bounds = await readMiniBounds();
      const fitted = fitWindowBounds(bounds, await availableMonitors(), { width: 320, height: 180 });
      if (fitted.width !== bounds.width || fitted.height !== bounds.height) await win.setSize(new PhysicalSize(fitted.width, fitted.height));
      if (fitted.x !== bounds.x || fitted.y !== bounds.y) await win.setPosition(new PhysicalPosition(fitted.x, fitted.y));
    }).catch(error => console.warn('小視窗位置檢查失敗', error)).finally(() => { checking = false; });
  }, 1000);
  stopMonitoring = () => { clearInterval(timer); stopMonitoring = undefined; };
}
export async function readMiniBounds(): Promise<MiniWindowBounds> {
  const win = getCurrentWindow();
  const [position, size] = await Promise.all([win.outerPosition(), win.innerSize()]);
  return { x: position.x, y: position.y, width: size.width, height: size.height };
}

export async function enterMiniWindow(bounds: MiniWindowBounds, editing: boolean): Promise<void> {
  return windowOperation(async () => {
  const win = getCurrentWindow();
  if (!original) original = { position: await win.outerPosition(), size: await win.innerSize(), maximized: await win.isMaximized() };
  await applyFullscreen(false);
  await win.unmaximize();
  await win.setMinSize(new LogicalSize(320, 180));
  await win.setDecorations(false);
  await win.setResizable(editing);
  await win.setAlwaysOnTop(false);
  const monitors = await availableMonitors();
  const { x, y, width, height } = fitWindowBounds(bounds, monitors, { width: 320, height: 180 });
  await win.setSize(new PhysicalSize(width, height));
  await win.setPosition(new PhysicalPosition(x, y));
  commitWindowMode(editing ? 'miniSetup' : 'miniPlayback');
  monitorMiniBounds();
  });
}

export async function restoreWindow(): Promise<void> {
  return windowOperation(async () => {
  stopMonitoring?.();
  cancelResize?.();
  const win = getCurrentWindow();
  await win.setAlwaysOnTop(false);
  await applyFullscreen(false);
  await win.setResizable(true);
  await win.setDecorations(true);
  await win.setMinSize(new LogicalSize(960, 640));
  if (original) {
    const monitors = await availableMonitors();
    const { x, y, width, height } = fitWindowBounds({ ...original.position, ...original.size }, monitors, { width: 960, height: 640 });
    const scale = await win.scaleFactor();
    await win.setMinSize(new LogicalSize(Math.min(960, width / scale), Math.min(640, height / scale)));
    await win.setSize(new PhysicalSize(width, height));
    await win.setPosition(new PhysicalPosition(x, y));
    if (original.maximized) await win.maximize();
    original = null;
  }
  commitWindowMode('settings');
  });
}

export const dragMiniWindow = () => getCurrentWindow().startDragging();
export const pinMiniWindow = (pinned: boolean) => windowOperation(() => getCurrentWindow().setAlwaysOnTop(pinned));
export async function resizeMiniWindow(direction: ResizeEdge, pointer?: { pointerId: number; screenX: number; screenY: number; target: HTMLElement }): Promise<void> {
  const win = getCurrentWindow();
  if (await appPlatform() !== 'macos') return win.startResizeDragging(direction);
  if (!pointer) throw new Error('Mac 視窗縮放需要滑鼠或觸控指標。');
  cancelResize?.();
  pointer.target.setPointerCapture(pointer.pointerId);
  resizing = true;
  let ended = false;
  let ready = false;
  let latest: { screenX: number; screenY: number } | undefined;
  let originalBounds!: MiniWindowBounds;
  let scale = 1;
  let pending = Promise.resolve();
  const schedule = (event: { screenX: number; screenY: number }) => {
    latest = event;
    pending = pending.then(async () => {
      if (!ready || !latest || ended) return;
      const update = latest; latest = undefined;
      const bounds = resizedBounds(originalBounds, direction,
        Math.round((update.screenX - pointer.screenX) * scale), Math.round((update.screenY - pointer.screenY) * scale), scale);
      await windowOperation(async () => {
        if (ended) return;
        await win.setSize(new PhysicalSize(bounds.width, bounds.height));
        await win.setPosition(new PhysicalPosition(bounds.x, bounds.y));
      });
    }).catch(error => { finish(); console.warn('Mac 視窗縮放失敗', error); });
  };
  const move = (event: PointerEvent) => { if (event.pointerId === pointer.pointerId) schedule(event); };
  const up = (event: PointerEvent) => { if (event.pointerId === pointer.pointerId) finish(); };
  const finish = () => {
    ended = true; resizing = false;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    pointer.target.removeEventListener('lostpointercapture', finish);
    if (pointer.target.hasPointerCapture(pointer.pointerId)) pointer.target.releasePointerCapture(pointer.pointerId);
    if (cancelResize === finish) cancelResize = undefined;
  };
  cancelResize = finish;
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  pointer.target.addEventListener('lostpointercapture', finish);
  try {
    [originalBounds, scale] = await Promise.all([readMiniBounds(), win.scaleFactor()]);
    ready = true;
    if (latest && !ended) schedule(latest);
  } catch (error) { finish(); throw error; }
}
