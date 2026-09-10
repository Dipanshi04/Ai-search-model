// iPhones store photos as HEIC by default. Safari usually auto-converts to
// JPEG on selection when a file input's `accept` excludes image/heic, but
// that isn't reliable across iOS versions — some deliver the original HEIC
// blob anyway (seen from both the camera and "recent" iCloud-optimized
// photos), which then fails multer's mimetype filter server-side with no
// visible error to the runner. This converts client-side before upload so
// the server always receives a normal JPEG regardless of source format.
export async function convertHeicIfNeeded(file: File): Promise<File> {
  const looksHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.hei[cf]$/i.test(file.name);

  if (!looksHeic) return file;

  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) return file;
    const newName = file.name.replace(/\.hei[cf]$/i, '.jpg');
    return new File([blob], newName || 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    // Conversion failing is better handled by the existing upload-error
    // path than by silently sending a file the server will reject anyway.
    return file;
  }
}
