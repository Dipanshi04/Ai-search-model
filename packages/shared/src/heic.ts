const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// iPhone Photos filenames can carry characters (unicode, unusual symbols —
// seen from Messages/AirDrop-saved images in particular) that break the
// Content-Disposition header Safari builds for a multipart FormData upload,
// throwing a WebKit-only "The string did not match the expected pattern"
// TypeError with no server round-trip at all. A plain, guaranteed-ASCII
// name sidesteps that regardless of what a photo happened to be called.
function sanitizeFilename(file: File): File {
  const ext = EXT_BY_TYPE[file.type] || 'jpg';
  if (file.name === `photo.${ext}`) return file;
  return new File([file], `photo.${ext}`, { type: file.type });
}

// iPhones store photos as HEIC by default. Safari usually auto-converts to
// JPEG on selection when a file input's `accept` excludes image/heic, but
// that isn't reliable across iOS versions — some deliver the original HEIC
// blob anyway (seen from both the camera and "recent" iCloud-optimized
// photos), which then fails multer's mimetype filter server-side with no
// visible error to the runner. This converts client-side before upload so
// the server always receives a normal JPEG regardless of source format.
//
// Uses heic-to (actively maintained, last published a few months ago) —
// not heic2any (0.0.4, unmaintained for 3+ years) — and heic-to's own
// isHeic(), which sniffs the file's actual bytes instead of trusting
// file.type/file.name, since iOS is inconsistent about reporting either.
// Dynamically imported (not a top-level import) — it embeds a multi-MB
// WASM decoder, and a static import pulled that into every visitor's
// initial bundle even though almost nobody triggers this path.
export async function convertHeicIfNeeded(file: File): Promise<File> {
  const heicLib = await import('heic-to').catch(() => null);
  if (!heicLib) return sanitizeFilename(file);

  let heic = false;
  try {
    heic = await heicLib.isHeic(file);
  } catch {
    // If byte-sniffing itself fails, fall back to the old heuristic rather
    // than assume it's fine and skip conversion outright.
    heic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name);
  }

  if (!heic) return sanitizeFilename(file);

  try {
    const blob = await heicLib.heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    // Conversion failing is better handled by the existing upload-error
    // path than by silently sending a file the server will reject anyway.
    return sanitizeFilename(file);
  }
}
