import type { MiniWindowBounds } from '../../shared/types';
export type MonitorArea = { workArea: { position: { x: number; y: number }; size: { width: number; height: number } }; scaleFactor?: number };
export function fitWindowBounds(bounds: MiniWindowBounds, monitors: MonitorArea[], minimum: { width: number; height: number }): MiniWindowBounds {
  const monitor = monitors.find(m => bounds.x >= m.workArea.position.x && bounds.x < m.workArea.position.x + m.workArea.size.width && bounds.y >= m.workArea.position.y && bounds.y < m.workArea.position.y + m.workArea.size.height) ?? monitors[0];
  if (!monitor) return bounds;
  const area = monitor.workArea;
  const scale = monitor.scaleFactor ?? 1;
  const width = Math.min(Math.max(Math.round(minimum.width * scale), bounds.width), area.size.width);
  const height = Math.min(Math.max(Math.round(minimum.height * scale), bounds.height), area.size.height);
  const x = Math.max(area.position.x, Math.min(bounds.x, area.position.x + area.size.width - width));
  const y = Math.max(area.position.y, Math.min(bounds.y, area.position.y + area.size.height - height));
  return { x, y, width, height };
}
