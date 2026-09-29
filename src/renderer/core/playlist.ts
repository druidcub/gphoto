import type { Photo, Slide } from '../../shared/types';

const LANDSCAPE_MIN_RATIO = 1.3;
const PORTRAIT_MAX_RATIO = 0.85;

export function buildSlides(photos: Photo[]): Slide[] {
  const landscapes: Photo[] = [];
  const portraits: Photo[] = [];
  const panZoom: Photo[] = [];

  for (const photo of photos) {
    if (photo.aspectRatio >= LANDSCAPE_MIN_RATIO) landscapes.push(photo);
    else if (photo.aspectRatio <= PORTRAIT_MAX_RATIO) portraits.push(photo);
    else panZoom.push(photo);
  }

  const slides: Slide[] = landscapes.map((photo) => ({
    id: `landscape:${photo.id}`,
    type: 'landscape',
    photo,
  }));

  for (let index = 0; index < portraits.length; index += 2) {
    const left = portraits[index];
    const right = portraits[index + 1];
    if (right) {
      slides.push({
        id: `pair:${left.id}:${right.id}`,
        type: 'verticalPair',
        left,
        right,
      });
    } else {
      slides.push({ id: `panzoom:${left.id}`, type: 'panzoom', photo: left });
    }
  }

  slides.push(
    ...panZoom.map((photo) => ({
      id: `panzoom:${photo.id}`,
      type: 'panzoom' as const,
      photo,
    })),
  );

  return interleave(slides);
}

function interleave(slides: Slide[]): Slide[] {
  const result: Slide[] = [];
  const remaining = [...slides];
  let previousType: Slide['type'] | undefined;

  while (remaining.length) {
    let index = remaining.findIndex((slide) => slide.type !== previousType);
    if (index < 0) index = 0;
    const [next] = remaining.splice(index, 1);
    result.push(next);
    previousType = next.type;
  }

  return result;
}

export function slidePhotoUrls(slide: Slide): string[] {
  return slide.type === 'verticalPair'
    ? [slide.left.url, slide.right.url]
    : [slide.photo.url];
}
