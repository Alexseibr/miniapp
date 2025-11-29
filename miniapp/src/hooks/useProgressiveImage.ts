import { useState, useEffect } from 'react';

interface UseProgressiveImageProps {
  src: string;
  placeholder?: string;
}

export const useProgressiveImage = ({ src, placeholder }: UseProgressiveImageProps) => {
  const [imgSrc, setImgSrc] = useState(placeholder || src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { imgSrc, isLoading, blur: isLoading && placeholder };
};
