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
  useColorModeValue,
  useToast,
  AlertDialog,
  AlertDialogOverlay,
  Button,
  useDisclosure,
  Heading,
  Flex,
  Skeleton,
  Spinner,
  Image,
  Link,
  Tooltip,
} from '@chakra-ui/react'
import { FiCalendar, FiMapPin, FiTrash2, FiEdit2, FiChevronDown, FiDownload } from 'react-icons/fi'
import { getAllPhotos, searchPhotos, deletePhoto } from '../../services/api'
import SearchBar from './SearchBar'
import { dbKeyToDisplay } from '../../utils/tagUtils'
import EditPhotoForm from '../Upload/EditPhotoForm'
import { useAuth } from '../../contexts/AuthContext'
import OptimizedImage from '../common/OptimizedImage'

// Number of images to load initially and per batch
const IMAGES_PER_PAGE = 12;

function ImageGallery() {
  const [photos, setPhotos] = useState([])
  const [visiblePhotos, setVisiblePhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [fullResImageLoading, setFullResImageLoading] = useState(false)
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure()
  const { isOpen: isDeleteAlertOpen, onOpen: onDeleteAlertOpen, onClose: onDeleteAlertClose } = useDisclosure()
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure()
  const [editingPhoto, setEditingPhoto] = useState(null)
  const [searchCriteria, setSearchCriteria] = useState({})
  const toast = useToast()
  const { isAdmin } = useAuth()
  const cancelRef = useRef()
  const loadMoreRef = useRef(null)

  const bgColor = useColorModeValue('white', 'gray.800')

  useEffect(() => {
    loadPhotos()
  }, [])

  const loadPhotos = async (resetPage = true) => {
    try {
      setLoading(resetPage) // Only show full loading on initial load or search
      const data = await getAllPhotos()
      setPhotos(data)
      
      // Reset pagination when loading new photos
      if (resetPage) {
        setPage(1)
        const initialPhotos = data.slice(0, IMAGES_PER_PAGE)
        setVisiblePhotos(initialPhotos)
        setHasMore(data.length > IMAGES_PER_PAGE)
      }
    } catch (error) {
      console.error('Error loading photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMorePhotos = useCallback(() => {
    if (!hasMore || loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    const start = (nextPage - 1) * IMAGES_PER_PAGE;
    const end = nextPage * IMAGES_PER_PAGE;
    const nextBatch = photos.slice(start, end);
    
    setTimeout(() => {
      setVisiblePhotos(prev => [...prev, ...nextBatch]);
      setPage(nextPage);
      setHasMore(end < photos.length);
      setLoadingMore(false);
    }, 500); // Small timeout to avoid UI freeze
  }, [photos, page, hasMore, loadingMore]);

  // Intersection Observer for infinite scroll
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
      setLoading(true)
      setSearchCriteria(criteria)
      const data = await searchPhotos(criteria)
      setPhotos(data)
      
      // Reset pagination
      setPage(1)
      const initialPhotos = data.slice(0, IMAGES_PER_PAGE)
      setVisiblePhotos(initialPhotos)
      setHasMore(data.length > IMAGES_PER_PAGE)
    } catch (error) {
      console.error('Error searching photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo)
    setFullResImageLoading(true)
    onModalOpen()
  }

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  const handleDeletePhoto = async (photo, e) => {
    if (e) e.stopPropagation()

    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return
    }

    try {
      await deletePhoto(photo._id)
      toast({
        title: 'Photo deleted successfully',
        status: 'success',
        duration: 3000,
      })
      loadPhotos()
    } catch (error) {
      toast({
        title: error.response?.data?.error || 'Error deleting photo',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleEditClick = (photo, e) => {
    if (e) e.stopPropagation() // Prevent opening the modal
    setEditingPhoto(photo)
    onEditModalOpen()
  }

  const handleEditSuccess = () => {
    loadPhotos() // Refresh the gallery
  }

  const renderPhotoActions = (photo) => {
    if (!isAdmin) return null;  // Don't show actions for non-admins
    
    return (
      <HStack spacing={2}>
        <IconButton
          icon={<FiEdit2 />}
          aria-label="Edit photo"
          variant="ghost"
          colorScheme="green"
          size="sm"
          onClick={(e) => handleEditClick(photo, e)}
        />
        <IconButton
          icon={<FiTrash2 />}
          aria-label="Delete photo"
          variant="ghost"
          colorScheme="red"
          size="sm"
          onClick={(e) => handleDeletePhoto(photo, e)}
        />
      </HStack>
    )
  }

  return (
    <VStack spacing={8} align="stretch">
      <Box 
        bgGradient="linear(to-r, green.50, green.100)" 
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
                src={photo.url}
                alt={photo.filename}
                objectFit="cover"
                width="100%"
                height="300px"
                borderRadius="xl"
              />
              <Flex
                className="overlay"
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bgGradient="linear(to-t, blackAlpha.800, blackAlpha.400)"
                opacity={0}
                transition="all 0.3s"
                flexDirection="column"
                justify="flex-end"
                p={4}
              >
                <HStack justify="space-between" w="100%" mb={2}>
                  <Text color="white" fontSize="lg" fontWeight="bold">
                    {photo.tags?.species || 'Unnamed Bird'}
                  </Text>
                  <Box
                    position="absolute"
                    top={2}
                    right={2}
                    bg="blackAlpha.600"
                    borderRadius="md"
                    p={1}
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                    transition="all 0.2s"
                  >
                    {renderPhotoActions(photo)}
                  </Box>
                </HStack>
                <HStack spacing={4}>
                  {photo.tags?.location && (
                    <HStack color="white">
                      <FiMapPin />
                      <Text fontSize="sm">{photo.tags.location}</Text>
                    </HStack>
                  )}
                  {photo.tags?.date_clicked && (
                    <HStack color="white">
                      <FiCalendar />
                      <Text fontSize="sm">
                        {new Date(photo.tags.date_clicked).toLocaleDateString()}
                      </Text>
                    </HStack>
                  )}
                </HStack>
              </Flex>
            </Box>
          ))
        ) : (
          <Box 
            gridColumn="1/-1" 
            textAlign="center" 
            py={10}
            color="gray.500"
          >
            <Text fontSize="lg">No photos found</Text>
          </Box>
        )}
      </SimpleGrid>

      {/* Load more / infinite scroll trigger */}
      {!loading && hasMore && (
        <Box ref={loadMoreRef} textAlign="center" py={8}>
          {loadingMore ? (
            <Spinner color="green.500" size="md" />
          ) : (
            <Button
              variant="ghost"
              colorScheme="green"
              rightIcon={<FiChevronDown />}
              onClick={loadMorePhotos}
              isLoading={loadingMore}
            >
              Load more photos
            </Button>
          )}
        </Box>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={onModalClose} 
        size="4xl"
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent 
          bg={useColorModeValue('white', 'gray.800')}
          borderRadius="2xl"
          overflow="hidden"
        >
          <ModalCloseButton 
            size="lg"
            color="white"
            top={4}
            right={4}
            zIndex={2}
          />
          <ModalBody p={0}>
            {selectedPhoto && (
              <VStack spacing={0}>
                <Box
                  position="relative"
                  w="100%"
                  bg="black"
                  minHeight="50vh"
                >
                  {/* Controls overlay */}
                  <Flex
                    position="absolute"
                    top={4}
                    right={16}
                    zIndex={1}
                    gap={2}
                  >
                    {/* Download button for full resolution image */}
                    <Tooltip label="Right-click to save image" placement="top">
                      <IconButton
                        as={Link}
                        href={selectedPhoto.url}
                        target="_blank"
                        icon={<FiDownload />}
                        size="md"
                        colorScheme="green"
                        variant="solid"
                        bg="blackAlpha.600"
                        _hover={{ bg: 'green.500' }}
                        aria-label="Download full resolution"
                        download={selectedPhoto.filename || "bird-image"}
                      />
                    </Tooltip>
                    
                    <IconButton
                      icon={<FiEdit2 />}
                      size="md"
                      colorScheme="blue"
                      variant="solid"
                      bg="blackAlpha.600"
                      _hover={{ bg: 'blue.500' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onModalClose()
                        handleEditClick(selectedPhoto, e)
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
                        e.stopPropagation()
                        onModalClose()
                        handleDeletePhoto(selectedPhoto, e)
                      }}
                    />
                  </Flex>

                  {/* Full resolution image */}
                  {fullResImageLoading && (
                    <Flex 
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      align="center"
                      justify="center"
                    >
                      <Spinner color="white" size="xl" />
                    </Flex>
                  )}
                  
                  {/* Using regular Image component for full resolution image */}
                  <Image
                    src={selectedPhoto.url}
                    alt={selectedPhoto.tags.bird_name || 'Bird photo'}
                    objectFit="contain"
                    w="100%"
                    maxH="70vh"
                    onLoad={() => setFullResImageLoading(false)}
                    opacity={fullResImageLoading ? 0 : 1}
                    transition="opacity 0.3s ease"
                  />
                </Box>
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
                    {selectedPhoto.tags.bird_name}
                  </Heading>
                  <SimpleGrid columns={[1, 2]} spacing={4}>
                    {Object.entries(selectedPhoto.tags).map(([key, value]) => {
                      if (!value || key === 'bird_name') return null;
                      
                      const displayKey = dbKeyToDisplay(key)
                      
                      return (
                        <HStack key={key} justify="space-between" p={3} bg="white" borderRadius="lg" shadow="sm">
                          <Text
                            fontWeight="medium"
                            color="green.700"
                          >
                            {displayKey}
                          </Text>
                          <Badge
                            colorScheme={key.includes('date') ? 'green' : 'teal'}
                            fontSize="sm"
                            px={3}
                            py={1}
                            borderRadius="full"
                          >
                            {key.includes('date') ? formatDateTime(value) : value}
                          </Badge>
                        </HStack>
                      )
                    })}
                  </SimpleGrid>
                  
                  {/* Download information text */}
                  <Text 
                    fontSize="sm" 
                    color="gray.500" 
                    textAlign="center"
                    mt={2}
                  >
                    Right-click on image and select "Save image as..." to download full resolution photo
                  </Text>
                </VStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {editingPhoto && (
        <EditPhotoForm
          photo={editingPhoto}
          isOpen={isEditModalOpen}
          onClose={() => {
            onEditModalClose()
            setEditingPhoto(null)
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {isAdmin && (
        <AlertDialog
          isOpen={isDeleteAlertOpen}
          leastDestructiveRef={cancelRef}
          onClose={onDeleteAlertClose}
        >
          {/* ... delete confirmation dialog content ... */}
        </AlertDialog>
      )}
    </VStack>
  )
}

export default ImageGallery