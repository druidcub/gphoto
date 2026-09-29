export const SLIDE_DURATIONS = [10, 15, 30, 60, 120, 300] as const;
export function normalizeDuration(value: number): number {
  return SLIDE_DURATIONS.some((duration) => duration === value) ? value : 15;
}

export function playbackKey(event: Pick<KeyboardEvent, 'key' | 'code'>): string {
  // Injected/virtual keyboards may supply a logical key without a physical code.
  const key = event.key && event.key !== 'Unidentified' ? event.key : event.code;
  return key === ' ' ? 'Space' : key === 'Esc' ? 'Escape' : key;
}
