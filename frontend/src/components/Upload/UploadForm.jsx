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
  Heading,
  Icon,
  useColorModeValue,
  SimpleGrid,
  InputGroup,
  InputLeftElement,
  Divider,
} from '@chakra-ui/react'
import { useDropzone } from 'react-dropzone'
import { 
  FiUpload, 
  FiCalendar, 
  FiImage, 
  FiTag,
  FiInfo 
} from 'react-icons/fi'
import ImagePreview from './ImagePreview'
import { uploadPhoto, getTags, getFilteredValues } from '../../services/api'
import AutocompleteInput from '../common/AutocompleteInput'
import { displayToDbKey, dbKeyToDisplay, isDateField } from '../../utils/tagUtils'
import ExifReader from 'exifreader'

function UploadForm() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [tags, setTags] = useState({})
  const [tagDependencies, setTagDependencies] = useState({})
  
  // Initialize with date fields
  const [formData, setFormData] = useState({
    date_uploaded: new Date().toISOString().slice(0, 16)
  })

  const toast = useToast()

  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const [isUploading, setIsUploading] = useState(false)

  const extractImageMetadata = (file) => {
    return new Promise(async (resolve) => {
      try {
        const tags = await ExifReader.load(file)
        let dateTaken = null
        console.log(tags)
        if (tags['DateTimeOriginal']) {
          try {
            // Parse the date string from DateTimeOriginal which is in format "YYYY:MM:DD HH:MM"
            const dateValue = tags['DateTimeOriginal'].description.slice(0, 16)
            // Convert from "YYYY:MM:DD HH:MM" to "YYYY-MM-DDTHH:MM" format
            const [datePart, timePart] = dateValue.split(' ')
            const formattedDate = datePart.replace(/:/g, '-') // Replace : with - in date
            dateTaken = `${formattedDate}T${timePart}`
          } catch (err) {
            console.warn('Failed to parse DateTimeOriginal:', err)
          }
        }

        resolve({
          dateTaken: dateTaken || new Date().toISOString().slice(0, 16)
        })
      } catch (error) {
        console.error('Error extracting EXIF data:', error)
        resolve({
          dateTaken: new Date().toISOString().slice(0, 16)
        })
      }
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxFiles: 1,
    onDrop: async acceptedFiles => {
      const file = acceptedFiles[0]
      setFile(file)
      setPreview(URL.createObjectURL(file))

      // Extract and set date metadata
      const metadata = await extractImageMetadata(file)
      setFormData(prev => ({
        ...prev,
        date_clicked: metadata.dateTaken, // Always update with image date or current date
      }))
    }
  })

  const loadTags = async () => {
    try {
      const tagsData = await getTags()
      // Convert the array of tags into an object with proper structure
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

  useEffect(() => {
    loadTags()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true) // Start loading
    const submitData = new FormData()
    submitData.append('photo', file)
    
    Object.entries(formData).forEach(([key, value]) => {
      const dbKey = displayToDbKey(key)
      submitData.append(dbKey, value)
    })

    try {
      await uploadPhoto(submitData)
      toast({
        title: 'Photo uploaded successfully',
        status: 'success',
        duration: 3000,
      })
      // Reset form
      setFile(null)
      setPreview(null)
      setFormData({
        date_clicked: new Date().toISOString().slice(0, 16),
        date_uploaded: new Date().toISOString().slice(0, 16)
      })
    } catch (error) {
      toast({
        title: error.response?.data?.error || 'Error uploading photo',
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsUploading(false) // End loading
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

  // Function to get filtered suggestions for a tag
  const getFilteredSuggestions = async (tagName) => {
    // Find parent tags for this tag
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

  return (
    <VStack spacing={8} align="stretch">
      <Box 
        bgGradient="linear(to-r, green.50, green.100)" 
        py={8} 
        px={6} 
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
          Upload Photo
        </Heading>
        <Text 
          color="green.600" 
          textAlign="center" 
          fontSize="lg"
          fontStyle="italic"
          mb={6}
        >
          Share your bird photography with the world
        </Text>
      </Box>

      <HStack spacing={8} align="flex-start">
        <Box 
          flex="1"
          bg="white"
          p={6}
          borderRadius="xl"
          shadow="sm"
          border="1px"
          borderColor="green.100"
        >
          <VStack
            spacing={6}
            as="form"
            onSubmit={handleSubmit}
          >
            {/* Upload Section */}
            <Box w="100%">
              <Text 
                fontSize="sm" 
                fontWeight="medium" 
                color="green.800"
                mb={4}
                display="flex"
                alignItems="center"
              >
                <FiImage style={{ marginRight: '8px' }} />
                Photo Upload
              </Text>
              <Box
                {...getRootProps()}
                w="100%"
                h="200px"
                border="2px dashed"
                borderColor={isDragActive ? 'green.400' : 'green.200'}
                borderRadius="xl"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                transition="all 0.2s"
                bg={isDragActive ? 'green.50' : 'transparent'}
                _hover={{ borderColor: 'green.400', bg: 'green.50' }}
              >
                <input {...getInputProps()} />
                <Icon 
                  as={FiUpload} 
                  w={8} 
                  h={8} 
                  color={isDragActive ? 'green.500' : 'green.400'} 
                  mb={3}
                />
                <Text color="green.600" textAlign="center" fontSize="sm">
                  {isDragActive
                    ? 'Drop your photo here'
                    : 'Drag & drop your photo here, or click to browse'}
                </Text>
                <Text color="green.500" fontSize="xs" mt={2}>
                  Supported formats: JPG, JPEG, PNG
                </Text>
              </Box>
            </Box>

            <Divider borderColor="green.100" />

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
                <FiCalendar style={{ marginRight: '8px' }} />
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
                      value={formData.date_clicked}
                      onChange={(e) => setFormData({
                        ...formData,
                        date_clicked: e.target.value
                      })}
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
                      value={formData.date_uploaded}
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
                <FiTag style={{ marginRight: '8px' }} />
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
                        value={formData[tagName] ?? ''}
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

            <Button
              type="submit"
              colorScheme="green"
              size="lg"
              w="100%"
              isDisabled={!file || isUploading}
              isLoading={isUploading}
              loadingText="Uploading..."
              leftIcon={<FiUpload />}
              _hover={{ transform: 'translateY(-1px)' }}
              transition="all 0.2s"
            >
              Upload Photo
            </Button>
          </VStack>
        </Box>

        <Box flex="1">
          <ImagePreview
            preview={preview}
            formData={formData}
          />
        </Box>
      </HStack>
    </VStack>
  )
}

export default UploadForm 