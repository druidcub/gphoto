import { availableMonitors, getCurrentWindow, LogicalSize, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';
import type { MiniWindowBounds } from '../../shared/types';

let original: { position: PhysicalPosition; size: PhysicalSize; maximized: boolean } | null = null;
export async function readMiniBounds(): Promise<MiniWindowBounds> {
  const win = getCurrentWindow();
  const [position, size] = await Promise.all([win.outerPosition(), win.innerSize()]);
  return { x: position.x, y: position.y, width: size.width, height: size.height };
}

export async function enterMiniWindow(bounds: MiniWindowBounds, editing: boolean): Promise<void> {
  const win = getCurrentWindow();
  if (!original) original = { position: await win.outerPosition(), size: await win.innerSize(), maximized: await win.isMaximized() };
  await win.setFullscreen(false);
  await win.unmaximize();
  await win.setMinSize(new PhysicalSize(320, 180));
  await win.setDecorations(false);
  await win.setResizable(editing);
  await win.setAlwaysOnTop(false);
  const monitors = await availableMonitors();
  const monitor = monitors.find((m) => bounds.x >= m.workArea.position.x && bounds.x < m.workArea.position.x + m.workArea.size.width && bounds.y >= m.workArea.position.y && bounds.y < m.workArea.position.y + m.workArea.size.height) ?? monitors[0];
  const area = monitor?.workArea;
  const width = Math.min(Math.max(320, bounds.width), area?.size.width ?? 7680);
  const height = Math.min(Math.max(180, bounds.height), area?.size.height ?? 4320);
  const x = area ? Math.max(area.position.x, Math.min(bounds.x, area.position.x + area.size.width - width)) : bounds.x;
  const y = area ? Math.max(area.position.y, Math.min(bounds.y, area.position.y + area.size.height - height)) : bounds.y;
  await win.setSize(new PhysicalSize(width, height));
  await win.setPosition(new PhysicalPosition(x, y));
}

export async function restoreWindow(): Promise<void> {
  const win = getCurrentWindow();
  await win.setAlwaysOnTop(false);
  await win.setFullscreen(false);
  await win.setResizable(true);
  await win.setDecorations(true);
  await win.setMinSize(new LogicalSize(960, 640));
  if (original) {
    await win.setSize(original.size);
    await win.setPosition(original.position);
    if (original.maximized) await win.maximize();
    original = null;
  }
}

export const dragMiniWindow = () => getCurrentWindow().startDragging();
export const pinMiniWindow = (pinned: boolean) => getCurrentWindow().setAlwaysOnTop(pinned);
export const resizeMiniWindow = (direction: 'North' | 'South' | 'East' | 'West' | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest') => getCurrentWindow().startResizeDragging(direction);
