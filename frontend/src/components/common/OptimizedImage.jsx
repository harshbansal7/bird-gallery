import { useState, useEffect, useMemo } from 'react';
import { Image, Skeleton, Box } from '@chakra-ui/react';
import { API_BASE_URL } from '../../services/config';

/**
 * OptimizedImage component that handles progressive loading and optimizations
 * 
 * @param {string} src - Original image URL
 * @param {string} alt - Alt text for the image
 * @param {number} width - Desired width of the image
 * @param {number} height - Desired height of the image
 * @param {string} objectFit - CSS object-fit property
 * @param {object} props - Additional props to pass to Image component
 */
function OptimizedImage({ src, alt, width, height, objectFit = 'cover', quality = 85, format = 'jpg', ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  
  // Calculate responsive image size based on screen width
  const optimizedWidth = useMemo(() => {
    if (typeof width === 'number') return width;
    
    // If width is not specified, set a responsive width based on screen size
    const screenWidth = window.innerWidth;
    
    // Calculate optimal image width based on viewport and device pixel ratio
    const pixelRatio = window.devicePixelRatio || 1;
    
    if (screenWidth <= 480) return 300 * pixelRatio; // Mobile
    if (screenWidth <= 768) return 400 * pixelRatio; // Tablet
    if (screenWidth <= 1280) return 500 * pixelRatio; // Laptop
    return 700 * pixelRatio; // Desktop
  }, [width, window.innerWidth]);
  
  useEffect(() => {
    // Reset loaded state when src changes
    if (src) {
      setIsLoaded(false);
      
      // Add a small delay before setting source to allow skeleton to render
      const timer = setTimeout(() => {
        // Try to get an optimized version of the image if possible
        // If the source is already a data URL or from certain CDNs, use directly
        if (src.startsWith('data:') || src.includes('placeholder.com')) {
          setImgSrc(src);
        } else {
          // Use our backend optimization endpoint
          const optimizedUrl = `${API_BASE_URL}/photos/optimize?url=${encodeURIComponent(src)}&width=${optimizedWidth}&quality=${quality}&format=${format}`;
          setImgSrc(optimizedUrl);
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [src, optimizedWidth, quality, format]);
  
  const handleImageError = (e) => {
    console.error('Image failed to load:', src);
    
    // Try loading the original image as fallback if optimization failed
    if (imgSrc !== src && !imgSrc.includes('placeholder.com')) {
      console.log('Falling back to original image');
      setImgSrc(src);
    } else {
      // If original image also fails, show placeholder
      e.target.src = `https://via.placeholder.com/${width || 300}x${height || 300}?text=Image+not+found`;
      setIsLoaded(true);
    }
  };
  
  return (
    <Box position="relative" width={width || "100%"} height={height || "auto"}>
      {!isLoaded && (
        <Skeleton
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          startColor="green.50"
          endColor="green.100"
          borderRadius={props.borderRadius || "md"}
        />
      )}
      <Image
        src={imgSrc}
        alt={alt}
        width="100%"
        height="100%"
        objectFit={objectFit}
        opacity={isLoaded ? 1 : 0}
        transition="opacity 0.5s"
        onLoad={() => setIsLoaded(true)}
        onError={handleImageError}
        loading="lazy"
        decoding="async" // Browser-level optimization for image decoding
        {...props}
      />
    </Box>
  );
}

export default OptimizedImage;