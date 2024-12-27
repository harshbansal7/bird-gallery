import { useState, useEffect } from 'react'
import {
  SimpleGrid,
  Box,
  Image,
  Text,
  VStack,
  Badge,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Heading,
  Flex,
  IconButton,
  useColorModeValue,
  Skeleton,
  Container,
} from '@chakra-ui/react'
import { FiMaximize2, FiCalendar, FiMapPin } from 'react-icons/fi'
import { getAllPhotos, searchPhotos } from '../../services/api'
import { API_BASE_URL } from '../../services/config'
import SearchBar from './SearchBar'
import { dbKeyToDisplay } from '../../utils/tagUtils'

function ImageGallery() {
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const bgColor = useColorModeValue('white', 'gray.800')

  useEffect(() => {
    loadPhotos()
  }, [])

  const loadPhotos = async () => {
    try {
      setLoading(true)
      const data = await getAllPhotos()
      setPhotos(data)
    } catch (error) {
      console.error('Error loading photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (searchCriteria) => {
    try {
      setLoading(true)
      const data = await searchPhotos(searchCriteria)
      setPhotos(data)
    } catch (error) {
      console.error('Error searching photos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('Photos:', photos)
  }, [photos])

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo)
    onOpen()
  }

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

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
        ) : photos.length > 0 ? (
          photos.map((photo) => (
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
              <Image
                src={`${API_BASE_URL}/uploads/${photo._id}_${photo.filename}`}
                alt={photo.tags?.bird_name || 'Bird photo'}
                objectFit="cover"
                w="100%"
                h="300px"
                fallback={<Skeleton height="300px" />}
              />
              <Flex
                className="overlay"
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                bgGradient="linear(to-t, blackAlpha.700, blackAlpha.300)"
                opacity={0}
                transition="all 0.3s"
                flexDirection="column"
                justify="flex-end"
                p={4}
              >
                <Text 
                  color="white" 
                  fontSize="lg" 
                  fontWeight="bold"
                  mb={2}
                >
                  {photo.tags?.name_of_bird || 'Unnamed Bird'}
                </Text>
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

      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
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
                >
                  <Image
                    src={`${API_BASE_URL}/uploads/${selectedPhoto._id}_${selectedPhoto.filename}`}
                    alt={selectedPhoto.tags.bird_name}
                    objectFit="contain"
                    w="100%"
                    maxH="70vh"
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
                </VStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default ImageGallery 