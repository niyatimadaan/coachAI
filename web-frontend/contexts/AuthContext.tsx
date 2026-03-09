'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authClient } from '@/lib/api/auth'
import type { User } from '@/lib/types/models'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, role: 'coach' | 'student') => Promise<void>
  logout: () => Promise<void>
  error: string | null
}


const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const currentUser = await authClient.getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        // User not authenticated
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setIsLoading(true)
      const response = await authClient.login(email, password)
      setUser(response.user)
    } catch (err: any) {
      setError(err.message || 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string, role: 'coach' | 'student') => {
    try {
      setError(null)
      setIsLoading(true)
      const response = await authClient.signup(email, password, name, role)
      
      // Validate token response (Requirement 4.4)
      if (!response.token || !response.user) {
        const invalidTokenError = new Error('Registration completed but login failed. Please sign in.')
        setError(invalidTokenError.message)
        throw invalidTokenError
      }
      
      setUser(response.user)
    } catch (err: any) {
      // Map specific error scenarios to user-friendly messages
      let errorMessage = 'Registration failed. Please try again.'
      
      // Handle 409 Conflict - email already exists (Requirement 4.1)
      if (err.name === 'APIError' && err.status === 409) {
        errorMessage = 'Email already registered'
      }
      // Handle network errors (Requirement 4.2)
      else if (err.name === 'NetworkError' || err.name === 'TimeoutError') {
        errorMessage = 'Unable to connect. Please try again.'
      }
      // Handle 500 server errors (Requirement 4.3)
      else if (err.name === 'APIError' && err.status >= 500) {
        errorMessage = 'Registration failed. Please try again later.'
      }
      // Handle invalid token response (Requirement 4.4)
      else if (err.message === 'Registration completed but login failed. Please sign in.') {
        errorMessage = err.message
      }
      // Use error message if available
      else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      
      // Create a new error with the user-friendly message
      const userError = new Error(errorMessage)
      throw userError
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authClient.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
