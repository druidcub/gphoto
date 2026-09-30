import type { MiniWindowBounds } from '../../shared/types';
export type ResizeEdge = 'North' | 'South' | 'East' | 'West' | 'NorthEast' | 'NorthWest' | 'SouthEast' | 'SouthWest';
export function resizedBounds(original: MiniWindowBounds, direction: ResizeEdge, dx: number, dy: number, scale: number): MiniWindowBounds {
  const result = { ...original };
  const minWidth = Math.round(320 * scale), minHeight = Math.round(180 * scale);
  if (direction.includes('East')) result.width = Math.max(minWidth, original.width + dx);
  if (direction.includes('South')) result.height = Math.max(minHeight, original.height + dy);
  if (direction.includes('West')) {
    result.width = Math.max(minWidth, original.width - dx);
    result.x = original.x + original.width - result.width;
  }
  if (direction.includes('North')) {
    result.height = Math.max(minHeight, original.height - dy);
    result.y = original.y + original.height - result.height;
  }
  return result;
}
