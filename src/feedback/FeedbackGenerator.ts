/**
 * Feedback Generator Module
 * Generates tier-appropriate recommendations and explanations for form corrections
 * Adapts feedback based on analysis tier and detected issues
 */

import {
  FormAnalysisResult,
  FormScore,
  FormIssue,
  FormIssueType,
  AnalysisTier,
} from '../types/models';

/**
 * Feedback recommendation with explanation
 */
export interface FeedbackRecommendation {
  priority: number; // 1 = highest priority
  issue: FormIssue;
  explanation: string;
  drills: string[];
  whyItMatters: string;
}

/**
 * Complete feedback package for a session
 */
export interface SessionFeedback {
  overallMessage: string;
  formScore: FormScore;
  recommendations: FeedbackRecommendation[];
  encouragement: string;
  nextSteps: string[];
}

/**
 * Generate tier-appropriate feedback from analysis result
 * Basic tier: 1-2 recommendations
 * Advanced tier: 1-3 recommendations with detailed explanations
 */
export function generateFeedback(
  analysisResult: FormAnalysisResult,
  analysisTier: AnalysisTier
): SessionFeedback {
  const { overallScore, detectedIssues } = analysisResult;
  
  // Determine recommendation count based on tier
  const maxRecommendations = analysisTier === 'basic' ? 2 : 3;
  
  // Generate overall message
  const overallMessage = generateOverallMessage(overallScore, analysisTier);
  
  // Create prioritized recommendations
  const recommendations = createRecommendations(
    detectedIssues,
    maxRecommendations,
    analysisTier
  );
  
  // Generate encouragement
  const encouragement = generateEncouragement(overallScore, detectedIssues.length);
  
  // Generate next steps
  const nextSteps = generateNextSteps(recommendations, overallScore);
  
  return {
    overallMessage,
    formScore: overallScore,
    recommendations,
    encouragement,
    nextSteps,
  };
}

/**
 * Generate overall assessment message based on score
 */
export function generateOverallMessage(
  score: FormScore,
  tier: AnalysisTier
): string {
  const isAdvanced = tier !== 'basic';
  
  const messages: Record<FormScore, { basic: string; advanced: string }> = {
    A: {
      basic: 'Excellent form! Your shooting technique is strong.',
      advanced: 'Outstanding form! Your biomechanics show excellent alignment and consistency.',
    },
    B: {
      basic: 'Good form with room for improvement.',
      advanced: 'Solid form with good fundamentals. A few adjustments will take you to the next level.',
    },
    C: {
      basic: 'Decent form, but focus on the key issues below.',
      advanced: 'Your form shows potential but needs work in several areas. Focus on the recommendations below.',
    },
    D: {
      basic: 'Your form needs work. Practice the recommended drills.',
      advanced: 'Significant form issues detected. Consistent practice with these drills will help build better habits.',
    },
    F: {
      basic: 'Major form issues detected. Focus on fundamentals.',
      advanced: 'Your shooting form needs fundamental corrections. Start with the basics and build from there.',
    },
  };
  
  return isAdvanced ? messages[score].advanced : messages[score].basic;
}

/**
 * Create prioritized recommendations from detected issues
 */
export function createRecommendations(
  issues: FormIssue[],
  maxCount: number,
  tier: AnalysisTier
): FeedbackRecommendation[] {
  // Sort issues by severity
  const sortedIssues = [...issues].sort((a, b) => {
    const severityOrder = { major: 0, moderate: 1, minor: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  // Take top issues based on max count
  const topIssues = sortedIssues.slice(0, maxCount);
  
  // Create recommendations with explanations
  return topIssues.map((issue, index) => ({
    priority: index + 1,
    issue,
    explanation: generateExplanation(issue, tier),
    drills: issue.recommendedDrills,
    whyItMatters: generateWhyItMatters(issue.type),
  }));
}

/**
 * Generate detailed explanation for a form issue
 */
export function generateExplanation(
  issue: FormIssue,
  tier: AnalysisTier
): string {
  const isAdvanced = tier !== 'basic';
  
  // Basic explanations are simpler and more direct
  if (!isAdvanced) {
    return issue.description;
  }
  
  // Advanced explanations include more detail
  const advancedExplanations: Record<FormIssueType, Record<string, string>> = {
    elbow_flare: {
      major: `${issue.description} When your elbow flares out, it creates inconsistent release angles and reduces shooting accuracy. Proper elbow alignment ensures the ball travels in a straight line toward the basket.`,
      moderate: `${issue.description} Better elbow alignment will improve your shot consistency and make it easier to repeat your form.`,
      minor: `${issue.description} Small adjustments to elbow position can significantly improve accuracy.`,
    },
    wrist_angle: {
      major: `${issue.description} Proper wrist snap generates backspin and controls the ball's trajectory. Without correct wrist mechanics, your shots will lack consistency and touch.`,
      moderate: `${issue.description} Improving wrist mechanics will give you better control over shot arc and backspin.`,
      minor: `${issue.description} Fine-tuning wrist position will enhance your shooting touch.`,
    },
    stance: {
      major: `${issue.description} Your base provides stability and power for your shot. Poor stance leads to balance issues and inconsistent release points.`,
      moderate: `${issue.description} Better stance alignment will improve your balance and shooting consistency.`,
      minor: `${issue.description} Small stance adjustments can improve your overall shooting rhythm.`,
    },
    follow_through: {
      major: `${issue.description} Follow-through is crucial for shot consistency and accuracy. It ensures complete energy transfer and proper backspin on the ball.`,
      moderate: `${issue.description} Extending your follow-through will improve shot consistency and help develop muscle memory.`,
      minor: `${issue.description} A complete follow-through adds the finishing touch to good shooting form.`,
    },
  };
  
  return advancedExplanations[issue.type][issue.severity];
}

/**
 * Generate "why it matters" explanation for each issue type
 */
export function generateWhyItMatters(issueType: FormIssueType): string {
  const explanations: Record<FormIssueType, string> = {
    elbow_flare: 'Proper elbow alignment is the foundation of consistent shooting. It ensures the ball travels in a straight line and makes your shot repeatable.',
    wrist_angle: 'Wrist mechanics control ball rotation and arc. Good wrist form creates the backspin needed for soft shots that drop through the net.',
    stance: 'Your stance provides the stable base for your entire shot. Good balance allows you to shoot consistently from any position on the court.',
    follow_through: 'Follow-through completes the shooting motion and ensures full energy transfer. It\'s the signature of every great shooter.',
  };
  
  return explanations[issueType];
}

/**
 * Generate encouragement message based on performance
 */
export function generateEncouragement(
  score: FormScore,
  issueCount: number
): string {
  if (score === 'A') {
    return 'Keep up the excellent work! Your dedication to proper form is paying off.';
  }
  
  if (score === 'B') {
    return 'You\'re on the right track! Focus on these areas and you\'ll see great improvement.';
  }
  
  if (issueCount <= 2) {
    return 'You\'re making progress! Work on these specific areas and your form will improve quickly.';
  }
  
  return 'Every great shooter started where you are now. Consistent practice with these drills will build the muscle memory you need.';
}

/**
 * Generate actionable next steps
 */
export function generateNextSteps(
  recommendations: FeedbackRecommendation[],
  score: FormScore
): string[] {
  const steps: string[] = [];
  
  // Add drill-specific steps
  if (recommendations.length > 0) {
    const topIssue = recommendations[0];
    steps.push(`Start with: ${topIssue.drills[0]}`);
    
    if (recommendations.length > 1) {
      steps.push(`Then practice: ${recommendations[1].drills[0]}`);
    }
  }
  
  // Add general guidance based on score
  if (score === 'A' || score === 'B') {
    steps.push('Record another session to track your consistency');
  } else {
    steps.push('Practice these drills for 10-15 minutes daily');
    steps.push('Record a new session in 2-3 days to check progress');
  }
  
  return steps;
}

/**
 * Generate drill suggestions based on detected issues
 * Returns prioritized list of drills addressing multiple issues when possible
 */
export function generateDrillSuggestions(issues: FormIssue[]): string[] {
  if (issues.length === 0) {
    return ['Continue practicing your current form'];
  }
  
  // Collect all recommended drills
  const allDrills = issues.flatMap(issue => issue.recommendedDrills);
  
  // Remove duplicates while preserving order
  const uniqueDrills = Array.from(new Set(allDrills));
  
  // Prioritize drills that address multiple issues
  const drillIssueCount = new Map<string, number>();
  
  for (const drill of uniqueDrills) {
    const count = issues.filter(issue => 
      issue.recommendedDrills.includes(drill)
    ).length;
    drillIssueCount.set(drill, count);
  }
  
  // Sort by issue count (descending) to prioritize multi-issue drills
  const sortedDrills = uniqueDrills.sort((a, b) => {
    const countA = drillIssueCount.get(a) || 0;
    const countB = drillIssueCount.get(b) || 0;
    return countB - countA;
  });
  
  return sortedDrills;
}

/**
 * Format feedback for display in UI
 */
export function formatFeedbackForDisplay(feedback: SessionFeedback): string {
  let output = `${feedback.overallMessage}\n\n`;
  output += `Form Score: ${feedback.formScore}\n\n`;
  
  if (feedback.recommendations.length > 0) {
    output += 'Key Areas to Improve:\n';
    feedback.recommendations.forEach(rec => {
      output += `\n${rec.priority}. ${rec.issue.type.replace('_', ' ').toUpperCase()}\n`;
      output += `   ${rec.explanation}\n`;
      output += `   Why it matters: ${rec.whyItMatters}\n`;
      output += `   Recommended drills:\n`;
      rec.drills.forEach(drill => {
        output += `   - ${drill}\n`;
      });
    });
  }
  
  output += `\n${feedback.encouragement}\n\n`;
  output += 'Next Steps:\n';
  feedback.nextSteps.forEach((step, index) => {
    output += `${index + 1}. ${step}\n`;
  });
  
  return output;
}
