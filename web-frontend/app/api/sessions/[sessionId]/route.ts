import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAuthCookie } from '@/lib/auth/cookies'
import { getSessionById } from '@/lib/data/mock-data'
import type { APIResponse, SessionDetail } from '@/lib/types/models'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
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

    const { sessionId } = await params

    // Get session details
    const session = getSessionById(sessionId)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    const response: APIResponse<SessionDetail> = {
      success: true,
      data: session
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get session details error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
