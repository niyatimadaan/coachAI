/**
 * Unit tests for Report Generator
 */

import ReportGenerator from '../ReportGenerator';
import DatabaseManager from '../../database/DatabaseManager';
import ProgressAnalytics from '../../database/ProgressAnalytics';

// Mock dependencies
jest.mock('../../database/DatabaseManager');
jest.mock('../../database/ProgressAnalytics');

describe('ReportGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CSV Report Generation', () => {
    it('should generate valid CSV format', async () => {
      const mockStudents = {
        rows: {
          length: 2,
          item: (index: number) => {
            const students = [
              { id: 'student-1', name: 'John Doe', age: 16, skill_level: 'intermediate' },
              { id: 'student-2', name: 'Jane Smith', age: 15, skill_level: 'beginner' }
            ];
            return students[index];
          }
        }
      };

      const mockMetrics = {
        averageScore: 3.2,
        scoreImprovement: 0.5,
        sessionsPerWeek: 2.5,
        totalPracticeTime: 1125,
        streakDays: 7,
        consistencyRating: 0.85,
        persistentIssues: [],
        newIssues: [],
        resolvedIssues: []
      };

      const mockProgress = {
        rows: {
          length: 1,
          item: () => ({
            sessions_completed: 25,
            last_active_date: Date.now()
          })
        }
      };

      const mockIssues = {
        rows: {
          length: 2,
          item: (index: number) => {
            const issues = [
              { issue_type: 'elbow_flare', count: 10 },
              { issue_type: 'wrist_angle', count: 5 }
            ];
            return issues[index];
          }
        }
      };

      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValueOnce(mockProgress)
        .mockResolvedValueOnce(mockIssues)
        .mockResolvedValueOnce(mockProgress)
        .mockResolvedValueOnce(mockIssues);

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const report = await ReportGenerator.generateReport({
        coachId: 'coach-123',
        format: 'csv',
        timeframe: '30d'
      });

      expect(report).toContain('Student ID,Student Name');
      expect(report).toContain('John Doe');
      expect(report).toContain('Jane Smith');
      expect(report).toContain('3.20'); // Average score
      expect(report).toContain('2.5'); // Sessions per week
    });

    it('should escape CSV special characters', async () => {
      const mockStudents = {
        rows: {
          length: 1,
          item: () => ({
            id: 'student-1',
            name: 'Doe, John "Jr."',
            age: 16,
            skill_level: 'intermediate'
          })
        }
      };

      const mockMetrics = {
        averageScore: 3.2,
        scoreImprovement: 0.5,
        sessionsPerWeek: 2.5,
        totalPracticeTime: 1125,
        streakDays: 7,
        consistencyRating: 0.85,
        persistentIssues: [],
        newIssues: [],
        resolvedIssues: []
      };

      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValue({ rows: { length: 0 } });

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const report = await ReportGenerator.generateReport({
        coachId: 'coach-123',
        format: 'csv',
        timeframe: '30d'
      });

      // Name with comma and quotes should be escaped
      expect(report).toContain('"Doe, John ""Jr."""');
    });
  });

  describe('JSON Report Generation', () => {
    it('should generate valid JSON format', async () => {
      const mockStudents = {
        rows: {
          length: 1,
          item: () => ({
            id: 'student-1',
            name: 'John Doe',
            age: 16,
            skill_level: 'intermediate'
          })
        }
      };

      const mockMetrics = {
        averageScore: 3.2,
        scoreImprovement: 0.5,
        sessionsPerWeek: 2.5,
        totalPracticeTime: 1125,
        streakDays: 7,
        consistencyRating: 0.85,
        persistentIssues: [],
        newIssues: [],
        resolvedIssues: []
      };

      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValue({ rows: { length: 0 } });

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const report = await ReportGenerator.generateReport({
        coachId: 'coach-123',
        format: 'json',
        timeframe: '30d'
      });

      const parsed = JSON.parse(report);

      expect(parsed).toHaveProperty('generatedAt');
      expect(parsed).toHaveProperty('totalStudents', 1);
      expect(parsed).toHaveProperty('summary');
      expect(parsed.summary).toHaveProperty('averageScore');
      expect(parsed.summary).toHaveProperty('studentsNeedingIntervention');
      expect(parsed).toHaveProperty('students');
      expect(Array.isArray(parsed.students)).toBe(true);
    });

    it('should include detailed data when requested', async () => {
      const mockStudents = {
        rows: {
          length: 1,
          item: () => ({
            id: 'student-1',
            name: 'John Doe',
            age: 16,
            skill_level: 'intermediate'
          })
        }
      };

      const mockMetrics = {
        averageScore: 3.2,
        scoreImprovement: 0.5,
        sessionsPerWeek: 2.5,
        totalPracticeTime: 1125,
        streakDays: 7,
        consistencyRating: 0.85,
        persistentIssues: [],
        newIssues: [],
        resolvedIssues: []
      };

      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValue({ rows: { length: 0 } });

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const report = await ReportGenerator.generateReport({
        coachId: 'coach-123',
        format: 'json',
        timeframe: '30d',
        includeDetails: true
      });

      const parsed = JSON.parse(report);

      expect(parsed.students[0]).toHaveProperty('studentId');
      expect(parsed.students[0]).toHaveProperty('studentName');
      expect(parsed.students[0]).toHaveProperty('age');
      expect(parsed.students[0]).toHaveProperty('skillLevel');
      expect(parsed.students[0]).toHaveProperty('sessionsCompleted');
      expect(parsed.students[0]).toHaveProperty('consistencyRating');
    });
  });

  describe('Administrative Summary', () => {
    it('should calculate summary statistics correctly', async () => {
      const mockStudents = {
        rows: {
          length: 3,
          item: (index: number) => ({ id: `student-${index + 1}` })
        }
      };

      const mockMetrics1 = {
        scoreImprovement: 0.5,
        sessionsPerWeek: 2.5,
        persistentIssues: ['elbow_flare'],
        newIssues: []
      };

      const mockMetrics2 = {
        scoreImprovement: -0.8,
        sessionsPerWeek: 0.5,
        persistentIssues: ['wrist_angle'],
        newIssues: ['stance']
      };

      const mockMetrics3 = {
        scoreImprovement: 0.2,
        sessionsPerWeek: 1.5,
        persistentIssues: ['elbow_flare'],
        newIssues: []
      };

      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(mockStudents);

      (ProgressAnalytics.calculateMetrics as jest.Mock)
        .mockResolvedValueOnce(mockMetrics1)
        .mockResolvedValueOnce(mockMetrics2)
        .mockResolvedValueOnce(mockMetrics3);

      const summary = await ReportGenerator.generateAdminSummary('coach-123');

      expect(summary.totalStudents).toBe(3);
      expect(summary.activeStudents).toBe(3);
      expect(summary.studentsNeedingIntervention).toBe(1); // student-2
      expect(summary.topIssues.length).toBeGreaterThan(0);
      expect(summary.performanceTrend).toBeDefined();
    });

    it('should determine performance trend correctly', async () => {
      const mockStudents = {
        rows: {
          length: 2,
          item: (index: number) => ({ id: `student-${index + 1}` })
        }
      };

      // Test improving trend
      (DatabaseManager.executeSql as jest.Mock).mockResolvedValue(mockStudents);
      (ProgressAnalytics.calculateMetrics as jest.Mock)
        .mockResolvedValueOnce({
          scoreImprovement: 0.5,
          sessionsPerWeek: 2,
          persistentIssues: [],
          newIssues: []
        })
        .mockResolvedValueOnce({
          scoreImprovement: 0.6,
          sessionsPerWeek: 2,
          persistentIssues: [],
          newIssues: []
        });

      const summary = await ReportGenerator.generateAdminSummary('coach-123');
      expect(summary.performanceTrend).toBe('improving');
    });
  });

  describe('Batch Report Generation', () => {
    it('should handle large datasets with batch processing', async () => {
      const mockStudents = {
        rows: {
          length: 5,
          item: (index: number) => ({
            id: `student-${index + 1}`,
            name: `Student ${index + 1}`,
            age: 16,
            skill_level: 'intermediate'
          })
        }
      };

      const mockMetrics = {
        averageScore: 3.0,
        scoreImprovement: 0.3,
        sessionsPerWeek: 2.0,
        totalPracticeTime: 1000,
        streakDays: 5,
        consistencyRating: 0.7,
        persistentIssues: [],
        newIssues: [],
        resolvedIssues: []
      };

      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce(mockStudents)
        .mockResolvedValue({ rows: { length: 0 } });

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const generator = await ReportGenerator.generateBatchReport(
        {
          coachId: 'coach-123',
          format: 'json',
          timeframe: '30d'
        },
        2 // Batch size of 2
      );

      const batches: string[] = [];
      for await (const batch of generator) {
        batches.push(batch);
      }

      // Should have 3 batches (5 students / 2 per batch = 3 batches)
      expect(batches.length).toBe(3);
    });
  });

  describe('Helper Methods', () => {
    it('should convert timeframe to days correctly', () => {
      const generator = ReportGenerator as any;

      expect(generator.timeframeToDays('7d')).toBe(7);
      expect(generator.timeframeToDays('30d')).toBe(30);
      expect(generator.timeframeToDays('90d')).toBe(90);
    });

    it('should calculate average correctly', () => {
      const generator = ReportGenerator as any;

      expect(generator.calculateAverage([1, 2, 3, 4, 5])).toBe(3);
      expect(generator.calculateAverage([10, 20, 30])).toBe(20);
      expect(generator.calculateAverage([])).toBe(0);
    });
  });
});
