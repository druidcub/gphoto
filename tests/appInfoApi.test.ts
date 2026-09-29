import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ isTauri: vi.fn(() => true), getVersion: vi.fn(async () => '9.8.7'), openUrl: vi.fn(async () => {}) }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: api.isTauri }));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: api.getVersion }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: api.openUrl }));
import { appVersion, openExternal, externalLinks } from '../src/renderer/core/appInfo';
it('uses the running Tauri version and permits only known external destinations', async () => {
  expect(await appVersion()).toBe('9.8.7');
  await openExternal('support');
  expect(api.openUrl).toHaveBeenCalledWith('https://paypal.me/druidcub');
  await expect(openExternal('invalid' as 'support')).rejects.toThrow();
  const permissions = JSON.parse(readFileSync('src-tauri/capabilities/default.json', 'utf8')).permissions;
  const opener = permissions.filter((p: unknown) => typeof p === 'object');
  expect(opener).toEqual([{ identifier: 'opener:allow-open-url', allow: Object.values(externalLinks).map(url => ({ url })) }]);
});
it('uses build package version in browser preview', async () => {
  api.isTauri.mockReturnValue(false);
  expect(await appVersion()).toBe(JSON.parse(readFileSync('package.json', 'utf8')).version);
});
