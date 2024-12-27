import axios from 'axios'
import { API_BASE_URL } from './config'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
})

// Remove the CORS headers from the api instance since they're handled by the backend
delete api.defaults.headers['Access-Control-Allow-Origin']

// Add request interceptor to handle CORS preflight
api.interceptors.request.use(
  config => {
    // Add any custom headers needed
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

export const uploadPhoto = async (formData) => {
  const response = await api.post('/photos', formData)
  return response.data
}

export const getAllPhotos = async () => {
  const response = await api.get('/photos')
  return response.data
}

export const getTags = async () => {
  try {
    console.log('API call - Getting tags') // Debug log
    const response = await api.get('/tags')
    console.log('Retrieved tags:', response.data) // Debug log
    return response.data
  } catch (error) {
    console.error('API error:', error.response?.data) // Debug log
    throw error
  }
}

export const createTag = async (tagData) => {
  try {
    const response = await api.post('/tags', tagData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const deleteTag = async (tagName) => {
  const response = await api.delete(`/tags/${tagName}`)
  return response.data
}

export const deleteTagValue = async (tagName, value) => {
  try {
    const response = await api.delete(`/tags/${tagName}/values`, {
      data: { value }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export const addTagValue = async (tagName, value, parentInfo = null) => {
  try {
    const payload = {
      value,
      ...(parentInfo && { parent_info: parentInfo })
    }
    const response = await api.post(`/tags/${tagName}/values`, payload)
    return response.data
  } catch (error) {
    console.error('API error:', error.response?.data)
    throw error
  }
}

export const searchPhotos = async (searchCriteria) => {
  const response = await api.post('/photos/search', searchCriteria)
  return response.data
}

export const getFilteredValues = async (tagName, parentFilters = {}) => {
  try {
    const response = await api.post(`/tags/${tagName}/values/filtered`, {
      parent_filters: parentFilters
    })
    return response.data
  } catch (error) {
    console.error('API error:', error.response?.data)
    throw error
  }
} 