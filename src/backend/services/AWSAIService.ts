/**
 * AWS AI Service
 * Integrates with SageMaker for pose detection and Azure OpenAI for drill suggestions
 */

import { 
  SageMakerRuntimeClient, 
  InvokeEndpointCommand 
} from '@aws-sdk/client-sagemaker-runtime';
import { FormIssue, BiomechanicalMetrics } from '../../types/models';
import { KeypointFrame } from '../../ml/PoseEstimationEngine';

// Azure OpenAI response type
interface AzureOpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Initialize AWS SageMaker client
const sagemakerClient = new SageMakerRuntimeClient({ 
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

export interface DrillSuggestion {
  issue: string;
  drillName: string;
  description: string;
  instructions: string[];
  sets: string;
  focusPoints: string[];
  commonMistakes: string[];
  videoLinks?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface PracticeRoutine {
  warmup: string;
  mainDrills: string;
  cooldown: string;
  totalDuration: string;
}

export interface DrillRecommendation {
  priorityIssues: string[];
  drills: DrillSuggestion[];
  practiceRoutine: PracticeRoutine;
  progressIndicators: string[];
  motivationalMessage: string;
}

class AWSAIService {
  private sagemakerEndpoint: string;
  private azureOpenAIEndpoint: string;
  private azureOpenAIKey: string;
  private useSageMaker: boolean;
  private useAzureOpenAI: boolean;

  constructor() {
    this.sagemakerEndpoint = process.env.SAGEMAKER_ENDPOINT_NAME || 'basketball-pose-endpoint';
    this.azureOpenAIEndpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://azure-deepseek-tecnod8.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview';
    this.azureOpenAIKey = process.env.AZURE_OPENAI_API_KEY || '';
    
    // DEBUG: Log what we're seeing
    console.log('\n🔍 AWSAIService Constructor - Environment Variables:');
    console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'SET (' + process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...)' : 'NOT SET'}`);
    console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'SET (hidden)' : 'NOT SET'}`);
    console.log(`   SAGEMAKER_ENDPOINT_NAME: ${process.env.SAGEMAKER_ENDPOINT_NAME || 'NOT SET'}`);
    console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
    console.log(`   USE_SAGEMAKER_POSE_DETECTION: ${process.env.USE_SAGEMAKER_POSE_DETECTION || 'NOT SET'}\n`);
    
    // Check if AI services are configured
    this.useSageMaker = !!(process.env.AWS_ACCESS_KEY_ID && process.env.SAGEMAKER_ENDPOINT_NAME);
    this.useAzureOpenAI = !!(this.azureOpenAIKey);

    if (!this.useSageMaker) {
      console.warn('⚠️  SageMaker not configured. Set AWS_ACCESS_KEY_ID and SAGEMAKER_ENDPOINT_NAME');
    } else {
      console.log(' ✅ SageMaker configured successfully');
      console.log(`   Endpoint: ${this.sagemakerEndpoint}`);
      console.log(`   Region: ${process.env.AWS_REGION}`);
    }
    if (!this.useAzureOpenAI) {
      console.warn('⚠️  Azure OpenAI not configured. Drill suggestions will be rule-based');
    } else {
      console.log('✅ Azure OpenAI configured successfully');
    }
    console.log('');
  }

  /**
   * Check if AI services are available
   */
  isAvailable(): { sagemaker: boolean; azureOpenAI: boolean } {
    return {
      sagemaker: this.useSageMaker,
      azureOpenAI: this.useAzureOpenAI,
    };
  }

  /**
   * Detect pose from video frames using SageMaker endpoint
   */
  async detectPoseFromFrames(frameBuffers: Buffer[]): Promise<KeypointFrame[]> {
    if (!this.useSageMaker) {
      const error = new Error('SageMaker is not configured. Missing AWS_ACCESS_KEY_ID or SAGEMAKER_ENDPOINT_NAME');
      console.error('❌ SageMaker configuration error:', error.message);
      throw error;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔬 SAGEMAKER POSE DETECTION`);
    console.log('='.repeat(60));
    console.log(`   Endpoint: ${this.sagemakerEndpoint}`);
    console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    console.log(`   Total frames: ${frameBuffers.length}`);
    console.log('='.repeat(60) + '\n');
    
    const keypointFrames: KeypointFrame[] = [];

    for (let i = 0; i < frameBuffers.length; i++) {
      try {
        const payload = {
          image: frameBuffers[i].toString('base64'),
          frameNumber: i,
        };

        const command = new InvokeEndpointCommand({
          EndpointName: this.sagemakerEndpoint,
          ContentType: 'application/json',
          Body: JSON.stringify(payload),
        });

        const response = await sagemakerClient.send(command);
        const result = JSON.parse(Buffer.from(response.Body!).toString());

        if (result.keypoints) {
          keypointFrames.push({
            keypoints: this.convertToKeypointMap(result.keypoints),
            timestamp: i * 50, // Assuming ~20 fps
            confidence: result.confidence || 0.9,
          });
        }
      } catch (error) {
        console.error(`❌ Error processing frame ${i}:`);
        console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('   Error message:', error instanceof Error ? error.message : String(error));
        console.error('   Frame size:', frameBuffers[i].length, 'bytes');
        // Continue with other frames - don't throw
      }
    }

    if (keypointFrames.length === 0) {
      const error = new Error(`SageMaker failed to detect any poses from ${frameBuffers.length} frames`);
      console.error('❌', error.message);
      throw error;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ SAGEMAKER SUCCESS`);
    console.log('='.repeat(60));
    console.log(`   Detected poses: ${keypointFrames.length}/${frameBuffers.length} frames`);
    console.log(`   Success rate: ${((keypointFrames.length / frameBuffers.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');
    
    return keypointFrames;
  }

  /**
   * Convert SageMaker keypoint array to Map format
   */
  private convertToKeypointMap(keypoints: any[]): Map<number, any> {
    const keypointMap = new Map();
    keypoints.forEach((kp, idx) => {
      keypointMap.set(idx, {
        x: kp.x,
        y: kp.y,
        z: kp.z || 0,
        visibility: kp.visibility || 1.0,
      });
    });
    return keypointMap;
  }

  /**
   * Generate personalized drill suggestions using Azure OpenAI GPT-4o
   */
  async generateDrillSuggestions(
    detectedIssues: FormIssue[],
    biomechanics: BiomechanicalMetrics,
    studentLevel: string = 'intermediate',
    studentAge?: number
  ): Promise<DrillRecommendation> {
    if (!this.useAzureOpenAI) {
      console.log('⚠️  Azure OpenAI not available, using rule-based drill suggestions');
      return this.generateRuleBasedDrills(detectedIssues, biomechanics, studentLevel);
    }

    console.log('🤖 Generating AI-powered drill suggestions with Azure OpenAI GPT-4o...');

    try {
      const prompt = this.buildDrillPrompt(detectedIssues, biomechanics, studentLevel, studentAge);

      const response = await fetch(this.azureOpenAIEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.azureOpenAIKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an expert basketball shooting coach with 20+ years of experience coaching players from youth to professional levels. You specialize in:
- Biomechanical analysis of shooting form
- Identifying root causes of form issues
- Creating progressive, personalized drill programs
- Motivating and encouraging players

Analyze the form data provided and generate highly specific, actionable drill recommendations tailored to the player's level and issues. Be encouraging but honest. Focus on fundamentals and proper mechanics.`
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure OpenAI API Error:', response.status, response.statusText, errorText);
        throw new Error(`Azure OpenAI request failed: ${response.status}`);
      }

      const data = await response.json() as AzureOpenAIResponse;
      const aiResponse = data.choices[0].message.content;

      // Parse GPT-4o's response
      const recommendation = this.parseAIResponse(aiResponse);
      
      console.log(`✅ Generated ${recommendation.drills.length} personalized drills`);
      return recommendation;

    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      console.log('Falling back to rule-based drill suggestions');
      return this.generateRuleBasedDrills(detectedIssues, biomechanics, studentLevel);
    }
  }

  /**
   * Build detailed prompt for Claude
   */
  private buildDrillPrompt(
    issues: FormIssue[],
    biomechanics: BiomechanicalMetrics,
    level: string,
    age?: number
  ): string {
    const ageInfo = age ? `\n**Age:** ${age} years old` : '';
    
    return `Analyze this basketball shooting form and provide a personalized improvement plan.

**Player Profile:**
- Skill Level: ${level}${ageInfo}

**Detected Form Issues:**
${issues.map((issue, idx) => 
  `${idx + 1}. **${this.formatIssueType(issue.type)}** (${issue.severity} priority)
   - ${issue.description}`
).join('\n')}

**Biomechanical Metrics (0-100 scale):**
- Elbow Alignment: ${biomechanics.elbowAlignment}/100 ${this.getMetricFeedback(biomechanics.elbowAlignment)}
- Wrist Angle: ${biomechanics.wristAngle}/100 ${this.getMetricFeedback(biomechanics.wristAngle)}
- Shoulder Square: ${biomechanics.shoulderSquare}/100 ${this.getMetricFeedback(biomechanics.shoulderSquare)}
- Follow Through: ${biomechanics.followThrough}/100 ${this.getMetricFeedback(biomechanics.followThrough)}

**Please provide a comprehensive coaching response with:**

1. **Priority Analysis**: Rank the top 3 issues to focus on first and explain why these are most important

2. **Specific Drills**: For EACH priority issue, provide 2-3 drills with:
   - Drill name (creative, memorable)
   - Brief description (1-2 sentences)
   - Step-by-step instructions (4-6 clear steps)
   - Recommended practice volume (sets x reps or duration)
   - Key focus points during execution
   - Common mistakes to avoid
   - Difficulty level (beginner/intermediate/advanced)

3. **20-Minute Practice Routine**: Structure a focused practice session:
   - Warmup (5 min): Prep exercises
   - Main drills (12 min): Ordered progression through key drills
   - Cool down (3 min): Form reinforcement

4. **Progress Indicators**: 3-5 specific signs of improvement the player should look for

5. **Motivational Message**: Brief, encouraging message (2-3 sentences) to keep the player motivated

**IMPORTANT: Respond ONLY with valid JSON in this exact format:**

\`\`\`json
{
  "priorityIssues": ["issue1", "issue2", "issue3"],
  "drills": [
    {
      "issue": "elbow_flare",
      "drillName": "Wall Touch Shooting",
      "description": "Practice keeping your elbow aligned by shooting close to a wall",
      "instructions": [
        "Stand with your shooting shoulder 6 inches from a wall",
        "Hold the ball in your shooting pocket",
        "Begin your shot motion slowly",
        "If your elbow flares out, it will touch the wall",
        "Repeat 10 times focusing on straight elbow path"
      ],
      "sets": "3 sets of 10 reps",
      "focusPoints": [
        "Keep elbow directly under the ball",
        "Move in a straight vertical plane"
      ],
      "commonMistakes": [
        "Moving too far from wall",
        "Rushing the motion"
      ],
      "difficulty": "beginner"
    }
  ],
  "practiceRoutine": {
    "warmup": "5 min: Form shooting from 3 feet, focusing on wrist snap and follow-through. 20 makes.",
    "mainDrills": "12 min: Wall Touch Drill (4 min), One-Hand Form Shooting (4 min), Guide Hand Removal Drill (4 min)",
    "cooldown": "3 min: Free throw routine with perfect form. 10 shots, focus on consistency.",
    "totalDuration": "20 minutes"
  },
  "progressIndicators": [
    "Shooting elbow stays directly under the ball throughout shot",
    "Increased shooting range with same effort",
    "More consistent ball rotation (backspin)",
    "Improved shooting percentage from 10 feet"
  ],
  "motivationalMessage": "Your foundation is solid! These issues are very common and highly fixable with focused practice. Players who commit to 20 minutes of daily form work typically see noticeable improvement within 2 weeks. You've got this!"
}
\`\`\`

Do NOT include any text outside the JSON.`;
  }

  /**
   * Format issue type for human readability
   */
  private formatIssueType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get feedback for metric score
   */
  private getMetricFeedback(score: number): string {
    if (score >= 80) return '✅ Good';
    if (score >= 60) return '⚠️ Needs work';
    return '❌ Priority to fix';
  }

  /**
   * Parse AI JSON response (Azure OpenAI or Claude)
   */
  private parseAIResponse(text: string): DrillRecommendation {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      // Validate structure
      if (!parsed.drills || !Array.isArray(parsed.drills)) {
        throw new Error('Invalid drill structure');
      }

      return {
        priorityIssues: parsed.priorityIssues || [],
        drills: parsed.drills,
        practiceRoutine: parsed.practiceRoutine || {
          warmup: 'Light shooting warmup',
          mainDrills: 'Focus on identified issues',
          cooldown: 'Free throw practice',
          totalDuration: '20 minutes',
        },
        progressIndicators: parsed.progressIndicators || [],
        motivationalMessage: parsed.motivationalMessage || 'Keep practicing and stay focused!',
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI recommendations');
    }
  }

  /**
   * Fallback: Generate rule-based drill suggestions
   */
  private generateRuleBasedDrills(
    issues: FormIssue[],
    biomechanics: BiomechanicalMetrics,
    level: string
  ): DrillRecommendation {
    const drills: DrillSuggestion[] = [];

    // Map common issues to standard drills
    const drillDatabase: Record<string, DrillSuggestion> = {
      elbow_flare: {
        issue: 'elbow_flare',
        drillName: 'Wall Touch Shooting Drill',
        description: 'Use a wall to prevent elbow from flaring out during shot',
        instructions: [
          'Stand with shooting shoulder 6 inches from wall',
          'Hold ball in shooting pocket',
          'Slowly begin shot motion',
          'If elbow flares, it touches wall',
          'Repeat focusing on straight elbow path',
        ],
        sets: '3 sets of 10 reps',
        focusPoints: ['Keep elbow under ball', 'Vertical arm path'],
        commonMistakes: ['Moving too far from wall', 'Rushing motion'],
        difficulty: 'beginner',
      },
      wrist_angle: {
        issue: 'wrist_angle',
        drillName: 'One-Hand Form Shooting',
        description: 'Isolate shooting hand to improve wrist snap',
        instructions: [
          'Shoot from 3 feet with shooting hand only',
          'Guide hand behind back',
          'Focus on wrist snap and follow-through',
          'Make 20 shots before moving back',
        ],
        sets: '4 sets of 20 makes',
        focusPoints: ['Strong wrist snap', 'High follow-through', 'Backspin on ball'],
        commonMistakes: ['Using guide hand', 'Weak follow-through'],
        difficulty: 'beginner',
      },
      follow_through: {
        issue: 'follow_through',
        drillName: 'Hold Your Follow-Through',
        description: 'Develop muscle memory for proper follow-through',
        instructions: [
          'Shoot from free throw line',
          'Hold follow-through until ball hits rim',
          'Hand should form "goose neck"',
          'Fingers pointing at basket',
        ],
        sets: '50 shots',
        focusPoints: ['Freeze follow-through', 'Wrist fully extended', 'Elbow above eyes'],
        commonMistakes: ['Dropping arm too soon', 'Looking at hand instead of basket'],
        difficulty: 'beginner',
      },
    };

    // Add drills for detected issues
    issues.forEach(issue => {
      if (drillDatabase[issue.type]) {
        drills.push(drillDatabase[issue.type]);
      }
    });

    // If no specific drills, add general form drill
    if (drills.length === 0) {
      drills.push({
        issue: 'general_form',
        drillName: 'Form Line Shooting',
        description: 'Build consistent shooting mechanics from close range',
        instructions: [
          'Start 3 feet from basket',
          'Make 10 shots with perfect form',
          'Move back one step',
          'Repeat until form breaks down',
          'Go back one step and finish there',
        ],
        sets: '3 sets through progression',
        focusPoints: ['Perfect form every shot', 'Consistent release', 'Follow-through'],
        commonMistakes: ['Moving back too quickly', 'Sacrificing form for distance'],
        difficulty: 'beginner',
      });
    }

    return {
      priorityIssues: issues.slice(0, 3).map(i => i.type),
      drills,
      practiceRoutine: {
        warmup: '5 min: Form shooting from close range, 20 makes',
        mainDrills: `12 min: ${drills[0]?.drillName || 'Form practice'}`,
        cooldown: '3 min: Free throws with perfect form',
        totalDuration: '20 minutes',
      },
      progressIndicators: [
        'More consistent shot release',
        'Improved shooting percentage',
        'Better feel and touch on the ball',
      ],
      motivationalMessage: 'Consistent practice leads to consistent results. Focus on quality reps!',
    };
  }
}

export default new AWSAIService();
