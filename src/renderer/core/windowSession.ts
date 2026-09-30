import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { appPlatform } from './platform';

export type WindowMode = 'settings' | 'fullscreenPlayback' | 'miniSetup' | 'miniPlayback';
let mode: WindowMode = 'settings';
let queue: Promise<unknown> = Promise.resolve();
export function windowMode(): WindowMode { return mode; }
export function windowOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}
export function commitWindowMode(next: WindowMode): void { mode = next; }

// Called inside the serialized operation, never enqueue recursively.
export async function applyFullscreen(fullscreen: boolean): Promise<void> {
  const win = getCurrentWindow();
  const platform = await appPlatform();
  if (!fullscreen) await invoke('set_display_awake', { enabled: false });
  if (await win.isFullscreen() !== fullscreen) {
    await win.setFullscreen(fullscreen);
    if (platform === 'macos') {
      // Native Spaces transitions are asynchronous. Observe settled geometry rather
      // than assuming setFullscreen's acknowledgement means animation completed.
      const started = Date.now();
      const deadline = started + 5000;
      let previous = '', stableSince = 0;
      let settled = false;
      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const [active, size, position] = await Promise.all([win.isFullscreen(), win.innerSize(), win.outerPosition()]);
        const geometry = `${size.width}:${size.height}:${position.x}:${position.y}`;
        if (active !== fullscreen || geometry !== previous) stableSince = Date.now();
        previous = geometry;
        if (active === fullscreen && Date.now() - started >= 1000 && Date.now() - stableSince >= 500) { settled = true; break; }
      }
      if (!settled) throw new Error('macOS 全螢幕切換尚未完成，請稍後再試。');
    }
  }
  if (fullscreen) await invoke('set_display_awake', { enabled: true });
}
