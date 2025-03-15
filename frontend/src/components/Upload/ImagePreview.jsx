import {
  Box,
  Image,
  VStack,
  Text,
  Badge,
  Center,
  HStack,
  Icon,
  Divider,
} from '@chakra-ui/react'
import { 
  FiImage, 
  FiCalendar, 
  FiMapPin, 
  FiTag,
  FiFeather 
} from 'react-icons/fi'
import { dbKeyToDisplay } from '../../utils/tagUtils'

function ImagePreview({ preview, formData }) {
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString();
  };

  if (!preview) {
    return (
      <Box
        bg="white"
        borderRadius="xl"
        border="1px"
        borderColor="green.100"
        shadow="sm"
        overflow="hidden"
        h="full"
      >
        <Center
          h="400px"
          bg="green.50"
          flexDirection="column"
          p={6}
        >
          <Icon 
            as={FiImage} 
            w={10} 
            h={10} 
            color="green.300" 
            mb={4}
          />
          <Text 
            color="green.600" 
            fontSize="sm"
            textAlign="center"
          >
            Your photo preview will appear here
          </Text>
        </Center>
      </Box>
    )
  }

  return (
    <VStack 
      spacing={4} 
      align="stretch"
      bg="white"
      borderRadius="xl"
      border="1px"
      borderColor="green.100"
      shadow="sm"
      overflow="hidden"
    >
      <Box
        position="relative"
        bg="black"
      >
        <Image
          src={preview}
          alt="Preview"
          objectFit="contain"
          w="100%"
          h="400px"
        />
      </Box>

      <VStack 
        align="stretch" 
        spacing={4} 
        p={6}
        bg="white"
      >
        <Text
          fontSize="sm"
          fontWeight="medium"
          color="green.800"
          display="flex"
          alignItems="center"
        >
          <FiFeather style={{ marginRight: '8px' }} />
          Photo Information
        </Text>

        <VStack 
          align="stretch" 
          spacing={3}
          divider={<Divider borderColor="green.100" />}
        >
          {/* Date Information */}
          <Box>
            <Text 
              fontSize="xs" 
              color="green.600" 
              mb={2}
              fontWeight="medium"
            >
              Dates
            </Text>
            {Object.entries(formData)
              .filter(([key]) => key.includes('date'))
              .map(([key, value]) => value && (
                <HStack key={key} justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <FiCalendar size={14} color="var(--chakra-colors-green-500)" />
                    <Text fontSize="sm" color="gray.600">
                      {dbKeyToDisplay(key)}:
                    </Text>
                  </HStack>
                  <Badge
                    colorScheme="green"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    {formatDateTime(value)}
                  </Badge>
                </HStack>
              ))}
          </Box>

          {/* Other Tags */}
          <Box>
            <Text 
              fontSize="xs" 
              color="green.600" 
              mb={2}
              fontWeight="medium"
            >
              Details
            </Text>
            {Object.entries(formData)
              .filter(([key]) => !key.includes('date'))
              .map(([key, value]) => value && (
                <HStack key={key} justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <FiTag size={14} color="var(--chakra-colors-green-500)" />
                    <Text fontSize="sm" color="gray.600">
                      {dbKeyToDisplay(key)}:
                    </Text>
                  </HStack>
                  <Badge
                    colorScheme="teal"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    {value}
                  </Badge>
                </HStack>
              ))}
          </Box>
        </VStack>
      </VStack>
    </VStack>
  )
}

export default ImagePreview