import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth/session'
import { getAuthCookie, deleteAuthCookie } from '@/lib/auth/cookies'

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie
    const token = await getAuthCookie()

    if (token) {
      // Delete session
      deleteSession(token)
    }

    // Delete auth cookie
    await deleteAuthCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
