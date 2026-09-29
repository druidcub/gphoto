import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SettingsPage } from '../src/renderer/pages/SettingsPage';
import type { AppSettings } from '../src/shared/types';
const settings: AppSettings = {
  sourceMode: 'googlePhotos', albumUrl: '', localFolderPath: '', immersiveMode: true,
  maxUpscale: 2, syncIntervalMinutes: 5, slideDurationSeconds: 15, softMode: true,
  miniWindowMode: false, miniWindowBounds: { x: 80, y: 80, width: 640, height: 360 },
};
const noop = () => {};
const render = (value: AppSettings) => renderToStaticMarkup(<SettingsPage settings={value} photoCount={0} isLoading={false} syncMessage="" error=""
  onSettingsChange={noop} onChooseFolder={noop} onSyncAlbum={noop} onStart={noop} onPreview={noop} onConfigureMiniWindow={noop} />);
it('provides an expandable album-sharing guide with access and privacy guidance', () => {
  const html = render(settings);
  expect(html).toContain('<details class="album-help">');
  for (const text of ['建立連結', '複製連結', '無痕視窗', '任何取得分享連結的人', '不會因此自動刪除']) expect(html).toContain(text);
  expect(render({ ...settings, sourceMode: 'local' })).not.toContain('class="album-help"');
});
it('hides mini controls until hovered and uses themed scrollbars', () => {
  const css = readFileSync(new URL('../src/renderer/styles/global.css', import.meta.url), 'utf8');
  expect(css).toMatch(/\.mini-toolbar \{[^}]*visibility: hidden;[^}]*opacity: 0;/);
  expect(css).toContain('.mini-player:hover .mini-toolbar { visibility: visible; opacity: 1; }');
  expect(css).toContain('.mini-player:hover .mini-toolbar button { pointer-events: auto; }');
  expect(css).toContain('scrollbar-color: #806849 #11161c;');
  expect(css).toContain('.setup-card::-webkit-scrollbar-thumb');
});
