import { isTauri } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';

export const externalLinks = {
  support: 'https://paypal.me/druidcub',
  releases: 'https://github.com/druidcub/gphoto/releases',
} as const;
export async function appVersion(): Promise<string> {
  return isTauri() ? getVersion() : __APP_VERSION__;
}
export async function openExternal(destination: keyof typeof externalLinks): Promise<void> {
  const url = externalLinks[destination];
  if (!url) throw new Error('不支援的外部連結');
  if (isTauri()) await openUrl(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
