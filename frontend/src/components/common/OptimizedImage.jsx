import { useState } from 'react';
import { Image, Skeleton, Box } from '@chakra-ui/react';

function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  objectFit = 'cover',
  priority = false,
  ...props 
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  const handleImageError = (e) => {
    console.error(`Image failed to load (attempt ${loadAttempts + 1}):`, src);
    
    if (loadAttempts < 2) {
      setLoadAttempts(prev => prev + 1);
    } else {
      e.target.src = `https://via.placeholder.com/${width || 300}x${height || 300}?text=Image+not+found`;
      setIsLoaded(true);
    }
  };

  const getOptimizedUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return url;
    
    // For modal view (70vh height), return original URL
    if (height === '70vh') {
      return url;
    }
    
    // Extract the base URL and file path
    const [baseUrl, ...pathParts] = url.split('/upload/');
    const filePath = pathParts.join('/upload/');
    
    // Determine transformations based on usage
    const transformations = [];
    
    // Set width for gallery thumbnails
    if (height === '300px') {
      // Gallery view
      transformations.push('w_500');
    }
    
    // Add quality and format optimizations
    transformations.push('q_auto', 'f_auto');
    
    // Combine transformations
    const transformString = transformations.join('/');
    
    return `${baseUrl}/upload/${transformString}/${filePath}`;
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
        src={getOptimizedUrl(src)}
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