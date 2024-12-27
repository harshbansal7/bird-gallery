import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Button,
  Text,
  Badge,
  Wrap,
  WrapItem,
  Collapse,
  SimpleGrid,
  useDisclosure,
  Divider,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react'
import { 
  FiFilter, 
  FiSearch, 
  FiX, 
  FiChevronDown, 
  FiChevronUp,
  FiCalendar,
  FiMapPin,
  FiTag 
} from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { getTags } from '../../services/api'
import AutocompleteInput from '../common/AutocompleteInput'
import { displayToDbKey, dbKeyToDisplay } from '../../utils/tagUtils'

function SearchBar({ onSearch }) {
  const [tags, setTags] = useState({})
  const [selectedFilters, setSelectedFilters] = useState({})
  const [dateRanges, setDateRanges] = useState({
    date_clicked: { start: '', end: '' },
    date_uploaded: { start: '', end: '' }
  })
  const [activeFilters, setActiveFilters] = useState([])
  const { isOpen, onToggle } = useDisclosure()

  const loadTags = async () => {
    try {
      const tagsData = await getTags()
      const tagsObject = tagsData.reduce((acc, tag) => {
        const displayName = dbKeyToDisplay(tag.name)
        acc[displayName] = tag.values
        return acc
      }, {})
      setTags(tagsObject)
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  useEffect(() => {
    loadTags()
  }, [])

  const handleFilterChange = (tagName, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [tagName]: value ? [value] : undefined
    }))
  }

  const handleSearch = () => {
    const filters = Object.entries(selectedFilters)
      .filter(([_, values]) => values && values.length)
      .reduce((acc, [key, values]) => {
        const dbKey = displayToDbKey(key)
        acc[dbKey] = values
        return acc
      }, {})

    const searchCriteria = {
      filters,
      date_ranges: Object.entries(dateRanges).reduce((acc, [field, range]) => {
        if (range.start || range.end) {
          acc[field] = range
        }
        return acc
      }, {})
    }

    const newActiveFilters = [
      ...Object.entries(filters).map(([key, values]) => ({
        type: key,
        displayType: dbKeyToDisplay(key),
        value: values[0]
      })),
      ...Object.entries(dateRanges).flatMap(([field, range]) => {
        const filters = []
        if (range.start) {
          filters.push({
            type: `${field}_start`,
            displayType: `${dbKeyToDisplay(field)} From`,
            value: range.start
          })
        }
        if (range.end) {
          filters.push({
            type: `${field}_end`,
            displayType: `${dbKeyToDisplay(field)} To`,
            value: range.end
          })
        }
        return filters
      })
    ]
    setActiveFilters(newActiveFilters)

    onSearch(searchCriteria)
  }

  const clearFilter = (filterType) => {
    if (filterType.endsWith('_start') || filterType.endsWith('_end')) {
      const [field, rangeType] = filterType.split('_')
      setDateRanges(prev => ({
        ...prev,
        [`${field}_${rangeType === 'start' ? 'clicked' : 'uploaded'}`]: {
          ...prev[`${field}_${rangeType === 'start' ? 'clicked' : 'uploaded'}`],
          [rangeType]: ''
        }
      }))
    } else {
      setSelectedFilters(prev => {
        const newFilters = { ...prev }
        delete newFilters[filterType]
        return newFilters
      })
    }
    
    setTimeout(handleSearch, 0)
  }

  const clearAllFilters = () => {
    setSelectedFilters({})
    setDateRanges({
      date_clicked: { start: '', end: '' },
      date_uploaded: { start: '', end: '' }
    })
    setActiveFilters([])
    onSearch({})
  }

  return (
    <Box 
      bg="white" 
      p={6} 
      borderRadius="xl" 
      shadow="sm"
      border="1px"
      borderColor="green.100"
    >
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Button
            leftIcon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
            onClick={onToggle}
            variant="ghost"
            color="green.700"
            fontWeight="medium"
            _hover={{ bg: 'green.50' }}
          >
            Advanced Filters
          </Button>
          {activeFilters.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="red"
              onClick={clearAllFilters}
              _hover={{ bg: 'red.50' }}
            >
              Clear All
            </Button>
          )}
        </HStack>

        {activeFilters.length > 0 && (
          <Wrap spacing={2} py={2}>
            {activeFilters.map((filter, index) => (
              <WrapItem key={index}>
                <Badge
                  bg="green.100"
                  color="green.700"
                  display="flex"
                  alignItems="center"
                  px={3}
                  py={2}
                  borderRadius="full"
                  fontSize="sm"
                >
                  <Text>
                    {filter.displayType}: {filter.value}
                  </Text>
                  <IconButton
                    icon={<FiX />}
                    size="xs"
                    ml={2}
                    variant="ghost"
                    color="green.600"
                    _hover={{ bg: 'green.200' }}
                    onClick={() => clearFilter(filter.type)}
                  />
                </Badge>
              </WrapItem>
            ))}
          </Wrap>
        )}

        <Collapse in={isOpen}>
          <VStack 
            spacing={6} 
            align="stretch" 
            pt={4}
            divider={<Divider borderColor="green.100" />}
          >
            {/* Tag Filters */}
            <Box>
              <Text 
                fontSize="sm" 
                fontWeight="medium" 
                color="green.800"
                mb={4}
                display="flex"
                alignItems="center"
              >
                <FiTag style={{ marginRight: '8px' }} />
                Tag Filters
              </Text>
              <SimpleGrid columns={[1, 2, 3]} spacing={4}>
                {Object.entries(tags).map(([tagName, values]) => (
                  <Box key={tagName}>
                    <Text 
                      mb={2} 
                      fontSize="sm" 
                      color="gray.600"
                      fontWeight="medium"
                    >
                      {tagName}
                    </Text>
                    <AutocompleteInput
                      value={selectedFilters[tagName]?.[0] || ''}
                      onChange={(value) => handleFilterChange(tagName, value)}
                      suggestions={values}
                      placeholder={`Enter ${tagName}`}
                      name={tagName}
                      bg="green.50"
                      borderColor="green.200"
                      _hover={{ borderColor: 'green.300' }}
                      _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                    />
                  </Box>
                ))}
              </SimpleGrid>
            </Box>

            {/* Date Filters */}
            <Box>
              <Text 
                fontSize="sm" 
                fontWeight="medium" 
                color="green.800"
                mb={4}
                display="flex"
                alignItems="center"
              >
                <FiCalendar style={{ marginRight: '8px' }} />
                Date Filters
              </Text>
              <SimpleGrid columns={1} spacing={4}>
                {/* Date Clicked Range */}
                <Box>
                  <Text mb={2} fontSize="sm" color="gray.600">
                    Date & Time Clicked
                  </Text>
                  <SimpleGrid columns={2} spacing={4}>
                    <InputGroup>
                      <InputLeftElement color="green.500">
                        <FiCalendar />
                      </InputLeftElement>
                      <Input
                        type="datetime-local"
                        value={dateRanges.date_clicked.start}
                        onChange={(e) => setDateRanges(prev => ({
                          ...prev,
                          date_clicked: {
                            ...prev.date_clicked,
                            start: e.target.value
                          }
                        }))}
                        placeholder="Start"
                        bg="green.50"
                        borderColor="green.200"
                        _hover={{ borderColor: 'green.300' }}
                        _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                        pl={10}
                      />
                    </InputGroup>
                    <InputGroup>
                      <InputLeftElement color="green.500">
                        <FiCalendar />
                      </InputLeftElement>
                      <Input
                        type="datetime-local"
                        value={dateRanges.date_clicked.end}
                        onChange={(e) => setDateRanges(prev => ({
                          ...prev,
                          date_clicked: {
                            ...prev.date_clicked,
                            end: e.target.value
                          }
                        }))}
                        placeholder="End"
                        bg="green.50"
                        borderColor="green.200"
                        _hover={{ borderColor: 'green.300' }}
                        _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                        pl={10}
                      />
                    </InputGroup>
                  </SimpleGrid>
                </Box>

                {/* Date Uploaded Range */}
                <Box>
                  <Text mb={2} fontSize="sm" color="gray.600">
                    Date & Time Uploaded
                  </Text>
                  <SimpleGrid columns={2} spacing={4}>
                    <InputGroup>
                      <InputLeftElement color="green.500">
                        <FiCalendar />
                      </InputLeftElement>
                      <Input
                        type="datetime-local"
                        value={dateRanges.date_uploaded.start}
                        onChange={(e) => setDateRanges(prev => ({
                          ...prev,
                          date_uploaded: {
                            ...prev.date_uploaded,
                            start: e.target.value
                          }
                        }))}
                        placeholder="Start"
                        bg="green.50"
                        borderColor="green.200"
                        _hover={{ borderColor: 'green.300' }}
                        _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                        pl={10}
                      />
                    </InputGroup>
                    <InputGroup>
                      <InputLeftElement color="green.500">
                        <FiCalendar />
                      </InputLeftElement>
                      <Input
                        type="datetime-local"
                        value={dateRanges.date_uploaded.end}
                        onChange={(e) => setDateRanges(prev => ({
                          ...prev,
                          date_uploaded: {
                            ...prev.date_uploaded,
                            end: e.target.value
                          }
                        }))}
                        placeholder="End"
                        bg="green.50"
                        borderColor="green.200"
                        _hover={{ borderColor: 'green.300' }}
                        _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
                        pl={10}
                      />
                    </InputGroup>
                  </SimpleGrid>
                </Box>
              </SimpleGrid>
            </Box>

            <Button
              colorScheme="green"
              leftIcon={<FiSearch />}
              onClick={handleSearch}
              size="lg"
              w="full"
              _hover={{ transform: 'translateY(-1px)' }}
              transition="all 0.2s"
            >
              Apply Filters
            </Button>
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  )
}

export default SearchBar 