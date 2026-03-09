import { apiClient } from './client'
import type { User, AuthResponse } from '../types/models'

export class AuthClient {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/login', { email, password })
  }

  async signup(email: string, password: string, name: string, role: 'coach' | 'student' = 'coach'): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/signup', { email, password, name, role })
  }

  async logout(): Promise<void> {
    return apiClient.post<void>('/api/auth/logout')
  }

  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/api/auth/me')
  }

  async refreshToken(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/api/auth/refresh')
  }
}

export const authClient = new AuthClient()
