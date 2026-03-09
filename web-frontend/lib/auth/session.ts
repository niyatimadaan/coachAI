// Simple session management (in-memory for now)
// TODO: Replace with proper session storage (Redis, database, etc.)

import { User } from '../types/models'

interface Session {
  token: string
  user: User
  expiresAt: number
}

// In-memory session store
const sessions = new Map<string, Session>()

// In-memory user store (mock database)
const users = new Map<string, { id: string; email: string; name: string; password: string; role: 'coach' | 'admin' }>()

export function generateToken(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export function createSession(user: User): string {
  const token = generateToken()
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  
  sessions.set(token, {
    token,
    user,
    expiresAt
  })
  
  return token
}

export function getSession(token: string): User | null {
  const session = sessions.get(token)
  
  if (!session) {
    return null
  }
  
  // Check if session expired
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }
  
  return session.user
}

export function deleteSession(token: string): void {
  sessions.delete(token)
}

export function createUser(email: string, password: string, name: string): User {
  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  users.set(email, {
    id,
    email,
    name,
    password, // In production, this should be hashed
    role: 'coach'
  })
  
  return {
    id,
    email,
    name,
    role: 'coach'
  }
}

export function findUserByEmail(email: string): { id: string; email: string; name: string; password: string; role: 'coach' | 'admin' } | null {
  return users.get(email) || null
}

export function verifyPassword(storedPassword: string, providedPassword: string): boolean {
  // In production, use proper password hashing (bcrypt, argon2, etc.)
  return storedPassword === providedPassword
}
