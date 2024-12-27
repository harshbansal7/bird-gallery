import { useState, useEffect } from 'react'
import {
  Input,
  List,
  ListItem,
  Box,
  Text,
  Spinner,
} from '@chakra-ui/react'

function AutocompleteInput({ 
  value, 
  onChange, 
  getSuggestions, 
  placeholder, 
  name, 
  isDisabled,
  ...props 
}) {
  const [inputValue, setInputValue] = useState(value || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  const handleInputChange = async (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)

    try {
      setLoading(true)
      const suggestions = await getSuggestions()
      
      // Filter suggestions
      const filtered = suggestions.filter(suggestion => {
        const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.value
        return suggestionValue.toLowerCase().includes(newValue.toLowerCase())
      })

      setFilteredSuggestions(filtered)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Error getting suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSuggestion = (suggestion) => {
    const selectedValue = typeof suggestion === 'string' ? suggestion : suggestion.value
    setInputValue(selectedValue)
    onChange(selectedValue)
    setShowSuggestions(false)
  }

  return (
    <Box position="relative" {...props}>
      <Input
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputChange}
        onBlur={() => {
          setTimeout(() => setShowSuggestions(false), 200)
        }}
        placeholder={placeholder}
        name={name}
        isDisabled={isDisabled}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <List
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="white"
          borderRadius="md"
          boxShadow="lg"
          zIndex={10}
          maxH="200px"
          overflowY="auto"
        >
          {filteredSuggestions.map((suggestion, index) => {
            const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.value
            const parentInfo = typeof suggestion === 'object' ? suggestion.parent_info : null

            return (
              <ListItem
                key={index}
                px={4}
                py={2}
                cursor="pointer"
                _hover={{ bg: 'green.50' }}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <Text>{suggestionValue}</Text>
                {parentInfo && Object.keys(parentInfo).length > 0 && (
                  <Text fontSize="xs" color="green.500">
                    ↳ {Object.values(parentInfo)[0]}
                  </Text>
                )}
              </ListItem>
            )
          })}
        </List>
      )}
      {loading && (
        <Box position="absolute" right={3} top="50%" transform="translateY(-50%)">
          <Spinner size="sm" color="green.500" />
        </Box>
      )}
    </Box>
  )
}

export default AutocompleteInput 