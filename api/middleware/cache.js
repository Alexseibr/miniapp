const cacheStore = new Map();

function get(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
}

function set(key, value, ttlSeconds = 60) {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  cacheStore.set(key, { value, expiresAt });
}

function del(key) {
  cacheStore.delete(key);
}

function flushPrefix(prefix) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

function buildCacheKeyFromQuery(query = {}) {
  return Object.keys(query)
    .sort()
    .map((key) => `${key}:${JSON.stringify(query[key])}`)
    .join('|');
}

function cacheMiddleware(keyBuilder, ttlSeconds = 60) {
  return function cacheHandler(req, res, next) {
    const key = keyBuilder(req);
    if (!key) return next();

    const cachedValue = cacheClient.get(key);
    if (cachedValue) {
      return res.json(cachedValue);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        cacheClient.set(key, body, ttlSeconds);
      } catch (error) {
        console.warn(`⚠️  Failed to write cache for key ${key}:`, error.message);
      }
      return originalJson(body);
    };

    return next();
  };
}

const cacheClient = { get, set, del, flushPrefix };

module.exports = { cacheMiddleware, cacheClient, buildCacheKeyFromQuery };
