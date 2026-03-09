import { NextRequest, NextResponse } from 'next/server'
import { getSession, createSession } from '@/lib/auth/session'
import { getAuthCookie, setAuthCookie } from '@/lib/auth/cookies'
import type { AuthResponse } from '@/lib/types/models'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = await getAuthCookie()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user from session
    const user = getSession(token)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Create new session
    const newToken = createSession(user)

    // Set new auth cookie
    await setAuthCookie(newToken)

    const response: AuthResponse = {
      success: true,
      token: newToken,
      user
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
