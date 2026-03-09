import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAuthCookie } from '@/lib/auth/cookies'
import { getCommonFormIssues } from '@/lib/data/mock-data'
import type { APIResponse, CommonFormIssue } from '@/lib/types/models'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ coachId: string }> }
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

    const { coachId } = await params

    // Get common form issues for this coach
    const issues = getCommonFormIssues(coachId)

    const response: APIResponse<CommonFormIssue[]> = {
      success: true,
      data: issues
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get common issues error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
