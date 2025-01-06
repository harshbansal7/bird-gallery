import { createContext, useContext, useState, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged,
  signOut 
} from 'firebase/auth'
import { getCurrentUser } from '../services/api'

const firebaseConfig = {
  // Your Firebase config here
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)

  const checkUserRole = async (user) => {
    if (!user) {
      setUserRole(null)
      return
    }
    
    try {
      const userData = await getCurrentUser()
      setUserRole(userData.role)
      setUser(prev => ({
        ...prev,
        role: userData.role,
        isAdmin: userData.isAdmin
      }))
    } catch (error) {
      console.error('Error checking user role:', error)
      setUserRole('viewer')
    }
  }

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      // Store the token in localStorage
      localStorage.setItem('authToken', idToken)
      return result.user
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken()
        localStorage.setItem('authToken', idToken)
        await checkUserRole(user)
      } else {
        setUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value = {
    user,
    signInWithGoogle,
    logout,
    isAdmin: user?.isAdmin || false
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
} 