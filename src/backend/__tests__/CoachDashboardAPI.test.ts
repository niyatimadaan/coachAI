/**
 * Unit tests for Coach Dashboard API
 */

import CoachDashboardAPI from '../CoachDashboardAPI';
import DatabaseManager from '../../database/DatabaseManager';
import ProgressAnalytics from '../../database/ProgressAnalytics';

// Mock dependencies
jest.mock('../../database/DatabaseManager');
jest.mock('../../database/ProgressAnalytics');
jest.mock('../../database/SessionOperations');

describe('CoachDashboardAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Student Progress Summaries', () => {
    it('should calculate engagement level correctly', () => {
      // Access private method through type assertion for testing
      const api = CoachDashboardAPI as any;

      expect(api.calculateEngagementLevel(3.5)).toBe('high');
      expect(api.calculateEngagementLevel(2.0)).toBe('medium');
      expect(api.calculateEngagementLevel(0.5)).toBe('low');
    });

    it('should identify students needing intervention', () => {
      const api = CoachDashboardAPI as any;

      // Declining performance
      expect(api.needsIntervention({
        scoreImprovement: -0.8,
        sessionsPerWeek: 2,
        consistencyRating: 0.7
      })).toBe(true);

      // Low engagement
      expect(api.needsIntervention({
        scoreImprovement: 0.2,
        sessionsPerWeek: 0.5,
        consistencyRating: 0.7
      })).toBe(true);

      // Poor consistency
      expect(api.needsIntervention({
        scoreImprovement: 0.2,
        sessionsPerWeek: 2,
        consistencyRating: 0.2
      })).toBe(true);

      // No intervention needed
      expect(api.needsIntervention({
        scoreImprovement: 0.5,
        sessionsPerWeek: 3,
        consistencyRating: 0.8
      })).toBe(false);
    });
  });

  describe('Common Form Issues', () => {
    it('should convert severity to numeric correctly', () => {
      const api = CoachDashboardAPI as any;

      expect(api.severityToNumeric('minor')).toBe(1);
      expect(api.severityToNumeric('moderate')).toBe(2);
      expect(api.severityToNumeric('major')).toBe(3);
      expect(api.severityToNumeric('unknown')).toBe(1);
    });

    it('should aggregate form issues across students', async () => {
      const mockIssuesResult = {
        rows: {
          length: 3,
          item: (index: number) => {
            const issues = [
              { issue_type: 'elbow_flare', severity: 'major', user_id: 'student-1' },
              { issue_type: 'elbow_flare', severity: 'moderate', user_id: 'student-2' },
              { issue_type: 'wrist_angle', severity: 'minor', user_id: 'student-1' }
            ];
            return issues[index];
          }
        }
      };

      (DatabaseManager.executeSql as jest.Mock)
        .mockResolvedValueOnce({ rows: { length: 2, item: (i: number) => ({ id: `student-${i + 1}` }) } })
        .mockResolvedValueOnce(mockIssuesResult);

      // Test would require mocking Express request/response
      // This demonstrates the test structure
    });
  });

  describe('Intervention Alerts', () => {
    it('should generate declining performance alert', async () => {
      const api = CoachDashboardAPI as any;

      const mockMetrics = {
        scoreImprovement: -1.2,
        sessionsPerWeek: 2,
        persistentIssues: []
      };

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const alerts = await api.generateStudentAlerts('student-123', 'John Doe');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('declining_performance');
      expect(alerts[0].severity).toBe('high');
      expect(alerts[0].studentName).toBe('John Doe');
    });

    it('should generate low engagement alert', async () => {
      const api = CoachDashboardAPI as any;

      const mockMetrics = {
        scoreImprovement: 0.2,
        sessionsPerWeek: 0.3,
        persistentIssues: []
      };

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const alerts = await api.generateStudentAlerts('student-123', 'John Doe');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('low_engagement');
      expect(alerts[0].severity).toBe('high');
    });

    it('should generate persistent issues alert', async () => {
      const api = CoachDashboardAPI as any;

      const mockMetrics = {
        scoreImprovement: 0.2,
        sessionsPerWeek: 2,
        persistentIssues: ['elbow_flare', 'wrist_angle']
      };

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const alerts = await api.generateStudentAlerts('student-123', 'John Doe');

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe('persistent_issues');
      expect(alerts[0].severity).toBe('medium');
    });

    it('should generate multiple alerts when applicable', async () => {
      const api = CoachDashboardAPI as any;

      const mockMetrics = {
        scoreImprovement: -0.8,
        sessionsPerWeek: 0.5,
        persistentIssues: ['elbow_flare', 'wrist_angle']
      };

      (ProgressAnalytics.calculateMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const alerts = await api.generateStudentAlerts('student-123', 'John Doe');

      expect(alerts.length).toBeGreaterThan(1);
      expect(alerts.some(a => a.alertType === 'declining_performance')).toBe(true);
      expect(alerts.some(a => a.alertType === 'low_engagement')).toBe(true);
      expect(alerts.some(a => a.alertType === 'persistent_issues')).toBe(true);
    });
  });

  describe('API Router', () => {
    it('should return a valid Express router', () => {
      const router = CoachDashboardAPI.getRouter();
      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
    });
  });
});
