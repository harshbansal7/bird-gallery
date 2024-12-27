import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import theme from './theme'
import PageContainer from './components/Layout/PageContainer'
import ImageGallery from './components/Gallery/ImageGallery'
import UploadForm from './components/Upload/UploadForm'
import TagManager from './components/Tags/TagManager'
import './styles/global.css'

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <PageContainer>
          <Routes>
            <Route path="/" element={<ImageGallery />} />
            <Route path="/gallery" element={<ImageGallery />} />
            <Route path="/upload" element={<UploadForm />} />
            <Route path="/tags" element={<TagManager />} />
          </Routes>
        </PageContainer>
      </Router>
    </ChakraProvider>
  )
}

export default App
