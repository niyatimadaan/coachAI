import { apiClient } from './client'
import type { Session, SessionDetail, SessionFilters, APIResponse } from '../types/models'

export class SessionsClient {
  async getCoachSessions(coachId: string, filters?: SessionFilters): Promise<Session[]> {
    let endpoint = `/api/coach/sessions?coachId=${coachId}`
    
    if (filters) {
      if (filters.studentId) {
        endpoint += `&studentId=${filters.studentId}`
      }
      if (filters.startDate) {
        endpoint += `&startDate=${filters.startDate.toISOString()}`
      }
      if (filters.endDate) {
        endpoint += `&endDate=${filters.endDate.toISOString()}`
      }
      if (filters.minScore !== undefined) {
        endpoint += `&minScore=${filters.minScore}`
      }
      if (filters.maxScore !== undefined) {
        endpoint += `&maxScore=${filters.maxScore}`
      }
    }
    
    const response = await apiClient.get<APIResponse<Session[]>>(endpoint)
    return response.data || []
  }

  async getSessionDetails(sessionId: string): Promise<SessionDetail> {
    const response = await apiClient.get<APIResponse<SessionDetail>>(`/api/coach/session/${sessionId}`)
    if (!response.data) {
      throw new Error('Session not found')
    }
    return response.data
  }
}

export const sessionsClient = new SessionsClient()
