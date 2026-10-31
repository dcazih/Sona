export async function getCachedImage(url: string): Promise<string> {
  // Return the stable authenticated URL immediately. Waiting for CacheStorage,
  // downloading a Blob, and creating a new object URL blocked first paint and
  // leaked object URLs during fast carousel navigation. The browser's native
  // HTTP image cache now handles reuse without delaying rendering.
  return url
}
