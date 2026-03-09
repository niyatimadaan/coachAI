import { apiClient } from './client'
import type { Student, StudentProgressSummary, APIResponse } from '../types/models'

export class StudentsClient {
  async getCoachStudents(coachId: string): Promise<Student[]> {
    const response = await apiClient.get<APIResponse<Student[]>>(`/api/coach/students/${coachId}`)
    return response.data || []
  }

  async getStudentProgressSummaries(coachId: string): Promise<StudentProgressSummary[]> {
    const response = await apiClient.get<APIResponse<StudentProgressSummary[]>>(`/api/coach/progress/${coachId}`)
    return response.data || []
  }
}

export const studentsClient = new StudentsClient()
