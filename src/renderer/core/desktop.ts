import { Channel, invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import type { AppSettings, FolderSelection, SyncEvent, SyncSummary } from '../../shared/types';

export async function choosePhotoFolder(defaultPath?: string): Promise<FolderSelection | null> {
  const selected = await open({
    title: '選擇照片資料夾',
    directory: true,
    multiple: false,
    defaultPath: defaultPath || undefined,
  });
  if (!selected) return null;

  const files = await scanPhotoFolder(selected);
  return { folderPath: selected, files };
}

export function scanPhotoFolder(folderPath: string): Promise<string[]> {
  return invoke<string[]>('scan_photo_folder', { folderPath });
}

export async function setFullscreen(fullscreen: boolean): Promise<void> {
  if (!fullscreen) await invoke('set_display_awake', { enabled: false });
  await getCurrentWindow().setFullscreen(fullscreen);
  if (fullscreen) await invoke('set_display_awake', { enabled: true });
}

export async function toggleFullscreen(): Promise<void> {
  const window = getCurrentWindow();
  await setFullscreen(!(await window.isFullscreen()));
}

export function loadSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('load_settings');
}

export function saveSettings(settings: AppSettings): Promise<void> {
  return invoke('save_settings', { settings });
}

export function syncGoogleAlbum(
  albumUrl: string,
  onEvent: (event: SyncEvent) => void,
): Promise<SyncSummary> {
  const channel = new Channel<SyncEvent>();
  channel.onmessage = onEvent;
  return invoke<SyncSummary>('sync_google_album', { albumUrl, onEvent: channel });
}
