import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAuthCookie } from '@/lib/auth/cookies'

export async function GET(request: NextRequest) {
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

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
