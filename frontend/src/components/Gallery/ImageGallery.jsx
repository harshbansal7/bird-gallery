import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box,
  SimpleGrid,
  VStack,
  Text,
  Badge,
  HStack,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  Button,
  useDisclosure,
  Heading,
  Flex,
  Skeleton,
  Link,
  Tooltip,
} from '@chakra-ui/react'
import { FiCalendar, FiMapPin, FiTrash2, FiEdit2, FiDownload } from 'react-icons/fi'
import { getAllPhotos, searchPhotos, deletePhoto } from '../../services/api'
import SearchBar from './SearchBar'
import { dbKeyToDisplay } from '../../utils/tagUtils'
import EditPhotoForm from '../Upload/EditPhotoForm'
import { useAuth } from '../../contexts/AuthContext'
import OptimizedImage from '../common/OptimizedImage'

const IMAGES_PER_PAGE = 24; // Increased batch size for better UX

function ImageGallery() {
  const [photos, setPhotos] = useState([]);
  const [visiblePhotos, setVisiblePhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const loadMoreRef = useRef();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { user } = useAuth();
  const deleteAlertDisclosure = useDisclosure();
  const cancelDeleteRef = useRef();

  useEffect(() => {
    loadInitialPhotos();
  }, []);

  const loadInitialPhotos = async () => {
    try {
      setLoading(true);
      const data = await getAllPhotos();
      setPhotos(data);
      const initialPhotos = data.slice(0, IMAGES_PER_PAGE);
      setVisiblePhotos(initialPhotos);
      setHasMore(data.length > IMAGES_PER_PAGE);
    } catch (error) {
      console.error('Error loading photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load photos',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMorePhotos = useCallback(() => {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    const start = (nextPage - 1) * IMAGES_PER_PAGE;
    const end = nextPage * IMAGES_PER_PAGE;
    const nextBatch = photos.slice(start, end);
    
    setVisiblePhotos(prev => [...prev, ...nextBatch]);
    setPage(nextPage);
    setHasMore(end < photos.length);
    setLoadingMore(false);
  }, [photos, page, hasMore, loadingMore]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadMorePhotos, hasMore, loadingMore]);

  const handleSearch = async (criteria) => {
    try {
      setLoading(true);
      setSearchCriteria(criteria);
      const data = await searchPhotos(criteria);
      setPhotos(data);
      
      // Reset pagination
      setPage(1);
      const initialPhotos = data.slice(0, IMAGES_PER_PAGE);
      setVisiblePhotos(initialPhotos);
      setHasMore(data.length > IMAGES_PER_PAGE);
    } catch (error) {
      console.error('Error searching photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to search photos',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    onOpen();
  };

  const handleDeletePhoto = async (photo) => {
    try {
      await deletePhoto(photo._id);
      toast({
        title: 'Success',
        description: 'Photo deleted successfully',
        status: 'success',
        duration: 3000,
      });
      // Refresh photos
      if (searchCriteria) {
        handleSearch(searchCriteria);
      } else {
        loadInitialPhotos();
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete photo',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleEditClick = (photo) => {
    setSelectedPhoto(photo);
    setIsEditing(true);
  };

  const onEditSuccess = () => {
    setIsEditing(false);
    // Refresh photos
    if (searchCriteria) {
      handleSearch(searchCriteria);
    } else {
      loadInitialPhotos();
    }
  };

  return (
    <Box>
      <Box 
        bg="white" 
        mb={8} 
        py={8} 
        px={4} 
        borderRadius="xl"
        boxShadow="sm"
      >
        <Heading 
          size="xl" 
          color="green.800" 
          mb={2}
          textAlign="center"
          fontFamily="'Playfair Display', serif"
        >
          Bird Gallery
        </Heading>
        <Text 
          color="green.600" 
          textAlign="center" 
          fontSize="lg"
          fontStyle="italic"
          mb={6}
        >
          Capturing nature's winged wonders
        </Text>
        <SearchBar onSearch={handleSearch} />
      </Box>

      <SimpleGrid 
        columns={[1, 2, 3, 4]} 
        spacing={6} 
        px={4}
        position="relative"
      >
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <Skeleton 
              key={i} 
              height="300px" 
              borderRadius="xl"
              startColor="green.50"
              endColor="green.100"
            />
          ))
        ) : visiblePhotos.length > 0 ? (
          visiblePhotos.map((photo) => (
            <Box
              key={photo._id}
              position="relative"
              cursor="pointer"
              onClick={() => handlePhotoClick(photo)}
              transition="all 0.3s"
              borderRadius="xl"
              overflow="hidden"
              boxShadow="lg"
              _hover={{
                transform: 'translateY(-4px)',
                boxShadow: 'xl',
                '& > .overlay': { opacity: 1 }
              }}
            >
              <OptimizedImage
                src={photo.storage?.url || photo.url}
                alt={photo.tags?.species || photo.filename}
                objectFit="cover"
                width="100%"
                height="300px"
                borderRadius="xl"
                priority={false}
              />
              <Box
                className="overlay"
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bg="blackAlpha.600"
                opacity={0}
                transition="opacity 0.3s"
                p={4}
                display="flex"
                flexDirection="column"
                justifyContent="flex-end"
              >
                <VStack align="stretch" spacing={2}>
                  {photo.tags?.date_clicked && (
                    <HStack spacing={2}>
                      <FiCalendar color="white" />
                      <Text color="white" fontSize="sm">
                        {new Date(photo.tags.date_clicked).toLocaleDateString()}
                      </Text>
                    </HStack>
                  )}
                  {photo.tags?.location && (
                    <HStack spacing={2}>
                      <FiMapPin color="white" />
                      <Text color="white" fontSize="sm">
                        {photo.tags.location}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Box>
            </Box>
          ))
        ) : (
          <Text 
            gridColumn="1/-1" 
            textAlign="center" 
            color="gray.500"
            fontSize="lg"
          >
            No photos found
          </Text>
        )}
      </SimpleGrid>

      {hasMore && !loading && (
        <Box ref={loadMoreRef} h="20px" mt={8} />
      )}

      {/* Photo Detail Modal */}
      <Modal 
        isOpen={isOpen && selectedPhoto} 
        onClose={onClose} 
        size="6xl"
        isCentered
      >
        <ModalOverlay />
        <ModalContent bg="transparent" boxShadow="none">
          <ModalCloseButton 
            color="white" 
            bg="blackAlpha.600"
            _hover={{ bg: 'blackAlpha.700' }}
          />
          <ModalBody p={0}>
            <Box 
              bg="white" 
              borderRadius="xl" 
              overflow="hidden"
              position="relative"
            >
              <Flex 
                position="absolute" 
                top={4} 
                right={4} 
                gap={2}
                zIndex={2}
              >
                {user?.is_admin && (
                  <>
                    <IconButton
                      icon={<FiEdit2 />}
                      size="md"
                      colorScheme="blue"
                      variant="solid"
                      bg="blackAlpha.600"
                      _hover={{ bg: 'blue.500' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        handleEditClick(selectedPhoto);
                      }}
                    />
                    <IconButton
                      icon={<FiTrash2 />}
                      size="md"
                      colorScheme="red"
                      variant="solid"
                      bg="blackAlpha.600"
                      _hover={{ bg: 'red.500' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        deleteAlertDisclosure.onOpen();
                      }}
                    />
                  </>
                )}
                {selectedPhoto && (
                  <Tooltip label="Download original">
                    <IconButton
                      as={Link}
                      href={selectedPhoto.storage?.url || selectedPhoto.url}
                      download
                      icon={<FiDownload />}
                      size="md"
                      colorScheme="green"
                      variant="solid"
                      bg="blackAlpha.600"
                      _hover={{ bg: 'green.500' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                )}
              </Flex>
              
              <OptimizedImage
                src={selectedPhoto?.storage?.url || selectedPhoto?.url}
                alt={selectedPhoto?.tags?.species || selectedPhoto?.filename}
                objectFit="contain"
                width="100%"
                height="70vh"
                priority={true}
              />

              <VStack 
                align="stretch" 
                w="100%" 
                p={6} 
                spacing={4}
                bg="green.50"
              >
                <Heading 
                  size="lg" 
                  color="green.800"
                  fontFamily="'Playfair Display', serif"
                >
                  {selectedPhoto?.tags?.species || 'Unknown Species'}
                </Heading>

                <SimpleGrid columns={[1, 2, 3]} spacing={4}>
                  {selectedPhoto?.tags && Object.entries(selectedPhoto.tags)
                    .map(([key, value]) => (
                      <HStack key={key} justify="space-between">
                        <Text color="green.700" fontWeight="medium">
                          {dbKeyToDisplay(key)}:
                        </Text>
                        <Badge colorScheme="green">
                          {key.includes('date') 
                            ? new Date(value).toLocaleDateString()
                            : value}
                        </Badge>
                      </HStack>
                    ))}
                </SimpleGrid>
              </VStack>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Form Modal */}
      <Modal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)}
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={6}>
            <EditPhotoForm
              photo={selectedPhoto}
              onSuccess={onEditSuccess}
              onCancel={() => setIsEditing(false)}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteAlertDisclosure.isOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={deleteAlertDisclosure.onClose}
      >
        <AlertDialogOverlay>
          <Box maxW="lg" mx="auto" mt={40}>
            <VStack
              bg="white"
              p={6}
              borderRadius="xl"
              spacing={4}
              align="stretch"
            >
              <Heading size="md" color="red.500">
                Delete Photo
              </Heading>
              <Text>
                Are you sure you want to delete this photo? 
                This action cannot be undone.
              </Text>
              <HStack justify="flex-end" spacing={4}>
                <Button
                  ref={cancelDeleteRef}
                  onClick={deleteAlertDisclosure.onClose}
                >
                  Cancel
                </Button>
                <Button
                  colorScheme="red"
                  onClick={() => {
                    handleDeletePhoto(selectedPhoto);
                    deleteAlertDisclosure.onClose();
                  }}
                >
                  Delete
                </Button>
              </HStack>
            </VStack>
          </Box>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

export default ImageGallery;