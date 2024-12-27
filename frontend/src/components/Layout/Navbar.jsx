import { Box, Flex, Button, Heading, useColorModeValue } from '@chakra-ui/react'
import { Link as RouterLink } from 'react-router-dom'

function Navbar() {
  const bgColor = useColorModeValue('white', 'gray.800')

  return (
    <Box bg={bgColor} px={4} shadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Heading as={RouterLink} to="/" size="lg" color="brand.600">
          Bird Gallery
        </Heading>

        <Flex gap={4}>
          <Button
            as={RouterLink}
            to="/"
            variant="ghost"
            colorScheme="brand"
          >
            Gallery
          </Button>
          <Button
            as={RouterLink}
            to="/upload"
            variant="ghost"
            colorScheme="brand"
          >
            Upload
          </Button>
          <Button
            as={RouterLink}
            to="/tags"
            variant="ghost"
            colorScheme="brand"
          >
            Manage Tags
          </Button>
        </Flex>
      </Flex>
    </Box>
  )
}

export default Navbar 