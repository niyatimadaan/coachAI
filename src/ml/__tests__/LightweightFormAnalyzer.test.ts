/**
 * Unit tests for Lightweight Form Analyzer
 * Tests biomechanical calculations and form issue detection
 */

import {
  calculateElbowAlignment,
  calculateWristAngle,
  calculateShoulderSquare,
  calculateFollowThroughQuality,
  calculateBodyBalance,
  calculateFormScore,
  detectFormIssuesFromPose,
  detectShootingPhases,
  validatePoseAnalysisResult,
} from '../LightweightFormAnalyzer';
import { PoseLandmark, FormScore } from '../../types/models';
import { KeypointFrame, MajorJoint } from '../PoseEstimationEngine';

describe('LightweightFormAnalyzer', () => {
  // Helper to create test landmarks
  const createLandmark = (x: number, y: number, z: number = 0, visibility: number = 1.0): PoseLandmark => ({
    x, y, z, visibility
  });

  // Helper to create test keypoint frame
  const createKeypointFrame = (keypoints: Map<MajorJoint, PoseLandmark>, timestamp: number = 0): KeypointFrame => ({
    keypoints,
    timestamp,
    confidence: 0.9,
  });

  describe('calculateElbowAlignment', () => {
    it('should return perfect score for 90-degree elbow angle', () => {
      const shoulder = createLandmark(0.5, 0.3, 0);
      const elbow = createLandmark(0.5, 0.5, 0);
      const wrist = createLandmark(0.6, 0.5, 0);
      
      const score = calculateElbowAlignment(shoulder, elbow, wrist);
      
      expect(score).toBeGreaterThanOrEqual(95);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return lower score for poor elbow alignment', () => {
      const shoulder = createLandmark(0.5, 0.3, 0);
      const elbow = createLandmark(0.5, 0.5, 0);
      const wrist = createLandmark(0.3, 0.6, 0); // Flared out and down - creates acute angle
      
      const score = calculateElbowAlignment(shoulder, elbow, wrist);
      
      expect(score).toBeLessThan(95);
    });

    it('should return score in valid range 0-100', () => {
      const shoulder = createLandmark(0.5, 0.3, 0);
      const elbow = createLandmark(0.5, 0.5, 0);
      const wrist = createLandmark(0.8, 0.5, 0); // Extreme flare
      
      const score = calculateElbowAlignment(shoulder, elbow, wrist);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateShoulderSquare', () => {
    it('should return high score for square shoulders', () => {
      const keypoints = new Map<MajorJoint, PoseLandmark>();
      keypoints.set(MajorJoint.LEFT_SHOULDER, createLandmark(0.3, 0.4, 0));
      keypoints.set(MajorJoint.RIGHT_SHOULDER, createLandmark(0.7, 0.4, 0)); // Same y = square
      
      const frame = createKeypointFrame(keypoints);
      const score = calculateShoulderSquare(frame);
      
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('should return lower score for angled shoulders', () => {
      const keypoints = new Map<MajorJoint, PoseLandmark>();
      keypoints.set(MajorJoint.LEFT_SHOULDER, createLandmark(0.3, 0.4, 0));
      keypoints.set(MajorJoint.RIGHT_SHOULDER, createLandmark(0.7, 0.5, 0)); // Different y = angled
      
      const frame = createKeypointFrame(keypoints);
      const score = calculateShoulderSquare(frame);
      
      expect(score).toBeLessThan(90);
    });

    it('should handle missing shoulder keypoints gracefully', () => {
      const keypoints = new Map<MajorJoint, PoseLandmark>();
      // No shoulder keypoints
      
      const frame = createKeypointFrame(keypoints);
      const score = calculateShoulderSquare(frame);
      
      expect(score).toBe(50); // Default score
    });
  });

  describe('calculateFollowThroughQuality', () => {
    it('should return higher score for longer follow-through', () => {
      const frames: KeypointFrame[] = [];
      
      // Create 6 frames with consistent wrist position
      for (let i = 0; i < 6; i++) {
        const keypoints = new Map<MajorJoint, PoseLandmark>();
        keypoints.set(MajorJoint.RIGHT_WRIST, createLandmark(0.5, 0.2, 0));
        frames.push(createKeypointFrame(keypoints, i * 100));
      }
      
      const score = calculateFollowThroughQuality(frames);
      
      expect(score).toBeGreaterThanOrEqual(70);
    });

    it('should return lower score for short follow-through', () => {
      const frames: KeypointFrame[] = [];
      
      // Create only 2 frames
      for (let i = 0; i < 2; i++) {
        const keypoints = new Map<MajorJoint, PoseLandmark>();
        keypoints.set(MajorJoint.RIGHT_WRIST, createLandmark(0.5, 0.2, 0));
        frames.push(createKeypointFrame(keypoints, i * 100));
      }
      
      const score = calculateFollowThroughQuality(frames);
      
      expect(score).toBeLessThan(70);
    });

    it('should return 0 for empty follow-through', () => {
      const score = calculateFollowThroughQuality([]);
      expect(score).toBe(0);
    });
  });

  describe('calculateFormScore', () => {
    it('should return A for excellent biomechanics', () => {
      const biomechanics = {
        elbowAlignment: 95,
        wristAngle: 92,
        shoulderSquare: 94,
        followThrough: 90,
        releaseHeight: 0.8,
        bodyBalance: 88,
      };
      
      const score = calculateFormScore(biomechanics);
      
      expect(score).toBe('A');
    });

    it('should return B for good biomechanics', () => {
      const biomechanics = {
        elbowAlignment: 85,
        wristAngle: 82,
        shoulderSquare: 84,
        followThrough: 80,
        releaseHeight: 0.75,
        bodyBalance: 78,
      };
      
      const score = calculateFormScore(biomechanics);
      
      expect(score).toBe('B');
    });

    it('should return F for poor biomechanics', () => {
      const biomechanics = {
        elbowAlignment: 40,
        wristAngle: 45,
        shoulderSquare: 50,
        followThrough: 35,
        releaseHeight: 0.5,
        bodyBalance: 40,
      };
      
      const score = calculateFormScore(biomechanics);
      
      expect(score).toBe('F');
    });
  });

  describe('detectFormIssuesFromPose', () => {
    it('should detect elbow flare issue', () => {
      const biomechanics = {
        elbowAlignment: 50, // Poor
        wristAngle: 85,
        shoulderSquare: 90,
        followThrough: 80,
        releaseHeight: 0.75,
        bodyBalance: 85,
      };
      
      const phases = {
        preparation: [],
        release: [],
        followThrough: [],
      };
      
      const issues = detectFormIssuesFromPose(biomechanics, phases);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.type === 'elbow_flare')).toBe(true);
    });

    it('should detect follow-through issue', () => {
      const biomechanics = {
        elbowAlignment: 85,
        wristAngle: 85,
        shoulderSquare: 90,
        followThrough: 45, // Poor
        releaseHeight: 0.75,
        bodyBalance: 85,
      };
      
      const phases = {
        preparation: [],
        release: [],
        followThrough: [],
      };
      
      const issues = detectFormIssuesFromPose(biomechanics, phases);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.type === 'follow_through')).toBe(true);
    });

    it('should limit issues to top 3', () => {
      const biomechanics = {
        elbowAlignment: 40, // Poor
        wristAngle: 45, // Poor
        shoulderSquare: 50, // Poor
        followThrough: 35, // Poor
        releaseHeight: 0.5,
        bodyBalance: 40,
      };
      
      const phases = {
        preparation: [],
        release: [],
        followThrough: [],
      };
      
      const issues = detectFormIssuesFromPose(biomechanics, phases);
      
      expect(issues.length).toBeLessThanOrEqual(3);
    });

    it('should sort issues by severity', () => {
      const biomechanics = {
        elbowAlignment: 50, // Major issue
        wristAngle: 70, // Minor issue
        shoulderSquare: 65, // Moderate issue
        followThrough: 55, // Major issue
        releaseHeight: 0.75,
        bodyBalance: 85,
      };
      
      const phases = {
        preparation: [],
        release: [],
        followThrough: [],
      };
      
      const issues = detectFormIssuesFromPose(biomechanics, phases);
      
      if (issues.length > 1) {
        // First issue should be major or equal severity to second
        const severityOrder = { major: 0, moderate: 1, minor: 2 };
        expect(severityOrder[issues[0].severity]).toBeLessThanOrEqual(
          severityOrder[issues[1].severity]
        );
      }
    });
  });

  describe('detectShootingPhases', () => {
    it('should detect three phases from keypoint sequence', () => {
      const frames: KeypointFrame[] = [];
      
      // Create frames with wrist moving up then down
      for (let i = 0; i < 10; i++) {
        const keypoints = new Map<MajorJoint, PoseLandmark>();
        const y = i < 5 ? 0.8 - (i * 0.1) : 0.3 + ((i - 5) * 0.05); // Up then down
        keypoints.set(MajorJoint.RIGHT_WRIST, createLandmark(0.5, y, 0));
        frames.push(createKeypointFrame(keypoints, i * 100));
      }
      
      const phases = detectShootingPhases(frames);
      
      expect(phases.preparation.length).toBeGreaterThan(0);
      expect(phases.release.length).toBeGreaterThan(0);
      expect(phases.followThrough.length).toBeGreaterThan(0);
    });

    it('should throw error for empty keypoint sequence', () => {
      expect(() => detectShootingPhases([])).toThrow();
    });
  });

  describe('validatePoseAnalysisResult', () => {
    it('should validate correct analysis result', () => {
      const result = {
        overallScore: 'B' as FormScore,
        detectedIssues: [
          {
            type: 'elbow_flare' as const,
            severity: 'moderate' as const,
            description: 'Test issue',
            recommendedDrills: ['Test drill'],
          },
        ],
        biomechanicalMetrics: {
          elbowAlignment: 75,
          wristAngle: 80,
          shoulderSquare: 85,
          followThrough: 70,
        },
      };
      
      const validation = validatePoseAnalysisResult(result);
      
      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it('should detect missing overall score', () => {
      const result = {
        overallScore: '' as any,
        detectedIssues: [],
        biomechanicalMetrics: {
          elbowAlignment: 75,
          wristAngle: 80,
          shoulderSquare: 85,
          followThrough: 70,
        },
      };
      
      const validation = validatePoseAnalysisResult(result);
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('score'))).toBe(true);
    });

    it('should detect out-of-range metrics', () => {
      const result = {
        overallScore: 'B' as FormScore,
        detectedIssues: [
          {
            type: 'elbow_flare' as const,
            severity: 'moderate' as const,
            description: 'Test',
            recommendedDrills: [],
          },
        ],
        biomechanicalMetrics: {
          elbowAlignment: 150, // Out of range
          wristAngle: 80,
          shoulderSquare: 85,
          followThrough: 70,
        },
      };
      
      const validation = validatePoseAnalysisResult(result);
      
      expect(validation.valid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('range'))).toBe(true);
    });
  });
});
