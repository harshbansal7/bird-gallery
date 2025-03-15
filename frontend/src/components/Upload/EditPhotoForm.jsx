import { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  Text,
  Icon,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Image,
} from '@chakra-ui/react'
import { 
  FiCalendar, 
  FiTag,
  FiSave,
} from 'react-icons/fi'
import { getTags, updatePhoto, getFilteredValues } from '../../services/api'
import AutocompleteInput from '../common/AutocompleteInput'
import { displayToDbKey, dbKeyToDisplay } from '../../utils/tagUtils'

function EditPhotoForm({ photo, isOpen, onClose, onSuccess }) {
  const [tags, setTags] = useState({})
  const [tagDependencies, setTagDependencies] = useState({})
  const [formData, setFormData] = useState({
    date_clicked: '',
    date_uploaded: '',
  })
  const toast = useToast()

  // Helper function to get photo URL regardless of storage format
  const getPhotoUrl = (photo) => {
    // New format with storage object
    if (photo?.storage && photo.storage.url) {
      return photo.storage.url;
    }
    // Legacy format with url at root level
    return photo?.url;
  }

  // Load tags and initialize form data
  useEffect(() => {
    if (isOpen && photo) {
      loadTags()
      // Initialize form data with photo tags
      setFormData(photo.tags || {})
      
      // Initialize tag dependencies from existing photo tags
      const dependencies = {}
      Object.entries(photo.tags || {}).forEach(([key, value]) => {
        if (value) {
          dependencies[key] = value
        }
      })
      setTagDependencies(dependencies)
    }
  }, [isOpen, photo])

  const loadTags = async () => {
    try {
      const tagsData = await getTags()
      const tagsObject = tagsData.reduce((acc, tag) => {
        acc[tag.name] = {
          values: tag.values,
          displayName: dbKeyToDisplay(tag.name)
        }
        return acc
      }, {})
      setTags(tagsObject)
    } catch (error) {
      toast({
        title: 'Error loading tags',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleTagChange = async (tagName, value) => {
    setFormData(prev => ({
      ...prev,
      [tagName]: value
    }))

    // Find tags that depend on this tag
    const dependentTags = Object.entries(tags).filter(([_, tagInfo]) => 
      tagInfo.values.some(v => 
        typeof v === 'object' && 
        v.parent_info && 
        Object.keys(v.parent_info).includes(tagName)
      )
    )

    // Clear dependent tag values
    const updatedFormData = { ...formData, [tagName]: value }
    dependentTags.forEach(([depTagName]) => {
      updatedFormData[depTagName] = ''
    })
    setFormData(updatedFormData)

    // Update tag dependencies
    setTagDependencies(prev => ({
      ...prev,
      [tagName]: value
    }))
  }

  const getFilteredSuggestions = async (tagName) => {
    const parentFilters = {}
    Object.entries(tagDependencies).forEach(([parentTag, parentValue]) => {
      if (tags[tagName]?.values.some(v => 
        typeof v === 'object' && 
        v.parent_info && 
        Object.keys(v.parent_info).includes(parentTag)
      )) {
        parentFilters[parentTag] = parentValue
      }
    })

    if (Object.keys(parentFilters).length > 0) {
      try {
        const filteredValues = await getFilteredValues(tagName, parentFilters)
        return filteredValues
      } catch (error) {
        console.error('Error getting filtered values:', error)
        return []
      }
    }

    return tags[tagName]?.values || []
  }

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault()
    }
    
    try {
      await updatePhoto(photo._id, formData)
      toast({
        title: 'Photo updated successfully',
        status: 'success',
        duration: 3000,
      })
      onSuccess?.()
      onClose?.()
    } catch (error) {
      toast({
        title: error.response?.data?.error || 'Error updating photo',
        status: 'error',
        duration: 3000,
      })
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Edit Photo Details</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} as="form" onSubmit={handleSubmit}>
            {/* Preview Image */}
            <Box w="100%" h="300px" bg="black" borderRadius="md" overflow="hidden">
              <Image
                src={getPhotoUrl(photo)}
                alt={photo?.filename}
                objectFit="contain"
                w="100%"
                h="100%"
              />
            </Box>

            {/* Date Section */}
            <Box w="100%">
              <Text 
                fontSize="sm" 
                fontWeight="medium" 
                color="green.800"
                mb={4}
                display="flex"
                alignItems="center"
              >
                <Icon as={FiCalendar} mr={2} />
                Date Information
              </Text>
              <SimpleGrid columns={[1, 2]} spacing={4}>
                <FormControl>
                  <FormLabel color="gray.600" fontSize="sm">
                    Date & Time Clicked
                  </FormLabel>
                  <InputGroup>
                    <InputLeftElement color="green.500">
                      <FiCalendar />
                    </InputLeftElement>
                    <Input
                      type="datetime-local"
                      value={formData.date_clicked || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        date_clicked: e.target.value
                      }))}
                      bg="green.50"
                      borderColor="green.200"
                      _hover={{ borderColor: 'green.300' }}
                      _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                      pl={10}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl>
                  <FormLabel color="gray.600" fontSize="sm">
                    Date & Time Uploaded
                  </FormLabel>
                  <InputGroup>
                    <InputLeftElement color="green.500">
                      <FiCalendar />
                    </InputLeftElement>
                    <Input
                      type="datetime-local"
                      value={formData.date_uploaded || ''}
                      isReadOnly
                      bg="gray.50"
                      borderColor="gray.200"
                      cursor="not-allowed"
                      pl={10}
                    />
                  </InputGroup>
                </FormControl>
              </SimpleGrid>
            </Box>

            <Divider borderColor="green.100" />

            {/* Tags Section */}
            <Box w="100%">
              <Text 
                fontSize="sm" 
                fontWeight="medium" 
                color="green.800"
                mb={4}
                display="flex"
                alignItems="center"
              >
                <Icon as={FiTag} mr={2} />
                Photo Details
              </Text>
              <SimpleGrid columns={[1, 2]} spacing={4}>
                {Object.entries(tags)
                  .filter(([tagName]) => !tagName.includes('date'))
                  .map(([tagName, tagInfo]) => (
                    <FormControl key={tagName}>
                      <FormLabel
                        fontSize="sm"
                        color="gray.600"
                      >
                        {tagInfo.displayName}
                      </FormLabel>
                      <AutocompleteInput
                        value={formData[tagName] || ''}
                        onChange={(value) => handleTagChange(tagName, value)}
                        getSuggestions={() => getFilteredSuggestions(tagName)}
                        placeholder={`Enter ${tagInfo.displayName}`}
                        name={tagName}
                        isDisabled={
                          tagInfo.values.some(v => 
                            typeof v === 'object' && 
                            v.parent_info && 
                            Object.entries(v.parent_info).some(([parentTag]) => 
                              !tagDependencies[parentTag]
                            )
                          )
                        }
                        bg="green.50"
                        borderColor="green.200"
                        _hover={{ borderColor: 'green.300' }}
                        _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                      />
                    </FormControl>
                  ))}
              </SimpleGrid>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="green"
            leftIcon={<FiSave />}
            onClick={handleSubmit}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default EditPhotoForm