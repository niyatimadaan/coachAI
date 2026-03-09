/**
 * Video Upload Service
 * Handles video file uploads to local storage or S3
 */

import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export interface UploadedVideo {
  videoId: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface VideoMetadata {
  resolution: string;
  frameRate: number;
  duration: number;
  codec?: string;
}

class VideoStorageService {
  private storageProvider: 'local' | 's3';
  private uploadDir: string;
  private s3Client?: S3Client;
  private s3Bucket?: string;
  private s3Prefix?: string;
  private maxSizeMB: number;
  private allowedFormats: string[];

  constructor() {
    this.storageProvider = (process.env.VIDEO_STORAGE_PROVIDER as 'local' | 's3') || 'local';
    this.uploadDir = process.env.VIDEO_UPLOAD_DIR || './uploads/videos';
    this.maxSizeMB = parseInt(process.env.VIDEO_MAX_SIZE_MB || '100');
    this.allowedFormats = (process.env.VIDEO_ALLOWED_FORMATS || 'mp4,mov,avi,webm').split(',');

    // Initialize S3 if using cloud storage
    if (this.storageProvider === 's3') {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
      this.s3Bucket = process.env.AWS_S3_BUCKET;
      this.s3Prefix = process.env.AWS_S3_VIDEO_PREFIX || 'videos/';
    } else {
      // Ensure local upload directory exists
      this.ensureUploadDirectoryExists();
    }
  }

  /**
   * Ensure local upload directory exists
   */
  private ensureUploadDirectoryExists(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      console.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Validate video file
   */
  validateVideo(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > this.maxSizeMB) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.maxSizeMB}MB`,
      };
    }

    // Check file format
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (!this.allowedFormats.includes(ext)) {
      return {
        valid: false,
        error: `File format not supported. Allowed formats: ${this.allowedFormats.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Upload video to local storage
   */
  private async uploadToLocal(file: Express.Multer.File): Promise<UploadedVideo> {
    const videoId = uuidv4();
    const ext = path.extname(file.originalname);
    const fileName = `${videoId}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Write file to disk
    await fs.promises.writeFile(filePath, file.buffer);

    return {
      videoId,
      originalName: file.originalname,
      fileName,
      filePath,
      fileUrl: `/uploads/videos/${fileName}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };
  }

  /**
   * Upload video to S3
   */
  private async uploadToS3(file: Express.Multer.File): Promise<UploadedVideo> {
    if (!this.s3Client || !this.s3Bucket) {
      throw new Error('S3 client not initialized');
    }

    const videoId = uuidv4();
    const ext = path.extname(file.originalname);
    const fileName = `${videoId}${ext}`;
    const key = `${this.s3Prefix}${fileName}`;

    // Upload to S3
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    await upload.done();

    return {
      videoId,
      originalName: file.originalname,
      fileName,
      filePath: key,
      fileUrl: `https://${this.s3Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date(),
    };
  }

  /**
   * Upload video file
   */
  async uploadVideo(file: Express.Multer.File): Promise<UploadedVideo> {
    // Validate video
    const validation = this.validateVideo(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Upload based on storage provider
    if (this.storageProvider === 's3') {
      return await this.uploadToS3(file);
    } else {
      return await this.uploadToLocal(file);
    }
  }

  /**
   * Get video file path for processing
   */
  async getVideoPath(fileName: string): Promise<string> {
    if (this.storageProvider === 's3') {
      // For S3, download to temp directory first
      const tempDir = './uploads/temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, fileName);
      
      if (!this.s3Client || !this.s3Bucket) {
        throw new Error('S3 client not initialized');
      }

      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: `${this.s3Prefix}${fileName}`,
      });

      const response = await this.s3Client.send(command);
      
      if (response.Body) {
        const stream = response.Body as NodeJS.ReadableStream;
        const writeStream = fs.createWriteStream(tempPath);
        
        await new Promise((resolve, reject) => {
          stream.pipe(writeStream);
          stream.on('end', resolve);
          stream.on('error', reject);
        });
      }

      return tempPath;
    } else {
      return path.join(this.uploadDir, fileName);
    }
  }

  /**
   * Delete video file
   */
  async deleteVideo(fileName: string): Promise<void> {
    if (this.storageProvider === 's3') {
      if (!this.s3Client || !this.s3Bucket) {
        throw new Error('S3 client not initialized');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.s3Bucket,
        Key: `${this.s3Prefix}${fileName}`,
      });

      await this.s3Client.send(command);
    } else {
      const filePath = path.join(this.uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  }

  /**
   * Get storage info
   */
  getStorageInfo() {
    return {
      provider: this.storageProvider,
      maxSizeMB: this.maxSizeMB,
      allowedFormats: this.allowedFormats,
      uploadDir: this.storageProvider === 'local' ? this.uploadDir : undefined,
      s3Bucket: this.storageProvider === 's3' ? this.s3Bucket : undefined,
    };
  }
}

export default new VideoStorageService();
