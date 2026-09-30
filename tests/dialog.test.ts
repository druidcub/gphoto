import { expect, it, vi } from 'vitest';
import { showVersionDialog } from '../src/renderer/core/dialog';
it('does not load fallback when a native modal is supported', async () => {
  const modal = { showModal: vi.fn(), open: false };
  const load = vi.fn();
  await showVersionDialog(modal as unknown as HTMLDialogElement, load);
  expect(load).not.toHaveBeenCalled();
  expect(modal.showModal).toHaveBeenCalledOnce();
});
it('registers the older WebKit fallback before opening', async () => {
  const modal = { open: false, showModal: undefined as undefined | (() => void), classList: { add: vi.fn() } };
  const show = vi.fn();
  const registerDialog = vi.fn(() => { modal.showModal = show; });
  await showVersionDialog(modal as unknown as HTMLDialogElement, async () => ({ registerDialog }));
  expect(registerDialog).toHaveBeenCalledWith(modal);
  expect(modal.classList.add).toHaveBeenCalledWith('fixed');
  expect(show).toHaveBeenCalledOnce();
});
