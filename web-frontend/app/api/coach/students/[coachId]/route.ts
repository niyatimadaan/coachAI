import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAuthCookie } from '@/lib/auth/cookies'
import { getStudentsByCoachId } from '@/lib/data/mock-data'
import type { APIResponse, Student } from '@/lib/types/models'

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

    // Get students for this coach
    const students = getStudentsByCoachId(coachId)

    const response: APIResponse<Student[]> = {
      success: true,
      data: students
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get students error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
