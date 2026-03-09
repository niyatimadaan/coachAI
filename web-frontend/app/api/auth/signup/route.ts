import { NextRequest, NextResponse } from 'next/server'
import { createUser, findUserByEmail, createSession } from '@/lib/auth/session'
import { setAuthCookie } from '@/lib/auth/cookies'
import type { AuthResponse } from '@/lib/types/models'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Create new user
    const user = createUser(email, password, name)

    // Create session
    const token = createSession(user)

    // Set auth cookie
    await setAuthCookie(token)

    const response: AuthResponse = {
      success: true,
      token,
      user
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
