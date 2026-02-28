/**
 * Unit tests for Feedback Generator
 */

import {
  generateFeedback,
  generateOverallMessage,
  createRecommendations,
  generateExplanation,
  generateWhyItMatters,
  generateEncouragement,
  generateNextSteps,
  generateDrillSuggestions,
  formatFeedbackForDisplay,
} from '../FeedbackGenerator';
import {
  FormAnalysisResult,
  FormIssue,
  AnalysisTier,
} from '../../types/models';

describe('FeedbackGenerator', () => {
  describe('generateOverallMessage', () => {
    it('should generate basic message for A grade', () => {
      const message = generateOverallMessage('A', 'basic');
      expect(message).toContain('Excellent');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should generate advanced message for A grade', () => {
      const message = generateOverallMessage('A', 'lightweight_ml');
      expect(message).toContain('Outstanding');
      expect(message).toContain('biomechanics');
    });

    it('should generate appropriate messages for all grades', () => {
      const grades: Array<'A' | 'B' | 'C' | 'D' | 'F'> = ['A', 'B', 'C', 'D', 'F'];
      
      grades.forEach(grade => {
        const basicMsg = generateOverallMessage(grade, 'basic');
        const advancedMsg = generateOverallMessage(grade, 'full_ml');
        
        expect(basicMsg.length).toBeGreaterThan(0);
        expect(advancedMsg.length).toBeGreaterThan(0);
        expect(advancedMsg.length).toBeGreaterThanOrEqual(basicMsg.length);
      });
    });
  });

  describe('createRecommendations', () => {
    const sampleIssues: FormIssue[] = [
      {
        type: 'elbow_flare',
        severity: 'major',
        description: 'Elbow is flaring out',
        recommendedDrills: ['Wall drill', 'One-hand shooting'],
      },
      {
        type: 'wrist_angle',
        severity: 'moderate',
        description: 'Wrist angle needs work',
        recommendedDrills: ['Wrist flick drill'],
      },
      {
        type: 'stance',
        severity: 'minor',
        description: 'Stance could be better',
        recommendedDrills: ['Stance drill'],
      },
    ];

    it('should limit recommendations to 2 for basic tier', () => {
      const recommendations = createRecommendations(sampleIssues, 2, 'basic');
      expect(recommendations.length).toBe(2);
    });

    it('should allow up to 3 recommendations for advanced tier', () => {
      const recommendations = createRecommendations(sampleIssues, 3, 'lightweight_ml');
      expect(recommendations.length).toBe(3);
    });

    it('should prioritize by severity', () => {
      const recommendations = createRecommendations(sampleIssues, 3, 'basic');
      expect(recommendations[0].issue.severity).toBe('major');
      expect(recommendations[0].priority).toBe(1);
    });

    it('should include all required fields', () => {
      const recommendations = createRecommendations(sampleIssues, 2, 'basic');
      
      recommendations.forEach(rec => {
        expect(rec.priority).toBeGreaterThan(0);
        expect(rec.issue).toBeDefined();
        expect(rec.explanation).toBeDefined();
        expect(rec.drills.length).toBeGreaterThan(0);
        expect(rec.whyItMatters).toBeDefined();
      });
    });
  });

  describe('generateExplanation', () => {
    it('should return basic description for basic tier', () => {
      const issue: FormIssue = {
        type: 'elbow_flare',
        severity: 'major',
        description: 'Your elbow is flaring out',
        recommendedDrills: ['Wall drill'],
      };
      
      const explanation = generateExplanation(issue, 'basic');
      expect(explanation).toBe(issue.description);
    });

    it('should return detailed explanation for advanced tier', () => {
      const issue: FormIssue = {
        type: 'elbow_flare',
        severity: 'major',
        description: 'Your elbow is flaring out',
        recommendedDrills: ['Wall drill'],
      };
      
      const explanation = generateExplanation(issue, 'lightweight_ml');
      expect(explanation.length).toBeGreaterThan(issue.description.length);
      expect(explanation).toContain(issue.description);
    });

    it('should handle all issue types and severities', () => {
      const issueTypes: Array<FormIssue['type']> = [
        'elbow_flare',
        'wrist_angle',
        'stance',
        'follow_through',
      ];
      const severities: Array<FormIssue['severity']> = ['major', 'moderate', 'minor'];
      
      issueTypes.forEach(type => {
        severities.forEach(severity => {
          const issue: FormIssue = {
            type,
            severity,
            description: 'Test description',
            recommendedDrills: ['Test drill'],
          };
          
          const explanation = generateExplanation(issue, 'full_ml');
          expect(explanation.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('generateWhyItMatters', () => {
    it('should provide explanation for each issue type', () => {
      const issueTypes: Array<FormIssue['type']> = [
        'elbow_flare',
        'wrist_angle',
        'stance',
        'follow_through',
      ];
      
      issueTypes.forEach(type => {
        const explanation = generateWhyItMatters(type);
        expect(explanation.length).toBeGreaterThan(20);
        expect(explanation).not.toContain('undefined');
      });
    });
  });

  describe('generateEncouragement', () => {
    it('should provide positive message for A grade', () => {
      const message = generateEncouragement('A', 0);
      expect(message).toContain('excellent');
    });

    it('should provide supportive message for lower grades', () => {
      const message = generateEncouragement('D', 3);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toContain('excellent');
    });

    it('should adapt message based on issue count', () => {
      const fewIssues = generateEncouragement('C', 1);
      const manyIssues = generateEncouragement('C', 4);
      
      expect(fewIssues).not.toBe(manyIssues);
    });
  });

  describe('generateNextSteps', () => {
    const sampleRecommendations = [
      {
        priority: 1,
        issue: {
          type: 'elbow_flare' as const,
          severity: 'major' as const,
          description: 'Test',
          recommendedDrills: ['Wall drill', 'One-hand shooting'],
        },
        explanation: 'Test explanation',
        drills: ['Wall drill', 'One-hand shooting'],
        whyItMatters: 'Test why',
      },
      {
        priority: 2,
        issue: {
          type: 'wrist_angle' as const,
          severity: 'moderate' as const,
          description: 'Test',
          recommendedDrills: ['Wrist flick drill'],
        },
        explanation: 'Test explanation',
        drills: ['Wrist flick drill'],
        whyItMatters: 'Test why',
      },
    ];

    it('should include drill recommendations', () => {
      const steps = generateNextSteps(sampleRecommendations, 'C');
      expect(steps.some(step => step.includes('Wall drill'))).toBe(true);
    });

    it('should provide at least 2 steps', () => {
      const steps = generateNextSteps(sampleRecommendations, 'C');
      expect(steps.length).toBeGreaterThanOrEqual(2);
    });

    it('should adapt guidance based on score', () => {
      const goodSteps = generateNextSteps(sampleRecommendations, 'A');
      const poorSteps = generateNextSteps(sampleRecommendations, 'D');
      
      expect(goodSteps.join(' ')).not.toBe(poorSteps.join(' '));
    });
  });

  describe('generateDrillSuggestions', () => {
    it('should return default message for no issues', () => {
      const drills = generateDrillSuggestions([]);
      expect(drills.length).toBe(1);
      expect(drills[0]).toContain('Continue practicing');
    });

    it('should remove duplicate drills', () => {
      const issues: FormIssue[] = [
        {
          type: 'elbow_flare',
          severity: 'major',
          description: 'Test',
          recommendedDrills: ['Wall drill', 'One-hand shooting'],
        },
        {
          type: 'wrist_angle',
          severity: 'moderate',
          description: 'Test',
          recommendedDrills: ['Wall drill', 'Wrist flick'],
        },
      ];
      
      const drills = generateDrillSuggestions(issues);
      const wallDrillCount = drills.filter(d => d === 'Wall drill').length;
      expect(wallDrillCount).toBe(1);
    });

    it('should prioritize drills that address multiple issues', () => {
      const issues: FormIssue[] = [
        {
          type: 'elbow_flare',
          severity: 'major',
          description: 'Test',
          recommendedDrills: ['Wall drill', 'Specific drill A'],
        },
        {
          type: 'wrist_angle',
          severity: 'moderate',
          description: 'Test',
          recommendedDrills: ['Wall drill', 'Specific drill B'],
        },
      ];
      
      const drills = generateDrillSuggestions(issues);
      expect(drills[0]).toBe('Wall drill'); // Should be first as it addresses both issues
    });
  });

  describe('generateFeedback', () => {
    const sampleAnalysis: FormAnalysisResult = {
      overallScore: 'B',
      detectedIssues: [
        {
          type: 'elbow_flare',
          severity: 'moderate',
          description: 'Elbow alignment needs work',
          recommendedDrills: ['Wall drill', 'One-hand shooting'],
        },
        {
          type: 'wrist_angle',
          severity: 'minor',
          description: 'Wrist angle could be better',
          recommendedDrills: ['Wrist flick drill'],
        },
      ],
      biomechanicalMetrics: {
        elbowAlignment: 75,
        wristAngle: 82,
        shoulderSquare: 88,
        followThrough: 80,
      },
    };

    it('should generate complete feedback for basic tier', () => {
      const feedback = generateFeedback(sampleAnalysis, 'basic');
      
      expect(feedback.overallMessage).toBeDefined();
      expect(feedback.formScore).toBe('B');
      expect(feedback.recommendations.length).toBeLessThanOrEqual(2);
      expect(feedback.encouragement).toBeDefined();
      expect(feedback.nextSteps.length).toBeGreaterThan(0);
    });

    it('should generate complete feedback for advanced tier', () => {
      const feedback = generateFeedback(sampleAnalysis, 'lightweight_ml');
      
      expect(feedback.overallMessage).toBeDefined();
      expect(feedback.formScore).toBe('B');
      expect(feedback.recommendations.length).toBeLessThanOrEqual(3);
      expect(feedback.encouragement).toBeDefined();
      expect(feedback.nextSteps.length).toBeGreaterThan(0);
    });

    it('should handle analysis with no issues', () => {
      const perfectAnalysis: FormAnalysisResult = {
        overallScore: 'A',
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 95,
          wristAngle: 98,
          shoulderSquare: 96,
          followThrough: 94,
        },
      };
      
      const feedback = generateFeedback(perfectAnalysis, 'basic');
      expect(feedback.recommendations.length).toBe(0);
      expect(feedback.overallMessage).toContain('Excellent');
    });
  });

  describe('formatFeedbackForDisplay', () => {
    const sampleFeedback = {
      overallMessage: 'Good form with room for improvement.',
      formScore: 'B' as const,
      recommendations: [
        {
          priority: 1,
          issue: {
            type: 'elbow_flare' as const,
            severity: 'moderate' as const,
            description: 'Elbow alignment needs work',
            recommendedDrills: ['Wall drill'],
          },
          explanation: 'Your elbow is not aligned properly',
          drills: ['Wall drill', 'One-hand shooting'],
          whyItMatters: 'Proper elbow alignment is crucial',
        },
      ],
      encouragement: 'Keep practicing!',
      nextSteps: ['Practice wall drill', 'Record another session'],
    };

    it('should format feedback as readable text', () => {
      const formatted = formatFeedbackForDisplay(sampleFeedback);
      
      expect(formatted).toContain('Good form');
      expect(formatted).toContain('Form Score: B');
      expect(formatted).toContain('ELBOW FLARE');
      expect(formatted).toContain('Wall drill');
      expect(formatted).toContain('Keep practicing');
    });

    it('should include all sections', () => {
      const formatted = formatFeedbackForDisplay(sampleFeedback);
      
      expect(formatted).toContain('Form Score:');
      expect(formatted).toContain('Key Areas to Improve:');
      expect(formatted).toContain('Why it matters:');
      expect(formatted).toContain('Recommended drills:');
      expect(formatted).toContain('Next Steps:');
    });
  });
});
