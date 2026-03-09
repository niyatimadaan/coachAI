/**
 * AWS S3 Storage Service
 * Handles video upload, storage, and retrieval from AWS S3
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export interface UploadResult {
  videoId: string;
  s3Key: string;
  s3Url: string;
  bucket: string;
  size: number;
  contentType: string;
}

export interface DownloadResult {
  stream: Readable;
  contentType: string;
  contentLength: number;
}

class S3StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private videoPrefix: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.AWS_S3_BUCKET || 'coachai-videos';
    this.videoPrefix = process.env.AWS_S3_VIDEO_PREFIX || 'videos/';

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Upload video file to S3
   */
  async uploadVideo(
    filePath: string, 
    videoId: string, 
    userId: string,
    contentType: string = 'video/mp4'
  ): Promise<UploadResult> {
    try {
      const fileStream = fs.createReadStream(filePath);
      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(fileName);
      
      // Create S3 key: videos/{userId}/{videoId}{extension}
      const s3Key = `${this.videoPrefix}${userId}/${videoId}${extension}`;

      console.log(`Uploading video to S3: ${s3Key}`);

      // Use multipart upload for large files
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: s3Key,
          Body: fileStream,
          ContentType: contentType,
          Metadata: {
            videoId,
            userId,
            uploadDate: new Date().toISOString(),
          },
        },
      });

      // Monitor upload progress
      upload.on('httpUploadProgress', (progress) => {
        const percentage = progress.loaded && progress.total 
          ? Math.round((progress.loaded / progress.total) * 100)
          : 0;
        console.log(`Upload progress: ${percentage}%`);
      });

      await upload.done();

      const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;

      console.log(`Video uploaded successfully: ${s3Url}`);

      return {
        videoId,
        s3Key,
        s3Url,
        bucket: this.bucket,
        size: stats.size,
        contentType,
      };
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload video to S3: ${error}`);
    }
  }

  /**
   * Upload generic file to S3 (for images, annotations, etc.)
   */
  async uploadFile(
    filePath: string,
    s3Key: string,
    contentType: string = 'application/octet-stream'
  ): Promise<{ s3Key: string; s3Url: string }> {
    try {
      const fileStream = fs.createReadStream(filePath);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: fileStream,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
      console.log(`File uploaded successfully: ${s3Url}`);

      return { s3Key, s3Url };
    } catch (error) {
      console.error('S3 file upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error}`);
    }
  }

  /**
   * Download video from S3 as stream
   */
  async downloadVideo(s3Key: string): Promise<DownloadResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      return {
        stream: response.Body as Readable,
        contentType: response.ContentType || 'video/mp4',
        contentLength: response.ContentLength || 0,
      };
    } catch (error) {
      console.error('S3 download error:', error);
      throw new Error(`Failed to download video from S3: ${error}`);
    }
  }

  /**
   * Download video to local file
   */
  async downloadVideoToFile(s3Key: string, destinationPath: string): Promise<void> {
    try {
      const { stream } = await this.downloadVideo(s3Key);
      const writeStream = fs.createWriteStream(destinationPath);

      return new Promise((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    } catch (error) {
      console.error('S3 download to file error:', error);
      throw new Error(`Failed to download video to file: ${error}`);
    }
  }

  /**
   * Get signed URL for temporary video access
   */
  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        ResponseContentType: 'video/mp4',
        ResponseContentDisposition: 'inline',
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      // Log URL for debugging (only first part for security)
      const urlParts = signedUrl.split('?');
      console.log(`   Generated URL: ${urlParts[0]}?[...signed params]`);
      
      return signedUrl;
    } catch (error) {
      console.error('S3 signed URL error:', error);
      throw new Error(`Failed to generate signed URL: ${error}`);
    }
  }

  /**
   * Delete video from S3
   */
  async deleteVideo(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      console.log(`Video deleted from S3: ${s3Key}`);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete video from S3: ${error}`);
    }
  }

  /**
   * Check if video exists in S3
   */
  async videoExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(s3Key: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);
      
      return {
        size: response.ContentLength,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      console.error('S3 metadata error:', error);
      throw new Error(`Failed to get video metadata: ${error}`);
    }
  }
}

export default new S3StorageService();
