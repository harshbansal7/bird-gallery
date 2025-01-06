import {
  Button,
  VStack,
  Text,
  useToast,
  Icon,
  Box,
  Heading,
} from '@chakra-ui/react'
import { FiLogIn } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

function Login() {
  const { signInWithGoogle } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleLogin = async () => {
    try {
      await signInWithGoogle()
      toast({
        title: 'Logged in successfully',
        status: 'success',
        duration: 3000,
      })
      navigate('/')
    } catch (error) {
      toast({
        title: 'Failed to log in',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    }
  }

  return (
    <Box 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      minH="70vh"
    >
      <VStack spacing={8} maxW="md" w="full" p={8}>
        <Heading 
          size="xl" 
          color="green.800"
          textAlign="center"
          fontFamily="'Playfair Display', serif"
        >
          Welcome to BirdLens
        </Heading>
        <Text 
          color="gray.600" 
          textAlign="center"
          fontSize="lg"
        >
          Sign in to access admin features
        </Text>
        <Button
          leftIcon={<Icon as={FiLogIn} />}
          colorScheme="green"
          onClick={handleLogin}
          size="lg"
          w="full"
          _hover={{ transform: 'translateY(-2px)' }}
          transition="all 0.2s"
        >
          Sign in with Google
        </Button>
        <Text fontSize="sm" color="gray.600" textAlign="center">
          Only authorized users can upload and manage content
        </Text>
      </VStack>
    </Box>
  )
}

export default Login 