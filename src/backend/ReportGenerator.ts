/**
 * Progress Report Generator
 * Creates exportable reports in CSV and JSON formats for administrative purposes
 */

import DatabaseManager from '../database/DatabaseManager';
import ProgressAnalytics from '../database/ProgressAnalytics';
import { ProgressMetrics, ShootingSession } from '../types/models';
import { StudentProgressSummary } from './CoachDashboardAPI';

export interface ReportOptions {
  coachId: string;
  format: 'csv' | 'json';
  timeframe: '7d' | '30d' | '90d';
  includeDetails?: boolean;
}

export interface StudentReport {
  studentId: string;
  studentName: string;
  age: number;
  skillLevel: string;
  sessionsCompleted: number;
  averageScore: number;
  improvementTrend: number;
  sessionsPerWeek: number;
  totalPracticeTime: number;
  streakDays: number;
  consistencyRating: number;
  commonIssues: string[];
  lastActiveDate: string;
}

class ReportGenerator {
  /**
   * Generate progress report for a coach's students
   */
  async generateReport(options: ReportOptions): Promise<string> {
    const reportData = await this.collectReportData(options);

    if (options.format === 'csv') {
      return this.generateCSV(reportData, options.includeDetails || false);
    } else {
      return this.generateJSON(reportData, options.includeDetails || false);
    }
  }

  /**
   * Collect report data for all students
   */
  private async collectReportData(options: ReportOptions): Promise<StudentReport[]> {
    // Get all students for this coach
    const studentsResult = await DatabaseManager.executeSql(
      'SELECT id, name, age, skill_level FROM students WHERE coach_id = ? ORDER BY name',
      [options.coachId]
    );

    const reports: StudentReport[] = [];

    for (let i = 0; i < studentsResult.rows.length; i++) {
      const student = studentsResult.rows.item(i);
      const report = await this.generateStudentReport(
        student.id,
        student.name,
        student.age,
        student.skill_level,
        options.timeframe
      );
      reports.push(report);
    }

    return reports;
  }

  /**
   * Generate report for a single student
   */
  private async generateStudentReport(
    studentId: string,
    studentName: string,
    age: number,
    skillLevel: string,
    timeframe: '7d' | '30d' | '90d'
  ): Promise<StudentReport> {
    // Get metrics for the timeframe
    const metrics = await ProgressAnalytics.calculateMetrics(studentId, timeframe);

    // Get user progress
    const progressResult = await DatabaseManager.executeSql(
      'SELECT * FROM user_progress WHERE user_id = ?',
      [studentId]
    );

    const progress = progressResult.rows.length > 0 ? progressResult.rows.item(0) : null;

    // Get common issues
    const commonIssues = await this.getStudentCommonIssues(studentId, timeframe);

    return {
      studentId,
      studentName,
      age,
      skillLevel,
      sessionsCompleted: progress?.sessions_completed || 0,
      averageScore: metrics.averageScore,
      improvementTrend: metrics.scoreImprovement,
      sessionsPerWeek: metrics.sessionsPerWeek,
      totalPracticeTime: metrics.totalPracticeTime,
      streakDays: metrics.streakDays,
      consistencyRating: metrics.consistencyRating,
      commonIssues,
      lastActiveDate: progress ? new Date(progress.last_active_date).toISOString() : new Date().toISOString()
    };
  }

  /**
   * Get common issues for a student
   */
  private async getStudentCommonIssues(
    studentId: string,
    timeframe: '7d' | '30d' | '90d'
  ): Promise<string[]> {
    const days = this.timeframeToDays(timeframe);
    const startDate = Date.now() - days * 24 * 60 * 60 * 1000;

    const issuesResult = await DatabaseManager.executeSql(
      `SELECT fi.issue_type, COUNT(*) as count
       FROM form_issues fi
       JOIN shooting_sessions ss ON fi.session_id = ss.id
       WHERE ss.user_id = ? AND ss.timestamp >= ?
       GROUP BY fi.issue_type
       ORDER BY count DESC
       LIMIT 3`,
      [studentId, startDate]
    );

    const issues: string[] = [];
    for (let i = 0; i < issuesResult.rows.length; i++) {
      issues.push(issuesResult.rows.item(i).issue_type);
    }

    return issues;
  }

  /**
   * Generate CSV format report
   */
  private generateCSV(data: StudentReport[], includeDetails: boolean): string {
    const headers = [
      'Student ID',
      'Student Name',
      'Age',
      'Skill Level',
      'Sessions Completed',
      'Average Score',
      'Improvement Trend',
      'Sessions Per Week',
      'Total Practice Time (min)',
      'Streak Days',
      'Consistency Rating',
      'Common Issues',
      'Last Active Date'
    ];

    const rows = data.map(student => [
      student.studentId,
      student.studentName,
      student.age.toString(),
      student.skillLevel,
      student.sessionsCompleted.toString(),
      student.averageScore.toFixed(2),
      student.improvementTrend.toFixed(2),
      student.sessionsPerWeek.toFixed(1),
      student.totalPracticeTime.toString(),
      student.streakDays.toString(),
      student.consistencyRating.toFixed(2),
      student.commonIssues.join('; '),
      student.lastActiveDate
    ]);

    // Escape CSV values
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Generate JSON format report
   */
  private generateJSON(data: StudentReport[], includeDetails: boolean): string {
    const report = {
      generatedAt: new Date().toISOString(),
      totalStudents: data.length,
      summary: {
        averageScore: this.calculateAverage(data.map(s => s.averageScore)),
        averageSessionsPerWeek: this.calculateAverage(data.map(s => s.sessionsPerWeek)),
        totalPracticeTime: data.reduce((sum, s) => sum + s.totalPracticeTime, 0),
        studentsNeedingIntervention: data.filter(s => 
          s.improvementTrend < -0.5 || s.sessionsPerWeek < 1
        ).length
      },
      students: includeDetails ? data : data.map(s => ({
        studentId: s.studentId,
        studentName: s.studentName,
        averageScore: s.averageScore,
        sessionsPerWeek: s.sessionsPerWeek,
        improvementTrend: s.improvementTrend
      }))
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate batch reports for large datasets
   */
  async generateBatchReport(
    options: ReportOptions,
    batchSize: number = 50
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const generator = this.batchReportGenerator(options, batchSize);
    return generator;
  }

  /**
   * Async generator for batch processing
   */
  private async *batchReportGenerator(
    options: ReportOptions,
    batchSize: number
  ): AsyncGenerator<string, void, unknown> {
    // Get all student IDs
    const studentsResult = await DatabaseManager.executeSql(
      'SELECT id, name, age, skill_level FROM students WHERE coach_id = ? ORDER BY name',
      [options.coachId]
    );

    const totalStudents = studentsResult.rows.length;
    const batches = Math.ceil(totalStudents / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, totalStudents);

      const batchReports: StudentReport[] = [];

      for (let i = start; i < end; i++) {
        const student = studentsResult.rows.item(i);
        const report = await this.generateStudentReport(
          student.id,
          student.name,
          student.age,
          student.skill_level,
          options.timeframe
        );
        batchReports.push(report);
      }

      // Yield batch result
      if (options.format === 'csv') {
        yield this.generateCSV(batchReports, options.includeDetails || false);
      } else {
        yield this.generateJSON(batchReports, options.includeDetails || false);
      }
    }
  }

  /**
   * Export report to file (for server-side usage)
   */
  async exportToFile(options: ReportOptions, filePath: string): Promise<void> {
    const report = await this.generateReport(options);
    
    // In a real implementation, this would write to file system
    // For now, we'll just return the report content
    console.log(`Report would be saved to: ${filePath}`);
    console.log(`Report size: ${report.length} bytes`);
  }

  /**
   * Generate administrative summary report
   */
  async generateAdminSummary(coachId: string): Promise<{
    totalStudents: number;
    activeStudents: number;
    averageEngagement: number;
    studentsNeedingIntervention: number;
    topIssues: Array<{ issue: string; count: number }>;
    performanceTrend: 'improving' | 'stable' | 'declining';
  }> {
    // Get all students
    const studentsResult = await DatabaseManager.executeSql(
      'SELECT id FROM students WHERE coach_id = ?',
      [coachId]
    );

    const totalStudents = studentsResult.rows.length;
    let activeStudents = 0;
    let totalEngagement = 0;
    let studentsNeedingIntervention = 0;
    let totalImprovement = 0;

    const issueMap = new Map<string, number>();

    for (let i = 0; i < studentsResult.rows.length; i++) {
      const studentId = studentsResult.rows.item(i).id;
      const metrics = await ProgressAnalytics.calculateMetrics(studentId, '30d');

      // Count active students (at least 1 session in last 30 days)
      if (metrics.sessionsPerWeek > 0) {
        activeStudents++;
      }

      totalEngagement += metrics.sessionsPerWeek;
      totalImprovement += metrics.scoreImprovement;

      // Check if needs intervention
      if (metrics.scoreImprovement < -0.5 || metrics.sessionsPerWeek < 1) {
        studentsNeedingIntervention++;
      }

      // Aggregate issues
      [...metrics.persistentIssues, ...metrics.newIssues].forEach(issue => {
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
      });
    }

    // Calculate averages
    const averageEngagement = totalStudents > 0 ? totalEngagement / totalStudents : 0;
    const averageImprovement = totalStudents > 0 ? totalImprovement / totalStudents : 0;

    // Determine performance trend
    let performanceTrend: 'improving' | 'stable' | 'declining';
    if (averageImprovement > 0.3) {
      performanceTrend = 'improving';
    } else if (averageImprovement < -0.3) {
      performanceTrend = 'declining';
    } else {
      performanceTrend = 'stable';
    }

    // Get top issues
    const topIssues = Array.from(issueMap.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalStudents,
      activeStudents,
      averageEngagement,
      studentsNeedingIntervention,
      topIssues,
      performanceTrend
    };
  }

  /**
   * Helper: Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Helper: Convert timeframe to days
   */
  private timeframeToDays(timeframe: '7d' | '30d' | '90d'): number {
    const map = { '7d': 7, '30d': 30, '90d': 90 };
    return map[timeframe];
  }
}

export default new ReportGenerator();
