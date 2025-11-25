import sharp from 'sharp';
import { objectStorageClient, ObjectStorageService } from '../api/services/objectStorage.js';
import MediaFile from '../models/MediaFile.js';

const MAX_FILE_SIZE_BYTES = parseInt(process.env.UPLOAD_MAX_SIZE_BYTES || '10485760', 10);

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const THUMBNAIL_CONFIG = {
  width: 400,
  height: 400,
  fit: 'inside',
  withoutEnlargement: true,
  quality: 75,
};

const FULL_IMAGE_CONFIG = {
  width: 1600,
  height: 1600,
  fit: 'inside',
  withoutEnlargement: true,
  quality: 85,
};

export class MediaService {
  constructor() {
    this.objectStorageService = new ObjectStorageService();
  }

  validateFileSize(size) {
    if (size && size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: 'FILE_TOO_LARGE',
        message: `Файл слишком большой. Максимальный размер — ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} МБ.`,
      };
    }
    return { valid: true };
  }

  validateMimeType(mimeType) {
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      return {
        valid: false,
        error: 'INVALID_FILE_TYPE',
        message: `Недопустимый тип файла. Разрешены: ${ALLOWED_MIME_TYPES.join(', ')}.`,
      };
    }
    return { valid: true };
  }

  async createUploadSession({ mimeType, size, ownerTelegramId, fileExtension = 'jpg' }) {
    const sizeValidation = this.validateFileSize(size);
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.message);
    }

    const mimeValidation = this.validateMimeType(mimeType);
    if (!mimeValidation.valid) {
      throw new Error(mimeValidation.message);
    }

    const { uploadURL, publicURL, bucketName, objectName, objectId } = 
      await this.objectStorageService.getUploadURLWithMeta(fileExtension);

    const thumbObjectName = objectName.replace(`/photos/${objectId}`, `/photos/thumbs/${objectId}`);
    const thumbUrl = `/api/media/${bucketName}/${thumbObjectName}`;

    const mediaFile = await MediaFile.create({
      type: 'image',
      ownerTelegramId: ownerTelegramId || null,
      originalKey: `/${bucketName}/${objectName}`,
      thumbKey: `/${bucketName}/${thumbObjectName}`,
      originalUrl: publicURL,
      thumbUrl: thumbUrl,
      size: size || 0,
      mimeType: mimeType || 'image/jpeg',
      status: 'temporary',
    });

    return {
      uploadURL,
      fileId: mediaFile._id.toString(),
      fileUrl: publicURL,
      thumbUrl: thumbUrl,
    };
  }

  async completeUpload(fileId, ownerTelegramId) {
    const mediaFile = await MediaFile.findById(fileId);
    
    if (!mediaFile) {
      throw new Error('MediaFile not found');
    }

    if (ownerTelegramId && mediaFile.ownerTelegramId && 
        mediaFile.ownerTelegramId !== ownerTelegramId) {
      throw new Error('Access denied');
    }

    if (mediaFile.thumbUrl && mediaFile.status !== 'temporary') {
      return mediaFile;
    }

    try {
      await this.createThumbnail(mediaFile);
      
      return mediaFile;
    } catch (error) {
      console.error('[MediaService] createThumbnail error:', error.message);
      return mediaFile;
    }
  }

  async createThumbnail(mediaFile) {
    const { bucketName, objectName } = this.parseObjectPath(mediaFile.originalKey);
    const bucket = objectStorageClient.bucket(bucketName);
    
    const [originalBuffer] = await bucket.file(objectName).download();

    const thumbBuffer = await sharp(originalBuffer)
      .resize(THUMBNAIL_CONFIG.width, THUMBNAIL_CONFIG.height, {
        fit: THUMBNAIL_CONFIG.fit,
        withoutEnlargement: THUMBNAIL_CONFIG.withoutEnlargement,
      })
      .jpeg({ quality: THUMBNAIL_CONFIG.quality })
      .toBuffer();

    const { bucketName: thumbBucketName, objectName: thumbObjectName } = 
      this.parseObjectPath(mediaFile.thumbKey);
    
    const thumbFile = bucket.file(thumbObjectName);
    await thumbFile.save(thumbBuffer, {
      contentType: 'image/jpeg',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    console.log(`[MediaService] Thumbnail created: ${mediaFile.thumbKey}`);
    return true;
  }

  parseObjectPath(path) {
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    const pathParts = path.split('/');
    if (pathParts.length < 3) {
      throw new Error('Invalid path: must contain at least a bucket name');
    }

    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join('/');

    return { bucketName, objectName };
  }

  async attachToAd(fileIds, adId, ownerTelegramId) {
    if (!fileIds || !fileIds.length) {
      return [];
    }

    const mediaFiles = await MediaFile.find({
      _id: { $in: fileIds },
      status: { $in: ['temporary', 'attached'] },
    });

    if (ownerTelegramId) {
      const unauthorized = mediaFiles.filter(
        f => f.ownerTelegramId && f.ownerTelegramId !== ownerTelegramId
      );
      if (unauthorized.length > 0) {
        throw new Error('Unauthorized access to some media files');
      }
    }

    await MediaFile.updateMany(
      { _id: { $in: fileIds } },
      { $set: { adId, status: 'attached' } }
    );

    return mediaFiles.map(f => ({
      _id: f._id,
      originalUrl: f.originalUrl,
      thumbUrl: f.thumbUrl,
      isMain: f.isMain,
    }));
  }

  async detachFromAd(adId) {
    await MediaFile.updateMany(
      { adId },
      { $set: { adId: null, status: 'temporary' } }
    );
  }

  async markAsDeleted(fileIds) {
    await MediaFile.updateMany(
      { _id: { $in: fileIds } },
      { $set: { status: 'deleted' } }
    );
  }

  async getMediaByAdId(adId) {
    return MediaFile.find({ 
      adId, 
      status: 'attached' 
    }).sort({ isMain: -1, createdAt: 1 });
  }

  async cleanupTemporaryFiles(hoursOld = 24) {
    const threshold = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

    const unusedFiles = await MediaFile.find({
      status: 'temporary',
      adId: null,
      createdAt: { $lt: threshold },
    }).limit(100);

    let deletedCount = 0;

    for (const mediaFile of unusedFiles) {
      try {
        await this.deleteFromStorage(mediaFile);
        
        mediaFile.status = 'deleted';
        await mediaFile.save();
        
        deletedCount++;
        console.log(`[MediaService] Cleaned up: ${mediaFile.originalKey}`);
      } catch (error) {
        console.error(`[MediaService] Cleanup failed for ${mediaFile._id}:`, error.message);
      }
    }

    return { deletedCount, totalFound: unusedFiles.length };
  }

  async deleteFromStorage(mediaFile) {
    const keysToDelete = [mediaFile.originalKey];
    if (mediaFile.thumbKey) {
      keysToDelete.push(mediaFile.thumbKey);
    }

    for (const key of keysToDelete) {
      try {
        const { bucketName, objectName } = this.parseObjectPath(key);
        const bucket = objectStorageClient.bucket(bucketName);
        await bucket.file(objectName).delete({ ignoreNotFound: true });
      } catch (error) {
        console.warn(`[MediaService] Failed to delete ${key}:`, error.message);
      }
    }
  }
}

export const mediaService = new MediaService();
