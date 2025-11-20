const CDN_BASE_URL = (import.meta.env.VITE_CDN_BASE_URL as string | undefined)?.replace(/\/$/, '');

export function buildCdnUrl(path?: string | null): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  if (!CDN_BASE_URL) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return `${CDN_BASE_URL}/${normalized}`;
}

export function applyCdnToMedia(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => buildCdnUrl(item))
    .filter((item): item is string => Boolean(item));
}
