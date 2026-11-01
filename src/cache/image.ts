/** Keep one stable network/cache key. The service worker persists covers;
 * ArtworkImage retains decoded images. Never swap mounted URLs to blobs or
 * revoke a URL while a visible image still references it. */
export function getCachedImage(url: string): string {
  return url
}
