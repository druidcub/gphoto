import { expect, it } from 'vitest';
import { fitWindowBounds } from '../src/renderer/core/windowBounds';
const minimum = { width: 320, height: 180 };
const retina = { scaleFactor: 2, workArea: { position: { x: -2560, y: 0 }, size: { width: 2560, height: 1440 } } };
const main = { scaleFactor: 1, workArea: { position: { x: 0, y: 0 }, size: { width: 1920, height: 1040 } } };
it('keeps negative monitor coordinates and enforces logical minimum on Retina', () => {
  expect(fitWindowBounds({ x: -2000, y: 100, width: 320, height: 180 }, [main, retina], minimum)).toEqual({ x: -2000, y: 100, width: 640, height: 360 });
});
it('recovers after unplugging the previous monitor and constrains oversized bounds', () => {
  expect(fitWindowBounds({ x: -2000, y: 100, width: 640, height: 360 }, [main], minimum)).toEqual({ x: 0, y: 100, width: 640, height: 360 });
  expect(fitWindowBounds({ x: 1900, y: 1030, width: 8000, height: 6000 }, [main], minimum)).toEqual({ x: 0, y: 0, width: 1920, height: 1040 });
});
