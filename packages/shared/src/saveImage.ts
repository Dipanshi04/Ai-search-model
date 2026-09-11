// iOS Safari doesn't reliably honor the `download` attribute on a
// programmatically-clicked <a> for a blob/data URL — it just opens the
// image instead of saving it, unlike every other major browser. The Web
// Share API (supported on iOS Safari 15+) opens the native share sheet,
// which includes "Save Image" — that's the one save path that actually
// works there. Desktop/Android browsers either don't support file
// sharing or work fine with plain <a download>, so this tries the share
// sheet first and only falls back to the anchor-click approach.
export async function saveOrShareCanvas(canvas: HTMLCanvasElement, filename: string, shareTitle: string): Promise<void> {
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Failed to generate image');

  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean; share?: (data: ShareData) => Promise<void> };

  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: shareTitle });
      return;
    } catch (err) {
      // AbortError just means the user dismissed the share sheet — not a
      // failure worth falling back for. Anything else, fall through to
      // the download-link approach below.
      if (err instanceof Error && err.name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
