/**
 * Video Upload API
 * Handles video file uploads and triggers ML analysis
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import VideoAnalysisService from './services/VideoAnalysisService';
import S3StorageService from './services/S3StorageService';

class VideoUploadAPI {
  private router: Router;
  private upload: multer.Multer;
  private tempDir: string;

  constructor() {
    this.router = Router();
    this.tempDir = process.env.VIDEO_TEMP_DIR || './uploads/temp';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Configure multer for file upload
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.tempDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      },
    });

    // File filter
    const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      const allowedFormats = (process.env.VIDEO_ALLOWED_FORMATS || 'mp4,mov,avi,webm').split(',');
      const ext = path.extname(file.originalname).toLowerCase().substring(1);
      
      if (allowedFormats.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed formats: ${allowedFormats.join(', ')}`));
      }
    };

    this.upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: (parseInt(process.env.VIDEO_MAX_SIZE_MB || '100') * 1024 * 1024), // Convert MB to bytes
      },
    });

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Upload and analyze video
    this.router.post('/upload', this.upload.single('video'), this.uploadVideo.bind(this));

    // Get video URL for playback
    this.router.get('/video/:sessionId/url', this.getVideoUrl.bind(this));

    // Delete video
    this.router.delete('/video/:sessionId', this.deleteVideo.bind(this));

    // Get upload status/progress (for future implementation)
    this.router.get('/upload/:uploadId/status', this.getUploadStatus.bind(this));
  }

  /**
   * POST /api/video/upload
   * Upload video and run ML analysis
   */
  private async uploadVideo(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let uploadedFilePath: string | undefined;
    
    try {
      console.log('\n' + '='.repeat(70));
      console.log('📤 VIDEO UPLOAD REQUEST RECEIVED');
      console.log('='.repeat(70));
      
      // Check if file was uploaded
      if (!req.file) {
        console.error('❌ No video file in request');
        res.status(400).json({ 
          success: false, 
          error: 'No video file uploaded' 
        });
        return;
      }

      uploadedFilePath = req.file.path;
      
      console.log('File details:');
      console.log(`   Original name: ${req.file.originalname}`);
      console.log(`   Size: ${req.file.size} bytes (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`   Mime type: ${req.file.mimetype}`);
      console.log(`   Temp path: ${req.file.path}`);
      console.log(`   File exists: ${fs.existsSync(req.file.path)}`);

      // Extract metadata from request body
      const { studentId, duration, shotAttempts } = req.body;
      
      console.log('Request metadata:');
      console.log(`   Student ID: ${studentId || 'MISSING'}`);
      console.log(`   Duration: ${duration || 'not provided'}`);
      console.log(`   Shot attempts: ${shotAttempts || 'not provided'}`);

      if (!studentId) {
        console.error('❌ Student ID missing from request');
        // Clean up uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('   🧹 Temp file cleaned up');
        }
        res.status(400).json({ 
          success: false, 
          error: 'Student ID is required' 
        });
        return;
      }

      // Get user ID from request (assuming middleware sets this)
      const userId = (req as any).user?.id || studentId;
      console.log(`   User ID: ${userId}`);

      console.log('\n🔄 Starting video processing pipeline...\n');

      // Process video (upload to S3 and run ML analysis)
      const result = await VideoAnalysisService.processVideo(
        req.file.path,
        userId,
        studentId,
        {
          duration: duration ? parseInt(duration) : undefined,
          shotAttempts: shotAttempts ? parseInt(shotAttempts) : undefined,
        }
      );

      const processingTime = Date.now() - startTime;
      
      console.log('\n' + '='.repeat(70));
      console.log('✅ VIDEO UPLOAD API SUCCESS');
      console.log(`   Total processing time: ${processingTime}ms`);
      console.log(`   Session ID: ${result.sessionId}`);
      console.log(`   Form Score: ${result.formScore}`);
      console.log('='.repeat(70) + '\n');

      res.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          videoId: result.videoId,
          formScore: result.formScore,
          analysis: result.analysisResults,
          annotatedFrames: result.annotatedFrameUrls || [],
          message: 'Video uploaded and analyzed successfully',
        },
      });
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      console.error('\n' + '='.repeat(70));
      console.error('❌ VIDEO UPLOAD API FAILED');
      console.error('='.repeat(70));
      console.error('Error details:');
      console.error('   Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('   Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('   Error message:', error instanceof Error ? error.message : String(error));
      console.error('   Processing time before failure:', processingTime, 'ms');
      
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
      }
      
      console.error('Request context:');
      console.error('   File uploaded:', !!req.file);
      if (req.file) {
        console.error('   File name:', req.file.originalname);
        console.error('   File size:', req.file.size);
        console.error('   File path:', req.file.path);
        console.error('   File exists:', fs.existsSync(req.file.path));
      }
      console.error('   Student ID:', req.body.studentId);
      console.error('='.repeat(70) + '\n');

      // Clean up file if it still exists
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try {
          fs.unlinkSync(uploadedFilePath);
          console.log('🧹 Temp file cleaned up after error');
        } catch (cleanupError) {
          console.error('⚠️  Failed to clean up temp file:', cleanupError);
        }
      }

      res.status(500).json({ 
        success: false, 
        error: error.message || 'Video upload failed',
        details: process.env.NODE_ENV === 'development' ? {
          type: error instanceof Error ? error.constructor.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        } : undefined,
      });
    }
  }

  /**
   * GET /api/video/video/:sessionId/url
   * Get signed URL for video playback
   */
  private async getVideoUrl(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

      if (!sessionId) {
        res.status(400).json({ success: false, error: 'Session ID is required' });
        return;
      }

      // Get s3Key from database
      const result = await VideoAnalysisService.getVideoUrl(sessionId);

      res.json({
        success: true,
        data: {
          url: result,
          expiresIn: 3600, // 1 hour
        },
      });
    } catch (error: any) {
      console.error('Get video URL error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to get video URL' 
      });
    }
  }

  /**
   * DELETE /api/video/video/:sessionId
   * Delete video and session
   */
  private async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

      if (!sessionId) {
        res.status(400).json({ success: false, error: 'Session ID is required' });
        return;
      }

      await VideoAnalysisService.deleteVideo(sessionId);

      res.json({
        success: true,
        message: 'Video deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete video error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Failed to delete video' 
      });
    }
  }

  /**
   * GET /api/video/upload/:uploadId/status
   * Get upload progress (placeholder for future implementation)
   */
  private async getUploadStatus(req: Request, res: Response): Promise<void> {
    const uploadId = Array.isArray(req.params.uploadId) ? req.params.uploadId[0] : req.params.uploadId;

    // This is a placeholder for future upload progress tracking
    res.json({
      success: true,
      data: {
        uploadId,
        status: 'completed',
        progress: 100,
      },
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}

export default new VideoUploadAPI();
