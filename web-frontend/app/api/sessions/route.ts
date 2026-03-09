import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAuthCookie } from '@/lib/auth/cookies'
import { getSessionsByUserId } from '@/lib/data/mock-data'
import type { APIResponse, Session } from '@/lib/types/models'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = await getAuthCookie()
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = getSession(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter required' },
        { status: 400 }
      )
    }

    // Get sessions for this user
    const sessions = getSessionsByUserId(userId)

    const response: APIResponse<Session[]> = {
      success: true,
      data: sessions
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get sessions error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
