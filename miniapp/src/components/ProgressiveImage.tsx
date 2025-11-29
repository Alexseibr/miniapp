import { memo, CSSProperties } from 'react';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  style?: CSSProperties;
  className?: string;
  onError?: () => void;
  'data-testid'?: string;
}

const ProgressiveImage = memo(({ 
  src, 
  alt, 
  placeholder, 
  style, 
  className,
  onError,
  'data-testid': testId
}: ProgressiveImageProps) => {
  const { imgSrc, blur } = useProgressiveImage({ src, placeholder });

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={{
        ...style,
        filter: blur ? 'blur(8px)' : 'none',
        transition: 'filter 0.3s ease-out',
      }}
      className={className}
      onError={onError}
      data-testid={testId}
    />
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';

export default ProgressiveImage;
