import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import theme from './theme'
import PageContainer from './components/Layout/PageContainer'
import ImageGallery from './components/Gallery/ImageGallery'
import UploadForm from './components/Upload/UploadForm'
import TagManager from './components/Tags/TagManager'
import Login from './components/Auth/Login'
import './styles/global.css'
import { AuthProvider } from './contexts/AuthContext'
import { AdminRoute } from './components/common/PrivateRoute'

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Router>
          <PageContainer>
            <Routes>
              <Route path="/" element={<ImageGallery />} />
              <Route path="/gallery" element={<ImageGallery />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/upload" 
                element={
                  <AdminRoute>
                    <UploadForm />
                  </AdminRoute>
                } 
              />
              <Route 
                path="/tags" 
                element={
                  <AdminRoute>
                    <TagManager />
                  </AdminRoute>
                } 
              />
            </Routes>
          </PageContainer>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  )
}

export default App
