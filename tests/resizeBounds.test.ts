import { expect, it } from 'vitest';
import { resizedBounds } from '../src/renderer/core/resizeBounds';
const original = { x: -1000, y: 100, width: 1280, height: 720 };
it('uses physical deltas and preserves the anchored opposite corner', () => {
  expect(resizedBounds(original, 'NorthWest', -200, -100, 2)).toEqual({ x: -1200, y: 0, width: 1480, height: 820 });
  expect(resizedBounds(original, 'SouthEast', 100, 200, 2)).toEqual({ x: -1000, y: 100, width: 1380, height: 920 });
});
it('enforces logical minimum at Retina scale without moving opposite edges', () => {
  expect(resizedBounds(original, 'NorthWest', 2000, 2000, 2)).toEqual({ x: -360, y: 460, width: 640, height: 360 });
  expect(resizedBounds(original, 'SouthEast', -2000, -2000, 2)).toEqual({ x: -1000, y: 100, width: 640, height: 360 });
});
