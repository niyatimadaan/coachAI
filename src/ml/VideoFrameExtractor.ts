/**
 * Video Frame Extractor
 * Extracts frames from video files as buffers for SageMaker pose detection
 */

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface FrameExtractionOptions {
  fps?: number; // Frames per second to extract (default: 10)
  maxFrames?: number; // Maximum number of frames (default: 20)
  format?: 'jpg' | 'png'; // Output format (default: jpg)
  quality?: number; // Quality 1-100 for jpg (default: 85)
}

/**
 * Extract video frames as buffers using FFmpeg
 */
export async function extractFramesAsBuffers(
  videoPath: string,
  options: FrameExtractionOptions = {}
): Promise<Buffer[]> {
  const {
    fps = 10,
    maxFrames = 20,
    format = 'jpg',
    quality = 85,
  } = options;

  console.log(`Extracting frames from: ${videoPath} at ${fps} fps (max ${maxFrames} frames)`);

  // Create temp directory for frames
  const tempDir = path.join('./uploads/temp', `frames-${Date.now()}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const outputPattern = path.join(tempDir, `frame-%04d.${format}`);

  // Build FFmpeg command
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  const args = [
    '-i', videoPath,
    '-vf', `fps=${fps}`,
    '-frames:v', maxFrames.toString(),
    '-q:v', Math.floor((100 - quality) / 10).toString(), // Convert quality to FFmpeg scale
    outputPattern,
  ];

  try {
    // Execute FFmpeg
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = child_process.spawn(ffmpegPath, args);

      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`));
      });
    });

    // Read frames into buffers
    const frameFiles = fs.readdirSync(tempDir)
      .filter(file => file.startsWith('frame-'))
      .sort();

    const frameBuffers: Buffer[] = [];
    for (const file of frameFiles) {
      const filePath = path.join(tempDir, file);
      const buffer = fs.readFileSync(filePath);
      frameBuffers.push(buffer);
    }

    // Clean up temp files
    for (const file of frameFiles) {
      fs.unlinkSync(path.join(tempDir, file));
    }
    fs.rmdirSync(tempDir);

    console.log(`✅ Extracted ${frameBuffers.length} frames as buffers`);
    return frameBuffers;

  } catch (error) {
    // Clean up on error
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    throw error;
  }
}

/**
 * Check if FFmpeg is available
 */
export function isFFmpegAvailable(): boolean {
  try {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const result = child_process.spawnSync(ffmpegPath, ['-version']);
    return result.status === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get video metadata using FFprobe
 */
export async function getVideoMetadata(videoPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> {
  const ffprobePath = process.env.FFPROBE_PATH || 'ffprobe';
  
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      videoPath,
    ];

    const ffprobe = child_process.spawn(ffprobePath, args);
    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFprobe failed: ${stderr}`));
        return;
      }

      try {
        const metadata = JSON.parse(stdout);
        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        // Parse frame rate (can be in format like "30/1")
        const fpsStr = videoStream.r_frame_rate || '30/1';
        const [num, den] = fpsStr.split('/').map(Number);
        const fps = num / (den || 1);

        resolve({
          duration: parseFloat(metadata.format.duration || '0'),
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: Math.round(fps),
        });
      } catch (error) {
        reject(new Error(`Failed to parse video metadata: ${error}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`Failed to start FFprobe: ${error.message}`));
    });
  });
}
