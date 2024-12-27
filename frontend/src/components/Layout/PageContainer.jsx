import { Box, Container } from '@chakra-ui/react'
import Header from './Header'

function PageContainer({ children }) {
  return (
    <Box 
      minH="100vh"
      bg="gray.50"
      bgImage="linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.8)), url('/nature-bg.png')"
      bgAttachment="fixed"
      bgSize="cover"
    >
      <Header />
      <Box py={8}>
        <Container maxW="container.xl">
          {children}
        </Container>
      </Box>
    </Box>
  )
}

export default PageContainer 