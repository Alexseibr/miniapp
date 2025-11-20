const CDN_BASE_URL = process.env.CDN_BASE_URL?.replace(/\/$/, '');

function withCdn(path) {
  if (!CDN_BASE_URL || typeof path !== 'string') {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${CDN_BASE_URL}/${normalizedPath}`;
}

function applyCdnToMedia(media) {
  if (!Array.isArray(media)) return [];
  return media.map(withCdn).filter(Boolean);
}

module.exports = { withCdn, applyCdnToMedia };
