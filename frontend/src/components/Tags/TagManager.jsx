import { useState, useEffect } from 'react'
import {
  VStack,
  Box,
  Heading,
  Input,
  Button,
  useToast,
  SimpleGrid,
  Text,
  HStack,
  IconButton,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Tooltip,
  Flex,
  Divider,
  InputGroup,
  InputLeftElement,
  Icon,
  Select,
  Stack,
} from '@chakra-ui/react'
import { 
  FiPlus, 
  FiTrash2, 
  FiTag, 
  FiEdit2,
  FiFeather,
  FiX,
  FiHash,
  FiArrowRight,
  FiLink
} from 'react-icons/fi'
import { getTags, addTagValue, createTag, deleteTag, deleteTagValue } from '../../services/api'
import { dbKeyToDisplay, displayToDbKey } from '../../utils/tagUtils'

function TagManager() {
  const [tags, setTags] = useState([])
  const [newValues, setNewValues] = useState({})
  const [newTagName, setNewTagName] = useState('')
  const toast = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selectedParent, setSelectedParent] = useState({})

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      const tagsData = await getTags()
      setTags(tagsData)
      const initialNewValues = tagsData.reduce((acc, tag) => {
        acc[tag.name] = ''
        return acc
      }, {})
      setNewValues(initialNewValues)
    } catch (error) {
      toast({
        title: 'Error loading tags',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: 'Tag name is required',
        status: 'error',
        duration: 3000,
      })
      return
    }

    try {
      const displayName = newTagName.trim()
      const dbKey = displayToDbKey(displayName)
      
      console.log('Creating tag with name:', dbKey)
      
      await createTag({ name: dbKey })
      toast({
        title: 'Tag created successfully',
        status: 'success',
        duration: 3000,
      })
      setNewTagName('')
      onClose()
      loadTags()
    } catch (error) {
      console.error('Error creating tag:', error)
      toast({
        title: error.response?.data?.error || 'Error creating tag',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleDeleteTag = async (tagName) => {
    try {
      await deleteTag(tagName)
      toast({
        title: 'Tag deleted successfully',
        status: 'success',
        duration: 3000,
      })
      loadTags()
    } catch (error) {
      toast({
        title: 'Error deleting tag',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleAddValue = async (tagName) => {
    const value = newValues[tagName]?.trim()
    if (!value) return

    try {
      const parentInfo = selectedParent[tagName] ? {
        [selectedParent[tagName].tag]: selectedParent[tagName].value
      } : null

      await addTagValue(tagName, value, parentInfo)
      toast({
        title: 'Value added successfully',
        status: 'success',
        duration: 3000,
      })
      loadTags()
      setNewValues(prev => ({ ...prev, [tagName]: '' }))
      setSelectedParent(prev => ({ ...prev, [tagName]: null }))
    } catch (error) {
      toast({
        title: error.response?.data?.error || 'Error adding value',
        status: 'error',
        duration: 3000,
      })
    }
  }

  const handleDeleteValue = async (tagName, value) => {
    console.log('Deleting value:', { tagName, value });
    try {
      await deleteTagValue(tagName, value)
      toast({
        title: 'Value deleted successfully',
        status: 'success',
        duration: 3000,
      })
      loadTags()
    } catch (error) {
      toast({
        title: 'Error deleting value',
        status: 'error',
        duration: 3000,
      })
    }
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
          Tag Management
        </Heading>
        <Text 
          color="green.600" 
          textAlign="center" 
          fontSize="lg"
          fontStyle="italic"
          mb={6}
        >
          Organize and categorize your bird photography collection
        </Text>
        <Flex justify="center">
          <Button
            leftIcon={<FiPlus />}
            colorScheme="green"
            onClick={onOpen}
            size="lg"
            px={8}
            _hover={{ transform: 'translateY(-2px)' }}
            transition="all 0.2s"
          >
            Create New Tag
          </Button>
        </Flex>
      </Box>

      <SimpleGrid columns={[1, 2, 3]} spacing={6}>
        {tags.map((tag) => (
          <Box
            key={tag.name}
            p={6}
            bg="white"
            borderRadius="xl"
            shadow="sm"
            border="1px"
            borderColor="green.100"
            position="relative"
            transition="all 0.2s"
            _hover={{ shadow: 'md', borderColor: 'green.200' }}
          >
            <Flex justify="space-between" align="center" mb={4}>
              <HStack spacing={2}>
                <Icon as={FiTag} color="green.500" />
                <Heading 
                  size="md" 
                  color="green.800"
                  fontWeight="semibold"
                >
                  {dbKeyToDisplay(tag.name)}
                </Heading>
              </HStack>
              <Tooltip label="Delete Tag" placement="top">
                <IconButton
                  size="sm"
                  icon={<FiTrash2 />}
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleDeleteTag(tag.name)}
                  _hover={{ bg: 'red.50' }}
                />
              </Tooltip>
            </Flex>

            <Box 
              mb={4} 
              minH="100px" 
              maxH="200px" 
              overflowY="auto"
              css={{
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'var(--chakra-colors-green-50)',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'var(--chakra-colors-green-200)',
                  borderRadius: '4px',
                },
              }}
            >
              {tag.values.map((valueObj) => {
                const value = typeof valueObj === 'string' ? valueObj : valueObj.value;
                const parentInfo = typeof valueObj === 'object' ? valueObj.parent_info : null;
                
                return (
                  <Badge
                    key={value}
                    m={1}
                    bg="green.50"
                    color="green.700"
                    display="inline-flex"
                    alignItems="center"
                    px={2}
                    py={1}
                    borderRadius="full"
                    border="1px"
                    borderColor="green.200"
                  >
                    <HStack spacing={1}>
                      <Text fontSize="sm">{value}</Text>
                      {parentInfo && Object.keys(parentInfo).length > 0 && (
                        <HStack spacing={1} color="green.500">
                          <Icon as={FiArrowRight} boxSize={3} />
                          <Text fontSize="xs">
                            {Object.values(parentInfo)[0]}
                          </Text>
                        </HStack>
                      )}
                    </HStack>
                    <IconButton
                      icon={<FiX />}
                      size="xs"
                      ml={2}
                      variant="ghost"
                      color="green.600"
                      _hover={{ bg: 'green.100' }}
                      onClick={() => handleDeleteValue(tag.name, value)}
                    />
                  </Badge>
                );
              })}
            </Box>

            <Divider borderColor="green.100" mb={4} />

            <VStack spacing={4}>
              <FormControl>
                <FormLabel 
                  fontSize="sm" 
                  color="gray.600"
                  display="flex"
                  alignItems="center"
                >
                  <Icon as={FiLink} mr={2} color="green.500" />
                  Parent Value (Optional)
                </FormLabel>
                <Select
                  placeholder="Select parent tag"
                  value={selectedParent[tag.name]?.tag || ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSelectedParent(prev => ({ ...prev, [tag.name]: null }))
                      return
                    }
                    setSelectedParent(prev => ({
                      ...prev,
                      [tag.name]: { tag: e.target.value, value: '' }
                    }))
                  }}
                  size="sm"
                  bg="green.50"
                  borderColor="green.200"
                  _hover={{ borderColor: 'green.300' }}
                  _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                >
                  {tags
                    .filter(t => t.name !== tag.name)
                    .map(t => (
                      <option key={t.name} value={t.name}>
                        {dbKeyToDisplay(t.name)}
                      </option>
                    ))}
                </Select>
                
                {selectedParent[tag.name]?.tag && (
                  <Select
                    mt={2}
                    placeholder="Select value"
                    value={selectedParent[tag.name]?.value || ''}
                    onChange={(e) => {
                      setSelectedParent(prev => ({
                        ...prev,
                        [tag.name]: {
                          ...prev[tag.name],
                          value: e.target.value
                        }
                      }))
                    }}
                    size="sm"
                    bg="green.50"
                    borderColor="green.200"
                    _hover={{ borderColor: 'green.300' }}
                    _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                  >
                    {tags
                      .find(t => t.name === selectedParent[tag.name].tag)
                      ?.values.map(v => (
                        <option key={v.value} value={v.value}>
                          {v.value}
                        </option>
                      ))}
                  </Select>
                )}
              </FormControl>

              <HStack width="100%">
                <InputGroup size="sm">
                  <InputLeftElement>
                    <Icon as={FiHash} color="green.500" />
                  </InputLeftElement>
                  <Input
                    placeholder="Add new value"
                    value={newValues[tag.name]}
                    onChange={(e) => setNewValues({
                      ...newValues,
                      [tag.name]: e.target.value
                    })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddValue(tag.name)
                      }
                    }}
                    bg="green.50"
                    borderColor="green.200"
                    _hover={{ borderColor: 'green.300' }}
                    _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                    pl={8}
                  />
                </InputGroup>
                <IconButton
                  icon={<FiPlus />}
                  colorScheme="green"
                  size="sm"
                  onClick={() => handleAddValue(tag.name)}
                />
              </HStack>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>

      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        motionPreset="slideInBottom"
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
        <ModalContent borderRadius="xl" overflow="hidden">
          <Box bg="green.50" px={6} py={4}>
            <ModalHeader p={0} color="green.800">
              Create New Tag
            </ModalHeader>
          </Box>
          <ModalCloseButton top={4} right={6} />
          
          <ModalBody p={6}>
            <FormControl>
              <FormLabel 
                color="green.700"
                fontSize="sm"
                fontWeight="medium"
                display="flex"
                alignItems="center"
              >
                <Icon as={FiTag} mr={2} />
                Tag Name
              </FormLabel>
              <InputGroup>
                <InputLeftElement>
                  <Icon as={FiFeather} color="green.500" />
                </InputLeftElement>
                <Input
                  placeholder="Enter tag name"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  bg="green.50"
                  borderColor="green.200"
                  _hover={{ borderColor: 'green.300' }}
                  _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                  pl={10}
                />
              </InputGroup>
            </FormControl>
          </ModalBody>

          <ModalFooter bg="green.50" px={6} py={4}>
            <Button 
              variant="ghost" 
              mr={3} 
              onClick={onClose}
              color="green.700"
              _hover={{ bg: 'green.100' }}
            >
              Cancel
            </Button>
            <Button 
              colorScheme="green" 
              onClick={handleAddTag}
              _hover={{ transform: 'translateY(-1px)' }}
              transition="all 0.2s"
            >
              Create Tag
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default TagManager 