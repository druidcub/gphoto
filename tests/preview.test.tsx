import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PreviewPage } from '../src/renderer/pages/PreviewPage';
import type { Photo, Slide } from '../src/shared/types';
import { VerticalPairSlide } from '../src/renderer/components/VerticalPairSlide';

it('labels playlist pages independently from source photo numbers in a mixed pair', () => {
  const photos: Photo[] = [1, 2, 3].map((id) => ({ id: String(id), path: `${id}.jpg`, url: `${id}.jpg`, name: String(id), width: 900, height: 1600, aspectRatio: 9 / 16 }));
  const slides: Slide[] = [{ id: 'pair', type: 'verticalPair', left: photos[2], right: photos[0] }];
  const html = renderToStaticMarkup(<PreviewPage slides={slides} photos={photos} syncing onBack={() => {}} onPlay={() => {}} />);
  expect(html).toContain('投影片 1');
  expect(html).toContain('照片 #3');
  expect(html).toContain('照片 #1');
  expect(html).toContain('class="slide-number">投影片 1 · 照片 #3 ／ 照片 #1');
  expect(html).toContain('此預覽保持固定');
  const caption = html.split('class="preview-caption"')[1];
  expect(caption).toContain('不裁切');
  expect(caption).not.toContain('照片 #');
  expect(caption).not.toContain('完整照片');
});

it('uses one shared blended backdrop and two sharp foregrounds for a pair', () => {
  const photo: Photo = { id: '1', path: '', url: 'photo.jpg', name: '', width: 900, height: 1600, aspectRatio: 9 / 16 };
  const html = renderToStaticMarkup(<VerticalPairSlide left={photo} right={photo} maxUpscale={2} />);
  expect(html).toContain('pair-background-blend');
  expect(html.match(/class="photo-foreground"/g)).toHaveLength(2);
  expect(html).not.toContain('class="photo-background"');
});
