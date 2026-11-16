export function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatWords(words: number): string {
  if (words >= 1000) return `${(words / 1000).toFixed(1)}k words`;
  return `${words} words`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
