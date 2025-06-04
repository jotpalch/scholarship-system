'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { apiClient, User } from '../lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => Promise<void>
  error: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(async (username: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.auth.login(username, password)
      
      if (response.success && response.data) {
        apiClient.setToken(response.data.access_token)
        
        // Get user info after login
        const userResponse = await apiClient.auth.getCurrentUser()
        if (userResponse.success && userResponse.data) {
          // Map full_name to name for component compatibility
          const userData = { ...userResponse.data, name: userResponse.data.full_name }
          setUser(userData)
        }
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    apiClient.clearToken()
    setUser(null)
    setError(null)
  }, [])

  const updateUser = useCallback(async (userData: Partial<User>) => {
    try {
      setError(null)
      const response = await apiClient.users.updateProfile(userData)
      
      if (response.success && response.data) {
        // Map full_name to name for component compatibility
        const updatedUser = { ...response.data, name: response.data.full_name }
        setUser(updatedUser)
      } else {
        throw new Error(response.message || 'Update failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      throw err
    }
  }, [])

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.auth.getCurrentUser()
        if (response.success && response.data) {
          // Map full_name to name for component compatibility  
          const userData = { ...response.data, name: response.data.full_name }
          setUser(userData)
        }
      } catch (err) {
        // User not authenticated or token expired
        apiClient.clearToken()
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
    error,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
} 