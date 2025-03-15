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
function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  objectFit = 'cover', 
  quality = 80, 
  format = 'webp', // Default to webp for better compression
  priority = false, // Set to true for above-the-fold images
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Check if browser supports WebP
  const supportsWebP = useMemo(() => {
    // Simple feature detection - could be enhanced with a proper feature detection library
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  }, []);
  
  // Determine best format based on browser support
  const bestFormat = useMemo(() => {
    return supportsWebP ? 'webp' : format === 'webp' ? 'jpg' : format;
  }, [supportsWebP, format]);
  
  // Calculate responsive image size based on screen width and DPR
  const { optimizedWidth, optimizedHeight } = useMemo(() => {
    // Get device pixel ratio for high-DPI displays
    const pixelRatio = window.devicePixelRatio || 1;
    const screenWidth = window.innerWidth;
    
    let calculatedWidth;
    if (typeof width === 'number') {
      calculatedWidth = width * pixelRatio;
    } else {
      // Responsive width based on viewport
      if (screenWidth <= 480) calculatedWidth = 320 * pixelRatio; // Mobile
      else if (screenWidth <= 768) calculatedWidth = 450 * pixelRatio; // Tablet
      else if (screenWidth <= 1280) calculatedWidth = 640 * pixelRatio; // Laptop
      else calculatedWidth = 800 * pixelRatio; // Desktop
    }
    
    // Calculate height preserving aspect ratio if possible
    let calculatedHeight;
    if (typeof height === 'number') {
      calculatedHeight = height * pixelRatio;
    }
    
    return { 
      optimizedWidth: Math.round(calculatedWidth), 
      optimizedHeight: calculatedHeight ? Math.round(calculatedHeight) : undefined
    };
  }, [width, height, window.innerWidth, window.devicePixelRatio]);
  
  useEffect(() => {
    // Reset loaded state when src changes
    if (src) {
      setIsLoaded(false);
      setLoadAttempts(0);
      
      // For priority images (above the fold), don't delay loading
      const delay = priority ? 0 : 50;
      
      // Add a small delay before setting source to allow skeleton to render (except for priority images)
      const timer = setTimeout(() => {
        // Try to get an optimized version of the image if possible
        // If the source is already a data URL or from certain CDNs, use directly
        if (src.startsWith('data:') || 
            src.includes('placeholder.com') || 
            src.includes('via.placeholder.com')) {
          setImgSrc(src);
        } else {
          // Use our backend optimization endpoint with improved parameters
          let optimizationUrl = `${API_BASE_URL}/photos/optimize?url=${encodeURIComponent(src)}&width=${optimizedWidth}&quality=${quality}&format=${bestFormat}`;
          
          // Add height parameter if specified
          if (optimizedHeight) {
            optimizationUrl += `&height=${optimizedHeight}`;
          }
          
          setImgSrc(optimizationUrl);
        }
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [src, optimizedWidth, optimizedHeight, quality, bestFormat, priority]);
  
  const handleImageError = (e) => {
    console.error(`Image failed to load (attempt ${loadAttempts + 1}):`, src);
    
    // Implement a progressive fallback strategy
    if (loadAttempts === 0) {
      // First failure: try with different format (jpg is most compatible)
      const fallbackFormat = 'jpg';
      const fallbackUrl = `${API_BASE_URL}/photos/optimize?url=${encodeURIComponent(src)}&width=${optimizedWidth}&quality=${quality}&format=${fallbackFormat}`;
      setImgSrc(fallbackUrl);
      setLoadAttempts(1);
    } 
    else if (loadAttempts === 1) {
      // Second failure: try direct source
      console.log('Falling back to original image');
      setImgSrc(src);
      setLoadAttempts(2);
    } 
    else {
      // Third failure: use placeholder
      e.target.src = `https://via.placeholder.com/${width || 300}x${height || 300}?text=Image+not+found`;
      setIsLoaded(true);
      setLoadAttempts(3);
    }
  };
  
  return (
    <Box position="relative" width={width || "100%"} height={height || "auto"} overflow="hidden">
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
        transition="opacity 0.3s ease-in"
        onLoad={() => setIsLoaded(true)}
        onError={handleImageError}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        {...props}
      />
    </Box>
  );
}

export default OptimizedImage;