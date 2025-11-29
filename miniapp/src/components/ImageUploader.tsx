import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import http from '@/api/http';

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  maxSizeMB?: number;
}

export default function ImageUploader({ onUpload, maxSizeMB = 10 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = async (file: File) => {
    setError('');
    setUploading(true);

    try {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setError(`Файл слишком большой. Максимум ${maxSizeMB}MB`);
        setUploading(false);
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Выберите изображение');
        setUploading(false);
        return;
      }

      const extension = file.name.split('.').pop() || 'jpg';
      
      const presignedResponse = await http.post('/api/uploads/presigned-url', {
        fileExtension: extension,
      });

      const { uploadURL, publicURL } = presignedResponse.data;

      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Ошибка загрузки файла');
      }

      onUpload(publicURL);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
    event.target.value = '';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          data-testid="input-file-upload"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          data-testid="input-camera-capture"
        />
        
        <button
          type="button"
          className="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          data-testid="button-upload-from-device"
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Загрузка...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span>Выбрать фото</span>
            </>
          )}
        </button>
        
        <button
          type="button"
          className="secondary"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px' }}
          data-testid="button-capture-photo"
        >
          <Camera size={20} />
          <span>Камера</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#dc2626',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#dc2626',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
