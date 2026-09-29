import { describe, expect, it } from 'vitest';
import { calculateFramePresentation } from '../src/renderer/core/presentation';

describe('calculateFramePresentation', () => {
  it('darkens and blurs more as the aspect mismatch grows', () => {
    const matching = calculateFramePresentation(3840, 2160, 3840, 2160, 2);
    const portrait = calculateFramePresentation(2160, 3840, 3840, 2160, 2);
    expect(portrait.blur).toBeGreaterThan(matching.blur);
    expect(portrait.brightness).toBeLessThan(matching.brightness);
    expect(portrait.brightness).toBeGreaterThanOrEqual(0.72);
    expect(matching.blur).toBeGreaterThanOrEqual(26);
    expect(portrait.blur).toBeLessThanOrEqual(52);
  });

  it('never enlarges the base foreground past maxUpscale', () => {
    const result = calculateFramePresentation(800, 600, 3840, 2160, 2);
    expect(result.baseScale).toBe(2);
    expect(result.foregroundWidth).toBe(1600);
    expect(result.foregroundHeight).toBe(1200);
    expect(result.animationScale).toBe(1);
  });

  it('caps pan zoom at 1.1', () => {
    const result = calculateFramePresentation(4000, 3000, 1920, 1080, 2);
    expect(result.animationScale).toBeLessThanOrEqual(1.1);
    expect(result.animationScale).toBeGreaterThanOrEqual(1);
  });
});
