import { invoke, isTauri } from '@tauri-apps/api/core';

export type DesktopPlatform = 'windows' | 'macos' | 'other' | 'web';
let nativePlatform: Promise<DesktopPlatform> | undefined;
export function appPlatform(): Promise<DesktopPlatform> {
  if (!isTauri()) return Promise.resolve('web');
  return nativePlatform ??= invoke<DesktopPlatform>('platform_info').catch(error => {
    nativePlatform = undefined;
    throw error;
  });
}
export function platformLabel(platform: DesktopPlatform): string {
  return { windows: 'Windows', macos: 'macOS', other: '其他平台', web: '網頁預覽' }[platform];
}
export function isFullscreenShortcut(event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>, platform: DesktopPlatform): boolean {
  if (platform === 'macos') return event.key.toLowerCase() === 'f' && event.ctrlKey && event.metaKey && !event.altKey && !event.shiftKey;
  return event.key === 'F11' && platform === 'windows';
}
