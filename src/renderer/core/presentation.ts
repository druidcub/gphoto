export type FramePresentation = {
  blur: number;
  brightness: number;
  backgroundScale: number;
  foregroundWidth: number;
  foregroundHeight: number;
  baseScale: number;
  animationScale: number;
};

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateFramePresentation(
  photoWidth: number,
  photoHeight: number,
  frameWidth: number,
  frameHeight: number,
  maxUpscale = 2,
): FramePresentation {
  const safePhotoWidth = Math.max(1, photoWidth);
  const safePhotoHeight = Math.max(1, photoHeight);
  const safeFrameWidth = Math.max(1, frameWidth);
  const safeFrameHeight = Math.max(1, frameHeight);
  const photoAspect = safePhotoWidth / safePhotoHeight;
  const frameAspect = safeFrameWidth / safeFrameHeight;
  const mismatch = Math.abs(Math.log(photoAspect / frameAspect));
  const baseScale = Math.min(
    safeFrameWidth / safePhotoWidth,
    safeFrameHeight / safePhotoHeight,
    Math.max(1, maxUpscale),
  );
  const animationScale = clamp(Math.max(1, maxUpscale) / baseScale, 1, 1.1);

  return {
    blur: clamp(26 + mismatch * 28, 26, 52),
    brightness: clamp(0.82 - mismatch * 0.06, 0.72, 0.82),
    backgroundScale: clamp(1.08 + mismatch * 0.03, 1.08, 1.15),
    foregroundWidth: safePhotoWidth * baseScale,
    foregroundHeight: safePhotoHeight * baseScale,
    baseScale,
    animationScale,
  };
}
