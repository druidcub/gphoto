import type { Photo, Slide } from '../../shared/types';
import { calculateFramePresentation } from './presentation';

function describePhoto(photo: Photo, frameWidth: number, animated: boolean): string {
  const frame = calculateFramePresentation(photo.width, photo.height, frameWidth, 2160, 2);
  const horizontal = frame.foregroundWidth < frameWidth - 1;
  const vertical = frame.foregroundHeight < 2159;
  const spacing = horizontal && vertical ? '四周留白' : horizontal ? '左右留白' : vertical ? '上下留白' : '無留白';
  const motion = animated && frame.animationScale > 1
    ? '緩慢放大與上下平移；首尾完整，中段邊緣可能裁切'
    : '靜態、不裁切';
  return `${spacing} · ${motion}`;
}

export function describeSlide(slide: Slide): string[] {
  if (slide.type === 'verticalPair') return [
    `左：${describePhoto(slide.left, 1920, false)}`,
    `右：${describePhoto(slide.right, 1920, false)}`,
    '留白以雙照片漸層模糊背景融合',
  ];
  return [describePhoto(slide.photo, 3840, slide.type === 'panzoom'), '留白以同照片模糊背景填補'];
}
