import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, verifyPassword, createSession } from '@/lib/auth/session'
import { setAuthCookie } from '@/lib/auth/cookies'
import type { AuthResponse } from '@/lib/types/models'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find user
    const userRecord = findUserByEmail(email)
    if (!userRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    if (!verifyPassword(userRecord.password, password)) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create user object (without password)
    const user = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role
    }

    // Create session
    const token = createSession(user)

    // Set auth cookie
    await setAuthCookie(token)

    const response: AuthResponse = {
      success: true,
      token,
      user
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
