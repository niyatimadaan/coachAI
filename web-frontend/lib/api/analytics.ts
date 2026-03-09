import { apiClient } from './client'
import type { AnalyticsData, CommonFormIssue, APIResponse } from '../types/models'

export class AnalyticsClient {
  async getCoachProgress(coachId: string): Promise<AnalyticsData> {
    const response = await apiClient.get<APIResponse<AnalyticsData>>(`/api/coach/progress/${coachId}`)
    return response.data || { totalSessions: 0, averageImprovement: 0, commonIssues: [] }
  }

  async getCommonIssues(coachId: string): Promise<CommonFormIssue[]> {
    const response = await apiClient.get<APIResponse<CommonFormIssue[]>>(`/api/coach/issues/${coachId}`)
    return response.data || []
  }
}

export const analyticsClient = new AnalyticsClient()
