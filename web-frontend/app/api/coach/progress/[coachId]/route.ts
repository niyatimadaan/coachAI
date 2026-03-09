import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAuthCookie } from '@/lib/auth/cookies'
import { getStudentProgressSummaries, getStudentsByCoachId, getSessionsByUserId } from '@/lib/data/mock-data'
import type { APIResponse, StudentProgressSummary, AnalyticsData } from '@/lib/types/models'

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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'summaries' or 'analytics'

    if (type === 'summaries') {
      // Return student progress summaries
      const summaries = getStudentProgressSummaries(coachId)
      const response: APIResponse<StudentProgressSummary[]> = {
        success: true,
        data: summaries
      }
      return NextResponse.json(response)
    } else {
      // Return analytics data
      const students = getStudentsByCoachId(coachId)
      const allSessions = students.flatMap(s => getSessionsByUserId(s.id))
      
      const totalSessions = allSessions.length
      const averageImprovement = allSessions.length > 0
        ? allSessions.reduce((sum, s) => sum + s.formScore, 0) / allSessions.length
        : 0

      const analyticsData: AnalyticsData = {
        totalSessions,
        averageImprovement: Math.round(averageImprovement),
        commonIssues: []
      }

      const response: APIResponse<AnalyticsData> = {
        success: true,
        data: analyticsData
      }
      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
