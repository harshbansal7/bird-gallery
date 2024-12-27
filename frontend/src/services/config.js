// Get the API base URL from environment variable or use a default
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Configure axios defaults
import axios from 'axios'

axios.defaults.withCredentials = true 