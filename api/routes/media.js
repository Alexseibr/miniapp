import express from 'express';
import { objectStorageClient } from '../services/objectStorage.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import sharp from 'sharp';

const router = express.Router();

const DEFAULT_BUCKET = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || 'replit-objstore-a3df7a13-fbc3-4a4b-8313-cff7b01817c6';

const PLACEHOLDER_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'>
  <rect width='800' height='600' fill='#F5F6F8'/>
  <g transform='translate(400, 300)'>
    <rect x='-60' y='-40' width='120' height='80' rx='8' fill='#E5E7EB'/>
    <circle cx='0' cy='-10' r='15' fill='#9CA3AF'/>
    <path d='M-40 30 L-20 10 L0 30 L20 0 L40 30' stroke='#9CA3AF' stroke-width='3' fill='none'/>
  </g>
  <text x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' fill='#9CA3AF' font-size='18' font-family='Inter, sans-serif'>Нет фото</text>
</svg>`;

const ALLOWED_HOSTS = [
  'images.unsplash.com',
  'unsplash.com',
  'picsum.photos',
  'fastly.picsum.photos',
  'storage.googleapis.com',
  'lh3.googleusercontent.com',
  'avatars.githubusercontent.com',
  'cdn.telegram.org',
  't.me',
  'telegram.org',
  'replit.dev',
  'spock.replit.dev',
];

const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isAllowedUrl(urlString) {
  try {
    const url = new URL(urlString);
    
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }
    
    const hostname = url.hostname.toLowerCase();
    
    for (const pattern of BLOCKED_IP_RANGES) {
      if (pattern.test(hostname)) {
        return false;
      }
    }
    
    for (const allowedHost of ALLOWED_HOSTS) {
      if (hostname === allowedHost || hostname.endsWith('.' + allowedHost)) {
        return true;
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

const imageCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

function cleanCache() {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
  if (imageCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(imageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, imageCache.size - MAX_CACHE_SIZE);
    toDelete.forEach(([key]) => imageCache.delete(key));
  }
}

router.get('/proxy', async (req, res) => {
  try {
    const { url, w, h, q } = req.query;
    const width = w ? parseInt(w, 10) : null;
    const height = h ? parseInt(h, 10) : null;
    const quality = q ? parseInt(q, 10) : 60;
    
    if (!url) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(PLACEHOLDER_SVG);
    }

    const decodedUrl = decodeURIComponent(url);
    
    if (!isAllowedUrl(decodedUrl)) {
      console.warn(`[MediaProxy] Blocked URL: ${decodedUrl}`);
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(PLACEHOLDER_SVG);
    }

    const cacheKey = `${decodedUrl}_${width || 'auto'}_${height || 'auto'}_${quality}`;
    
    if (imageCache.has(cacheKey)) {
      const cached = imageCache.get(cacheKey);
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached.data);
    }

    const parsedUrl = new URL(decodedUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const proxyReq = protocol.get(decodedUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'KetmarBot/1.0',
        'Accept': 'image/*',
      }
    }, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(PLACEHOLDER_SVG);
      }

      const contentType = proxyRes.headers['content-type'] || 'image/jpeg';
      
      if (!contentType.startsWith('image/')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(PLACEHOLDER_SVG);
      }

      const chunks = [];
      let totalSize = 0;

      proxyRes.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_RESPONSE_SIZE) {
          proxyReq.destroy();
          res.setHeader('Content-Type', 'image/svg+xml');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          if (!res.headersSent) {
            res.send(PLACEHOLDER_SVG);
          }
          return;
        }
        chunks.push(chunk);
      });
      
      proxyRes.on('end', async () => {
        if (res.headersSent) return;
        
        let data = Buffer.concat(chunks);
        let outputContentType = contentType;
        
        if (width || height || quality < 100) {
          try {
            let transformer = sharp(data);
            
            if (width || height) {
              transformer = transformer.resize(width || undefined, height || undefined, {
                fit: 'cover',
                withoutEnlargement: true,
              });
            }
            
            if (contentType.includes('png')) {
              data = await transformer.png({ quality: Math.min(quality, 100), compressionLevel: 9 }).toBuffer();
              outputContentType = 'image/png';
            } else {
              data = await transformer.jpeg({ quality: Math.min(quality, 100), progressive: true }).toBuffer();
              outputContentType = 'image/jpeg';
            }
          } catch (sharpErr) {
            console.warn('[MediaProxy] Sharp resize failed:', sharpErr.message);
          }
        }
        
        cleanCache();
        imageCache.set(cacheKey, {
          data,
          contentType: outputContentType,
          timestamp: Date.now()
        });

        res.setHeader('Content-Type', outputContentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Cache', 'MISS');
        res.send(data);
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error.message);
      if (!res.headersSent && !res.writableEnded) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(PLACEHOLDER_SVG);
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
    });

  } catch (error) {
    console.error('Media proxy error:', error);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(PLACEHOLDER_SVG);
    }
  }
});

router.get('/placeholder', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(PLACEHOLDER_SVG);
});

const resizedImageCache = new Map();
const RESIZED_CACHE_TTL = 30 * 60 * 1000;
const MAX_RESIZED_CACHE_SIZE = 200;

function cleanResizedCache() {
  const now = Date.now();
  for (const [key, value] of resizedImageCache.entries()) {
    if (now - value.timestamp > RESIZED_CACHE_TTL) {
      resizedImageCache.delete(key);
    }
  }
  if (resizedImageCache.size > MAX_RESIZED_CACHE_SIZE) {
    const entries = Array.from(resizedImageCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, resizedImageCache.size - MAX_RESIZED_CACHE_SIZE);
    toDelete.forEach(([key]) => resizedImageCache.delete(key));
  }
}

router.get('/:bucketName/:objectPath(*)', async (req, res) => {
  try {
    const { bucketName, objectPath } = req.params;
    const { w, h, q, f } = req.query;
    
    const width = w ? parseInt(w, 10) : null;
    const height = h ? parseInt(h, 10) : null;
    const quality = q ? Math.min(parseInt(q, 10), 100) : 75;
    const format = f === 'webp' ? 'webp' : 'jpeg';
    
    const needsResize = width || height || q;
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectPath);
    
    let metadata;
    try {
      [metadata] = await file.getMetadata();
    } catch (metadataError) {
      if (metadataError.code === 404 || metadataError.code === 403) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(PLACEHOLDER_SVG);
      }
      throw metadataError;
    }
    
    const contentType = metadata.contentType || 'application/octet-stream';
    const isImage = contentType.startsWith('image/');
    
    if (needsResize && isImage) {
      const cacheKey = `${bucketName}/${objectPath}_${width || 'auto'}_${height || 'auto'}_${quality}_${format}`;
      
      if (resizedImageCache.has(cacheKey)) {
        const cached = resizedImageCache.get(cacheKey);
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Optimized', 'cache-hit');
        res.setHeader('X-Original-Size', metadata.size || 0);
        res.setHeader('X-Optimized-Size', cached.data.length);
        return res.send(cached.data);
      }
      
      try {
        const [originalBuffer] = await file.download();
        
        let transformer = sharp(originalBuffer);
        
        if (width || height) {
          transformer = transformer.resize(width || undefined, height || undefined, {
            fit: 'cover',
            withoutEnlargement: true,
          });
        }
        
        let optimizedBuffer;
        let outputContentType;
        
        if (format === 'webp') {
          optimizedBuffer = await transformer.webp({ quality }).toBuffer();
          outputContentType = 'image/webp';
        } else {
          optimizedBuffer = await transformer.jpeg({ quality, progressive: true }).toBuffer();
          outputContentType = 'image/jpeg';
        }
        
        cleanResizedCache();
        resizedImageCache.set(cacheKey, {
          data: optimizedBuffer,
          contentType: outputContentType,
          timestamp: Date.now()
        });
        
        res.setHeader('Content-Type', outputContentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Optimized', 'resized');
        res.setHeader('X-Original-Size', originalBuffer.length);
        res.setHeader('X-Optimized-Size', optimizedBuffer.length);
        return res.send(optimizedBuffer);
      } catch (sharpErr) {
        console.warn('[Media] Sharp resize failed, streaming original:', sharpErr.message);
      }
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    if (metadata.etag) {
      res.setHeader('ETag', metadata.etag);
    }
    
    const stream = file.createReadStream();
    
    stream.on('error', (error) => {
      console.error(`Error streaming file ${bucketName}/${objectPath}:`, error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(PLACEHOLDER_SVG);
      }
    });
    
    stream.pipe(res);
  } catch (error) {
    console.error('Media proxy error:', error);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(PLACEHOLDER_SVG);
    }
  }
});

export default router;
