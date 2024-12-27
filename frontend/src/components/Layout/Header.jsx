import {
  Box,
  Flex,
  HStack,
  Stack,
  Link,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  useColorModeValue,
  Container,
  Text,
  Icon,
} from '@chakra-ui/react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { FiCamera, FiTag, FiMenu, FiFeather } from 'react-icons/fi'

function Header() {
  const { isOpen, onToggle } = useDisclosure()
  const location = useLocation()

  const NavLink = ({ to, icon, children }) => {
    const isActive = location.pathname === to
    return (
      <Link
        as={RouterLink}
        to={to}
        px={4}
        py={2}
        rounded="md"
        display="flex"
        alignItems="center"
        color={isActive ? 'green.600' : 'gray.600'}
        bg={isActive ? 'green.50' : 'transparent'}
        _hover={{
          textDecoration: 'none',
          bg: 'green.50',
          color: 'green.600',
        }}
        transition="all 0.2s"
      >
        <Icon as={icon} mr={2} />
        <Text fontWeight="medium">{children}</Text>
      </Link>
    )
  }

  return (
    <Box
      bg={useColorModeValue('white', 'gray.800')}
      borderBottom="1px"
      borderColor={useColorModeValue('gray.100', 'gray.700')}
      position="sticky"
      top={0}
      zIndex={10}
      backdropFilter="blur(10px)"
      backgroundColor="rgba(255, 255, 255, 0.8)"
    >
      <Container maxW="container.xl">
        <Flex
          h={16}
          alignItems="center"
          justifyContent="space-between"
        >
          <HStack spacing={8} alignItems="center">
            <Link
              as={RouterLink}
              to="/"
              _hover={{ textDecoration: 'none' }}
            >
              <HStack spacing={2}>
                <Icon 
                  as={FiFeather} 
                  w={6} 
                  h={6} 
                  color="green.500" 
                />
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  bgGradient="linear(to-r, green.500, teal.500)"
                  bgClip="text"
                  fontFamily="'Playfair Display', serif"
                >
                  BirdLens
                </Text>
              </HStack>
            </Link>

            <HStack
              as="nav"
              spacing={4}
              display={{ base: 'none', md: 'flex' }}
            >
              <NavLink to="/gallery" icon={FiCamera}>
                Gallery
              </NavLink>
              <NavLink to="/upload" icon={FiCamera}>
                Upload
              </NavLink>
              <NavLink to="/tags" icon={FiTag}>
                Manage Tags
              </NavLink>
            </HStack>
          </HStack>

          <IconButton
            display={{ base: 'flex', md: 'none' }}
            onClick={onToggle}
            icon={<FiMenu />}
            variant="ghost"
            aria-label="Toggle Navigation"
          />
        </Flex>

        {/* Mobile menu */}
        <Box
          display={{ base: isOpen ? 'block' : 'none', md: 'none' }}
          pb={4}
        >
          <Stack as="nav" spacing={4}>
            <NavLink to="/gallery" icon={FiCamera}>
              Gallery
            </NavLink>
            <NavLink to="/upload" icon={FiCamera}>
              Upload
            </NavLink>
            <NavLink to="/tags" icon={FiTag}>
              Manage Tags
            </NavLink>
          </Stack>
        </Box>
      </Container>
    </Box>
  )
}

export default Header 