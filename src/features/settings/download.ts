/** Saves a JSON value as a file through a temporary link (works offline, no server). */
export function downloadJson(fileName: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked later: some browsers start the download asynchronously.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10_000);
}
