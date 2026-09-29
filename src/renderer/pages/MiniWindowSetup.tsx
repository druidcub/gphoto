import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { MiniWindowBounds } from '../../shared/types';
import { dragMiniWindow, readMiniBounds, resizeMiniWindow } from '../core/miniWindow';

const directions = ['North', 'South', 'East', 'West', 'NorthEast', 'NorthWest', 'SouthEast', 'SouthWest'] as const;
export function MiniWindowSetup({ onFinish }: { onFinish: (save: boolean) => void }) {
  const [bounds, setBounds] = useState<MiniWindowBounds>();
  const [error, setError] = useState('');
  const run = (action: Promise<unknown>) => { void action.catch((reason) => setError(String(reason))); };
  useEffect(() => {
    let disposed = false;
    const unsubscribers: (() => void)[] = [];
    const refresh = () => { void readMiniBounds().then((value) => { if (!disposed) setBounds(value); }).catch((reason) => { if (!disposed) setError(String(reason)); }); };
    const subscribe = async () => {
      for (const listen of [getCurrentWindow().onMoved.bind(getCurrentWindow()), getCurrentWindow().onResized.bind(getCurrentWindow())]) {
        const unlisten = await listen(refresh);
        if (disposed) unlisten(); else unsubscribers.push(unlisten);
      }
    };
    void subscribe().catch((reason) => setError(String(reason)));
    refresh();
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onFinish(false); };
    window.addEventListener('keydown', key);
    return () => { disposed = true; unsubscribers.forEach((fn) => fn()); window.removeEventListener('keydown', key); };
  }, [onFinish]);
  return <main className="mini-setup" onPointerDown={(event) => {
    if (event.button === 0 && !(event.target as HTMLElement).closest('button')) run(dragMiniWindow());
  }}>
    <h1>小視窗位置設定</h1>
    <p>拖曳內部移動 · 拖曳外框調整大小</p>
    <small>{bounds ? `${bounds.width} × ${bounds.height} px · X ${bounds.x} / Y ${bounds.y}` : '讀取視窗…'}</small>
    <div><button onClick={() => onFinish(true)}>儲存位置與大小</button><button onClick={() => onFinish(false)}>取消 · Esc</button></div>
    {error && <small role="alert">{error}</small>}
    {directions.map((direction) => <div key={direction} className={`resize-handle resize-${direction}`} onPointerDown={(event) => {
      event.stopPropagation(); if (event.button === 0) run(resizeMiniWindow(direction));
    }} />)}
  </main>;
}
