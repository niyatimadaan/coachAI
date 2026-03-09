/**
 * Video Analysis Service
 * Orchestrates video upload, storage, and ML analysis
 */

import S3StorageService from './S3StorageService';
import { PoseVisualizationService } from './PoseVisualizationService';
import type { AnnotatedFrameResult } from './PoseVisualizationService';
import DatabaseManager from '../database/DatabaseManager';
import { performLightweightMLAnalysis } from '../../ml/LightweightFormAnalyzer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface VideoAnalysisResult {
  sessionId: string;
  videoId: string;
  s3Key: string;
  s3Url: string;
  formScore: number;
  annotatedFrameUrls?: string[]; // URLs to annotated visualization frames
  analysisResults: {
    overallScore: number;
    biomechanicalMetrics: {
      elbowAlignment: number;
      wristAngle: number;
      shoulderSquare: number;
      followThrough: number;
    };
    detectedIssues: Array<{
      issueType: string;
      severity: string;
      description: string;
      recommendation: string;
    }>;
  };
}

class VideoAnalysisService {
  private tempDir: string;
  private useS3: boolean;

  constructor() {
    this.tempDir = process.env.VIDEO_TEMP_DIR || './uploads/temp';
    this.useS3 = process.env.VIDEO_STORAGE_PROVIDER === 's3';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Process uploaded video: store in S3 and run ML analysis
   */
  async processVideo(
    filePath: string,
    userId: string,
    studentId: string,
    options: {
      duration?: number;
      shotAttempts?: number;
    } = {}
  ): Promise<VideoAnalysisResult> {
    const videoId = uuidv4();
    let s3Key = '';
    let s3Url = '';

    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📹 Starting video processing for student ${studentId}`);
      console.log(`   Video ID: ${videoId}`);
      console.log(`   File path: ${filePath}`);
      console.log(`   File exists: ${fs.existsSync(filePath)}`);
      console.log(`${'='.repeat(60)}\n`);

      // Step 1: Upload to S3 (if enabled)
      try {
        if (this.useS3) {
          console.log('☁️  Step 1: Uploading video to S3...');
          const uploadResult = await S3StorageService.uploadVideo(
            filePath,
            videoId,
            userId,
            'video/mp4'
          );
          s3Key = uploadResult.s3Key;
          s3Url = uploadResult.s3Url;
          console.log(`✅ Step 1 SUCCESS: Video uploaded to S3`);
          console.log(`   S3 Key: ${s3Key}`);
          console.log(`   S3 URL: ${s3Url}`);
        } else {
          // For local storage, just use the file path
          s3Key = filePath;
          s3Url = filePath;
          console.log('💾 Step 1: Using local video storage');
          console.log(`   Local path: ${s3Key}`);
        }
      } catch (s3Error) {
        console.error('❌ Step 1 FAILED: S3 upload error');
        console.error('   Error name:', s3Error instanceof Error ? s3Error.name : 'Unknown');
        console.error('   Error message:', s3Error instanceof Error ? s3Error.message : String(s3Error));
        console.error('   Error stack:', s3Error instanceof Error ? s3Error.stack : 'No stack');
        throw new Error(`S3 upload failed: ${s3Error instanceof Error ? s3Error.message : String(s3Error)}`);
      }

      // Step 2: Run ML analysis
      let analysisResult;
      try {
        console.log('\n🧠 Step 2: Running ML analysis...');
        analysisResult = await performLightweightMLAnalysis(filePath);
        console.log(`✅ Step 2 SUCCESS: ML analysis complete`);
        console.log(`   Overall score: ${analysisResult.overallScore}`);
        console.log(`   Detected issues: ${analysisResult.detectedIssues?.length || 0}`);
        console.log(`   Keypoint frames: ${analysisResult.keypointFrames?.length || 0}`);
        if (analysisResult.biomechanicalMetrics) {
          console.log(`   Biomechanical metrics:`, JSON.stringify(analysisResult.biomechanicalMetrics, null, 2));
        }
      } catch (mlError) {
        console.error('❌ Step 2 FAILED: ML analysis error');
        console.error('   Error name:', mlError instanceof Error ? mlError.name : 'Unknown');
        console.error('   Error message:', mlError instanceof Error ? mlError.message : String(mlError));
        console.error('   Error stack:', mlError instanceof Error ? mlError.stack : 'No stack');
        throw new Error(`ML analysis failed: ${mlError instanceof Error ? mlError.message : String(mlError)}`);
      }

      // Convert letter grade to numeric score (use calculated score if available)
      const numericScore = analysisResult.numericScore || (() => {
        const scoreMap: Record<string, number> = {
          'A': 95,
          'B': 85,
          'C': 75,
          'D': 65,
          'F': 50
        };
        return scoreMap[analysisResult.overallScore] || 75;
      })();
      console.log(`   Numeric score: ${numericScore}`);
      console.log(`   Letter grade: ${analysisResult.overallScore}`);

      // Step 2.5: Generate annotated visualization frames
      let annotatedFrameUrls: string[] = [];
      if (analysisResult.keypointFrames && analysisResult.keypointFrames.length > 0) {
        try {
          console.log('\n🎨 Step 2.5: Generating annotated visualization frames...');
          const visualizer = new PoseVisualizationService();
          
          // Generate 3 key frames: prep, release, follow-through
          const frameIndices = [
            0, // Preparation
            Math.floor(analysisResult.keypointFrames.length * 0.4), // Release
            analysisResult.keypointFrames.length - 1, // Follow-through
          ];
          
          console.log(`   Frame indices: ${frameIndices.join(', ')}`);
          
          const annotatedFrames = await visualizer.generateAnnotatedFrames(
            filePath,
            analysisResult.keypointFrames,
            analysisResult.detectedIssues,
            frameIndices
          );
          
          console.log(`   Generated ${annotatedFrames.length} annotated frames`);
          
          // Upload annotated frames to S3
          if (this.useS3) {
            console.log('   Uploading annotated frames to S3...');
            for (const frame of annotatedFrames as AnnotatedFrameResult[]) {
              try {
                const annotatedKey = `annotated/${videoId}/frame-${frame.frameNumber}.jpg`;
                const uploadResult = await S3StorageService.uploadFile(
                  frame.framePath,
                  annotatedKey,
                  'image/jpeg'
                );
                annotatedFrameUrls.push(uploadResult.s3Url);
                
                // Clean up local annotated frame
                if (fs.existsSync(frame.framePath)) {
                  fs.unlinkSync(frame.framePath);
                }
              } catch (frameUploadError) {
                console.error(`   ⚠️  Failed to upload frame ${frame.frameNumber}:`, frameUploadError);
                // Continue with other frames
              }
            }
            console.log(`✅ Step 2.5 SUCCESS: Uploaded ${annotatedFrameUrls.length} annotated frames to S3`);
          } else {
            // For local storage, keep file paths
            annotatedFrameUrls = annotatedFrames.map((f: AnnotatedFrameResult) => f.framePath);
            console.log(`✅ Step 2.5 SUCCESS: Saved ${annotatedFrameUrls.length} annotated frames locally`);
          }
        } catch (vizError) {
          console.error('⚠️  Step 2.5 WARNING: Error generating annotated frames (non-critical)');
          console.error('   Error name:', vizError instanceof Error ? vizError.name : 'Unknown');
          console.error('   Error message:', vizError instanceof Error ? vizError.message : String(vizError));
          console.error('   Error stack:', vizError instanceof Error ? vizError.stack : 'No stack');
          // Continue without visualization - non-critical feature
        }
      } else {
        console.log('⏭️  Step 2.5 SKIPPED: No keypoint frames available for visualization');
      }

      // Step 3: Create shooting session in database
      const sessionId = uuidv4();
      const duration = options.duration || 60; // Default 60 seconds
      const shotAttempts = options.shotAttempts || 1;

      try {
        console.log('\n💾 Step 3: Creating shooting session in database...');
        console.log(`   Session ID: ${sessionId}`);
        console.log(`   Duration: ${duration}s`);
        console.log(`   Shot attempts: ${shotAttempts}`);
        console.log(`   Form score: ${numericScore}`);
        
        // Get the actual student ID from the user ID
        // studentId parameter might be users.id, we need students.id
        const actualStudentId = await DatabaseManager.getStudentIdByUserId(studentId);
        
        if (!actualStudentId) {
          throw new Error(`No student record found for user ID: ${studentId}. Student record may not have been created during signup.`);
        }
        
        console.log(`   User ID: ${studentId}`);
        console.log(`   Student DB ID: ${actualStudentId}`);
        
        const sessionInsertResult = await DatabaseManager.query(
          `INSERT INTO shooting_sessions 
           (id, user_id, timestamp, duration, shot_attempts, video_path, form_score, practice_time, shot_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            sessionId,
            actualStudentId,  // Use the student table ID, not the user table ID
            new Date(),
            duration,
            shotAttempts,
            s3Key,
            numericScore,
            duration,
            shotAttempts,
          ]
        );
        
        console.log(`✅ Step 3 SUCCESS: Session created with ID ${sessionInsertResult.rows[0]?.id || sessionId}`);
      } catch (dbError) {
        console.error('❌ Step 3 FAILED: Database session insert error');
        console.error('   Error name:', dbError instanceof Error ? dbError.name : 'Unknown');
        console.error('   Error message:', dbError instanceof Error ? dbError.message : String(dbError));
        console.error('   Error stack:', dbError instanceof Error ? dbError.stack : 'No stack');
        console.error('   Query parameters:', JSON.stringify({
          sessionId,
          studentId,
          duration,
          shotAttempts,
          s3Key,
          numericScore
        }, null, 2));
        throw new Error(`Database session insert failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }

      // Step 4: Store biomechanical metrics
      if (analysisResult.biomechanicalMetrics) {
        try {
          console.log('\n📊 Step 4: Storing biomechanical metrics...');
          console.log('   Metrics:', JSON.stringify(analysisResult.biomechanicalMetrics, null, 2));
          
          const metricsInsertResult = await DatabaseManager.query(
            `INSERT INTO biomechanical_metrics 
             (session_id, elbow_alignment, wrist_angle, shoulder_square, follow_through, body_balance)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING session_id`,
            [
              sessionId,
              analysisResult.biomechanicalMetrics.elbowAlignment,
              analysisResult.biomechanicalMetrics.wristAngle,
              analysisResult.biomechanicalMetrics.shoulderSquare,
              analysisResult.biomechanicalMetrics.followThrough,
              analysisResult.biomechanicalMetrics.bodyBalance,
            ]
          );
          
          console.log(`✅ Step 4 SUCCESS: Biomechanical metrics stored for session ${metricsInsertResult.rows[0]?.session_id || sessionId}`);
        } catch (metricsError) {
          console.error('❌ Step 4 FAILED: Biomechanical metrics insert error');
          console.error('   Error name:', metricsError instanceof Error ? metricsError.name : 'Unknown');
          console.error('   Error message:', metricsError instanceof Error ? metricsError.message : String(metricsError));
          console.error('   Error stack:', metricsError instanceof Error ? metricsError.stack : 'No stack');
          throw new Error(`Biomechanical metrics insert failed: ${metricsError instanceof Error ? metricsError.message : String(metricsError)}`);
        }
      } else {
        console.log('⏭️  Step 4 SKIPPED: No biomechanical metrics available');
      }

      // Step 5: Store detected form issues
      if (analysisResult.detectedIssues && analysisResult.detectedIssues.length > 0) {
        try {
          console.log(`\n⚠️  Step 5: Storing ${analysisResult.detectedIssues.length} form issues...`);
          
          // Map ML severity values to database values
          const severityMap: { [key: string]: string } = {
            major: 'high',
            moderate: 'medium',
            minor: 'low',
          };

          let insertedCount = 0;
          for (const issue of analysisResult.detectedIssues) {
            try {
              const issueId = uuidv4();
              const dbSeverity = severityMap[issue.severity] || issue.severity;
              
              console.log(`   Inserting issue: ${issue.type} (${dbSeverity})`);
              
              await DatabaseManager.query(
                `INSERT INTO form_issues (id, session_id, issue_type, severity, description)
                 VALUES ($1, $2, $3, $4, $5)`,
                [issueId, sessionId, issue.type, dbSeverity, issue.description]
              );
              
              insertedCount++;
            } catch (issueError) {
              console.error(`   ⚠️  Failed to insert issue ${issue.type}:`, issueError);
              // Continue with other issues
            }
          }
          
          console.log(`✅ Step 5 SUCCESS: Inserted ${insertedCount}/${analysisResult.detectedIssues.length} form issues`);
        } catch (issuesError) {
          console.error('❌ Step 5 FAILED: Form issues insert error');
          console.error('   Error name:', issuesError instanceof Error ? issuesError.name : 'Unknown');
          console.error('   Error message:', issuesError instanceof Error ? issuesError.message : String(issuesError));
          console.error('   Error stack:', issuesError instanceof Error ? issuesError.stack : 'No stack');
          // Don't throw - issues are non-critical
        }
      } else {
        console.log('⏭️  Step 5 SKIPPED: No form issues detected');
      }

      // Step 6: Clean up temp file if using S3
      try {
        if (this.useS3 && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('\n🧹 Step 6: Temp file cleaned up');
        }
      } catch (cleanupError) {
        console.error('⚠️  Step 6 WARNING: Failed to clean up temp file (non-critical)');
        console.error('   Error:', cleanupError);
      }

      // Map ML severity values to database values for return
      const severityMap: { [key: string]: string } = {
        major: 'high',
        moderate: 'medium',
        minor: 'low',
      };

      const result = {
        sessionId,
        videoId,
        s3Key,
        s3Url,
        formScore: numericScore,
        annotatedFrameUrls,
        analysisResults: {
          overallScore: numericScore,
          biomechanicalMetrics: analysisResult.biomechanicalMetrics,
          detectedIssues: analysisResult.detectedIssues.map((issue) => ({
            issueType: issue.type,
            severity: severityMap[issue.severity] || issue.severity,
            description: issue.description,
            recommendation: issue.recommendedDrills.join(', ') || 'Practice proper technique',
          })),
        },
      };

      console.log('\n' + '='.repeat(60));
      console.log('✅ VIDEO PROCESSING COMPLETE');
      console.log(`   Session ID: ${sessionId}`);
      console.log(`   Video ID: ${videoId}`);
      console.log(`   Form Score: ${numericScore}`);
      console.log(`   Storage: ${this.useS3 ? 'S3' : 'Local'}`);
      console.log(`   Annotated Frames: ${annotatedFrameUrls.length}`);
      console.log('='.repeat(60) + '\n');

      return result;
    } catch (error) {
      console.error('\n' + '='.repeat(60));
      console.error('❌ VIDEO PROCESSING FAILED');
      console.error('='.repeat(60));
      console.error('Error details:');
      console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('   Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('   Error message:', error instanceof Error ? error.message : String(error));
      console.error('   Error stack:');
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      console.error('Context:');
      console.error('   Video ID:', videoId);
      console.error('   Student ID:', studentId);
      console.error('   File path:', filePath);
      console.error('   File exists:', fs.existsSync(filePath));
      console.error('   S3 Key:', s3Key);
      console.error('   Using S3:', this.useS3);
      console.error('='.repeat(60) + '\n');

      // Clean up on error
      try {
        console.log('🧹 Attempting cleanup after error...');
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('   ✅ Temp file deleted');
        }
        
        if (this.useS3 && s3Key) {
          try {
            await S3StorageService.deleteVideo(s3Key);
            console.log('   ✅ S3 video deleted');
          } catch (deleteError) {
            console.error('   ⚠️  Failed to clean up S3 video:', deleteError);
          }
        }
      } catch (cleanupError) {
        console.error('   ⚠️  Cleanup failed:', cleanupError);
      }

      throw new Error(`Video processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get signed URL for video playback
   */
  async getVideoUrl(s3Key: string): Promise<string> {
    try {
      console.log(`📺 Getting video URL for: ${s3Key}`);
      
      if (!this.useS3) {
        console.log(`   ✅ Returning local path: ${s3Key}`);
        return s3Key; // Return local path
      }

      // Generate signed URL valid for 1 hour
      const signedUrl = await S3StorageService.getSignedUrl(s3Key, 3600);
      console.log(`   ✅ Generated signed URL (expires in 1 hour)`);
      return signedUrl;
    } catch (error) {
      console.error('❌ Get video URL failed');
      console.error('   Error:', error);
      console.error('   S3 Key:', s3Key);
      throw new Error(`Failed to get video URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete video and associated data
   */
  async deleteVideo(sessionId: string): Promise<void> {
    try {
      console.log(`🗑️  Deleting video for session: ${sessionId}`);
      
      // Get video path from database
      const result = await DatabaseManager.query(
        'SELECT video_path FROM shooting_sessions WHERE id = $1',
        [sessionId]
      );

      if (result.rows.length === 0) {
        console.error('   ❌ Session not found');
        throw new Error('Session not found');
      }

      const s3Key = result.rows[0].video_path;
      console.log(`   Video path: ${s3Key}`);

      // Delete from S3 if using S3 storage
      if (this.useS3 && s3Key) {
        console.log('   Deleting from S3...');
        await S3StorageService.deleteVideo(s3Key);
        console.log('   ✅ S3 video deleted');
      }

      // Delete session (cascade will delete related data)
      console.log('   Deleting database records...');
      await DatabaseManager.query('DELETE FROM shooting_sessions WHERE id = $1', [sessionId]);
      console.log(`   ✅ Session and related data deleted`);

      console.log(`✅ Video deletion complete for session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Delete video failed');
      console.error('   Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('   Error message:', error instanceof Error ? error.message : String(error));
      console.error('   Session ID:', sessionId);
      if (error instanceof Error && error.stack) {
        console.error('   Stack trace:', error.stack);
      }
      throw new Error(`Failed to delete video: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default new VideoAnalysisService();
