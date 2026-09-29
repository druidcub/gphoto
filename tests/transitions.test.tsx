import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Slide } from '../src/shared/types';
import { PlayerPage } from '../src/renderer/pages/PlayerPage';

const counts = vi.hoisted(() => ({ mounts: {} as Record<string, number>, unmounts: {} as Record<string, number> }));
vi.mock('../src/renderer/components/SlideView', async () => {
  const { useEffect } = await import('react');
  return { SlideView: ({ slide, paused }: { slide: Slide; paused: boolean }) => {
    useEffect(() => {
      counts.mounts[slide.id] = (counts.mounts[slide.id] ?? 0) + 1;
      return () => { counts.unmounts[slide.id] = (counts.unmounts[slide.id] ?? 0) + 1; };
    }, []);
    return <div data-slide={slide.id} data-paused={paused} />;
  } };
});
let renderer: ReactTestRenderer;
const slide = (id: string): Slide => ({ id, type: 'panzoom', photo: { id, name: '', path: '', url: '', width: 2000, height: 2000, aspectRatio: 1 } });
const a = slide('a'); const b = slide('b');
beforeEach(() => { counts.mounts = {}; counts.unmounts = {}; vi.stubGlobal('window', { setTimeout, clearTimeout }); });
afterEach(() => { if (renderer) act(() => renderer.unmount()); vi.unstubAllGlobals(); });
const props = { paused: false, slideNumber: 1, totalSlides: 2, immersiveMode: true, maxUpscale: 2, onExit: () => {} };

it('preserves the current slide instance and pauses its motion while the next fades in', () => {
  act(() => { renderer = create(<PlayerPage {...props} slide={a} previousSlide={null} />); });
  act(() => renderer.update(<PlayerPage {...props} slide={b} previousSlide={a} />));
  expect(counts.mounts).toEqual({ a: 1, b: 1 });
  expect(counts.unmounts).toEqual({});
  expect(renderer.root.findByProps({ 'data-slide': 'a' }).props['data-paused']).toBe(true);
  act(() => renderer.update(<PlayerPage {...props} slide={b} previousSlide={null} />));
  expect(counts.unmounts).toEqual({ a: 1 });
  expect(counts.mounts.b).toBe(1);
});

it('keeps pin and exit available in immersive mini mode and supports disabling feathering', () => {
  const pin = vi.fn(); const exit = vi.fn();
  act(() => { renderer = create(<PlayerPage {...props} slide={a} previousSlide={null} miniWindowMode pinned onPin={pin} onExit={exit} softMode={false} />); });
  expect(renderer.root.findByType('main').props.className).not.toContain('soft-mode');
  act(() => renderer.root.findByProps({ 'aria-label': '取消置頂' }).props.onClick());
  act(() => renderer.root.findByProps({ 'aria-label': '返回設定' }).props.onClick());
  expect(pin).toHaveBeenCalledOnce(); expect(exit).toHaveBeenCalledOnce();
});
