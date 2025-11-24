import express from 'express';
import { objectStorageClient } from '../services/objectStorage.js';

const router = express.Router();

router.get('/:bucketName/:objectPath(*)', async (req, res) => {
  try {
    const { bucketName, objectPath } = req.params;
    
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectPath);
    
    let metadata;
    try {
      [metadata] = await file.getMetadata();
    } catch (metadataError) {
      if (metadataError.code === 404) {
        return res.status(404).send('File not found');
      }
      throw metadataError;
    }
    
    const contentType = metadata.contentType || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    if (metadata.etag) {
      res.setHeader('ETag', metadata.etag);
    }
    
    const stream = file.createReadStream();
    
    stream.on('error', (error) => {
      console.error(`Error streaming file ${bucketName}/${objectPath}:`, error);
      if (!res.headersSent) {
        res.status(404).send('File not found');
      }
    });
    
    stream.pipe(res);
  } catch (error) {
    console.error('Media proxy error:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

export default router;
