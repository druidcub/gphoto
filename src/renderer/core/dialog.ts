type DialogRegistration = { registerDialog: (dialog: HTMLDialogElement) => void };
export async function showVersionDialog(dialog: HTMLDialogElement,
  load: () => Promise<DialogRegistration> = async () => (await import('dialog-polyfill')).default): Promise<void> {
  if (typeof dialog.showModal !== 'function') {
    (await load()).registerDialog(dialog);
    dialog.classList.add('fixed');
  }
  if (!dialog.open) dialog.showModal();
}
