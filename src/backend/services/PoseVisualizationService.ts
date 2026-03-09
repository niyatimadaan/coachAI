/**
 * Pose Visualization Service
 * Generates annotated images showing detected pose and form issues using Canvas
 * Overlays skeleton on actual video frames with angle measurements
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  KeypointFrame,
  MajorJoint,
} from '../../ml/PoseEstimationEngine';
import { FormIssue } from '../../types/models';

const execAsync = promisify(exec);

// Try to load canvas
let canvas: any;
let canvasAvailable = false;
try {
  canvas = require('canvas');
  canvasAvailable = true;
  console.log('Canvas module loaded successfully for visualization');
} catch (error) {
  console.warn('Canvas module not available, using simplified visualization');
  canvasAvailable = false;
}

/**
 * Pose skeleton connections for drawing
 */
const SKELETON_CONNECTIONS = [
  // Torso
  [MajorJoint.LEFT_SHOULDER, MajorJoint.RIGHT_SHOULDER],
  [MajorJoint.LEFT_SHOULDER, MajorJoint.LEFT_HIP],
  [MajorJoint.RIGHT_SHOULDER, MajorJoint.RIGHT_HIP],
  [MajorJoint.LEFT_HIP, MajorJoint.RIGHT_HIP],
  
  // Right arm (shooting arm for right-handed)
  [MajorJoint.RIGHT_SHOULDER, MajorJoint.RIGHT_ELBOW],
  [MajorJoint.RIGHT_ELBOW, MajorJoint.RIGHT_WRIST],
  
  // Left arm
  [MajorJoint.LEFT_SHOULDER, MajorJoint.LEFT_ELBOW],
  [MajorJoint.LEFT_ELBOW, MajorJoint.LEFT_WRIST],
  
  // Legs
  [MajorJoint.LEFT_HIP, MajorJoint.LEFT_KNEE],
  [MajorJoint.LEFT_KNEE, MajorJoint.LEFT_ANKLE],
  [MajorJoint.RIGHT_HIP, MajorJoint.RIGHT_KNEE],
  [MajorJoint.RIGHT_KNEE, MajorJoint.RIGHT_ANKLE],
];

/**
 * Joint-to-issue mapping for highlighting
 */
const ISSUE_JOINT_MAP: { [key: string]: MajorJoint[] } = {
  elbow_flare: [MajorJoint.RIGHT_ELBOW, MajorJoint.RIGHT_SHOULDER, MajorJoint.RIGHT_WRIST],
  wrist_angle: [MajorJoint.RIGHT_WRIST, MajorJoint.RIGHT_ELBOW],
  shoulder_misalignment: [MajorJoint.LEFT_SHOULDER, MajorJoint.RIGHT_SHOULDER],
  stance_width: [MajorJoint.LEFT_ANKLE, MajorJoint.RIGHT_ANKLE, MajorJoint.LEFT_HIP, MajorJoint.RIGHT_HIP],
  follow_through: [MajorJoint.RIGHT_WRIST, MajorJoint.RIGHT_ELBOW, MajorJoint.RIGHT_SHOULDER],
  body_balance: [MajorJoint.LEFT_HIP, MajorJoint.RIGHT_HIP],
};

/**
 * Severity-based color mapping
 */
const SEVERITY_COLORS: { [key: string]: { primary: string; secondary: string } } = {
  high: { primary: '#EF4444', secondary: '#FCA5A5' },
  medium: { primary: '#F59E0B', secondary: '#FCD34D' },
  low: { primary: '#3B82F6', secondary: '#93C5FD' },
};

export interface AnnotatedFrameResult {
  framePath: string;
  frameNumber: number;
  timestamp: number;
}

/**
 * Generate annotated frames showing pose and detected issues
 */
export class PoseVisualizationService {
  private outputDir: string;

  constructor(outputDir: string = 'uploads/annotated') {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Generate annotated frames from keypoint data and detected issues
   * Returns paths to generated annotated frames (canvas-based if available, SVG fallback)
   */
  async generateAnnotatedFrames(
    videoPath: string,
    keypointFrames: KeypointFrame[],
    detectedIssues: FormIssue[],
    frameIndices: number[] = [0, Math.floor(keypointFrames.length / 2), keypointFrames.length - 1]
  ): Promise<AnnotatedFrameResult[]> {
    try {
      console.log(`Generating annotated frames for: ${videoPath}`);
      
      if (canvasAvailable) {
        // Use canvas-based rendering on actual video frames
        return await this.generateCanvasAnnotatedFrames(
          videoPath,
          keypointFrames,
          detectedIssues,
          frameIndices
        );
      } else {
        // Fallback to SVG
        return await this.generateSVGAnnotatedFrames(
          videoPath,
          keypointFrames,
          detectedIssues,
          frameIndices
        );
      }
    } catch (error) {
      console.error('Error generating annotated frames:', error);
      return [];
    }
  }

  /**
   * Generate canvas-based annotated frames overlaid on actual video frames
   */
  private async generateCanvasAnnotatedFrames(
    videoPath: string,
    keypointFrames: KeypointFrame[],
    detectedIssues: FormIssue[],
    frameIndices: number[]
  ): Promise<AnnotatedFrameResult[]> {
    const { createCanvas, loadImage } = canvas;
    const annotatedFrames: AnnotatedFrameResult[] = [];
    const phases = ['Preparation', 'Release', 'Follow-Through'];
    
    // Extract actual frames from video using ffmpeg
    const extractedFrames = await this.extractVideoFrames(videoPath, frameIndices);
    
    for (let i = 0; i < extractedFrames.length; i++) {
      const frameIndex = frameIndices[i];
      if (frameIndex >= keypointFrames.length) continue;
      
      const keypointFrame = keypointFrames[frameIndex];
      const frameImagePath = extractedFrames[i];
      
      try {
        // Load the actual video frame
        const img = await loadImage(frameImagePath);
        const cvs = createCanvas(img.width, img.height);
        const ctx = cvs.getContext('2d');
        
        // Draw original frame as background
        ctx.drawImage(img, 0, 0);
        
        // Add semi-transparent overlay for better visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        
        // Get issue joints
        const issueJoints = this.getIssueJoints(detectedIssues);
        
        // Draw skeleton with angles
        this.drawSkeletonWithAngles(ctx, keypointFrame, issueJoints, cvs.width, cvs.height);
        
        // Draw keypoints
        this.drawKeypoints(ctx, keypointFrame, issueJoints, cvs.width, cvs.height);
        
        // Draw header
        this.drawHeader(ctx, phases[i] || `Frame ${frameIndex}`, cvs.width);
        
        // Draw issue legend
        this.drawIssueLegend(ctx, detectedIssues, cvs.width);
        
        // Save annotated frame
        const outputPath = path.join(
          this.outputDir,
          `annotated-${uuidv4()}-frame${frameIndex}.jpg`
        );
        const buffer = cvs.toBuffer('image/jpeg', { quality: 0.92 });
        fs.writeFileSync(outputPath, buffer);
        
        annotatedFrames.push({
          framePath: outputPath,
          frameNumber: frameIndex,
          timestamp: keypointFrame.timestamp,
        });
        
        // Clean up extracted frame
        if (fs.existsSync(frameImagePath)) {
          fs.unlinkSync(frameImagePath);
        }
      } catch (error) {
        console.error(`Error annotating frame ${frameIndex}:`, error);
      }
    }
    
    console.log(`Generated ${annotatedFrames.length} canvas-based annotated frames`);
    return annotatedFrames;
  }

  /**
   * Extract specific frames from video using ffmpeg
   */
  private async extractVideoFrames(
    videoPath: string,
    frameIndices: number[]
  ): Promise<string[]> {
    const extractedFrames: string[] = [];
    
    // Check if ffmpeg is available
    try {
      await execAsync('ffmpeg -version');
    } catch (error) {
      console.warn('ffmpeg not available, using placeholder frames');
      return this.createPlaceholderFrames(frameIndices);
    }
    
    for (const frameIndex of frameIndices) {
      const outputPath = path.join(
        'uploads/temp',
        `frame-${uuidv4()}-${frameIndex}.jpg`
      );
      
      try {
        // Extract frame at specific index
        const command = `ffmpeg -i "${videoPath}" -vf "select=eq(n\\,${frameIndex})" -vframes 1 "${outputPath}" -y`;
        await execAsync(command);
        
        if (fs.existsSync(outputPath)) {
          extractedFrames.push(outputPath);
        } else {
          console.warn(`Failed to extract frame ${frameIndex}, using placeholder`);
          extractedFrames.push(await this.createSinglePlaceholderFrame(frameIndex));
        }
      } catch (error) {
        console.error(`Error extracting frame ${frameIndex}:`, error);
        extractedFrames.push(await this.createSinglePlaceholderFrame(frameIndex));
      }
    }
    
    return extractedFrames;
  }

  /**
   * Create placeholder frames when ffmpeg is not available
   */
  private async createPlaceholderFrames(frameIndices: number[]): Promise<string[]> {
    const { createCanvas } = canvas;
    const frames: string[] = [];
    
    for (const index of frameIndices) {
      frames.push(await this.createSinglePlaceholderFrame(index));
    }
    
    return frames;
  }

  /**
   * Create a single placeholder frame
   */
  private async createSinglePlaceholderFrame(frameIndex: number): Promise<string> {
    const { createCanvas } = canvas;
    const cvs = createCanvas(640, 480);
    const ctx = cvs.getContext('2d');
    
    // Dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 640, 480);
    
    // Grid pattern
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let i = 0; i < 640; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 480);
      ctx.stroke();
    }
    for (let i = 0; i < 480; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(640, i);
      ctx.stroke();
    }
    
    // Frame info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Frame ${frameIndex}`, 320, 240);
    
    const framePath = path.join('uploads/temp', `placeholder-${uuidv4()}-${frameIndex}.jpg`);
    const buffer = cvs.toBuffer('image/jpeg');
    fs.writeFileSync(framePath, buffer);
    
    return framePath;
  }

  /**
   * Draw skeleton with angle annotations
   */
  private drawSkeletonWithAngles(
    ctx: any,
    keypointFrame: KeypointFrame,
    issueJoints: Set<MajorJoint>,
    width: number,
    height: number
  ): void {
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    
    // Draw connections
    for (const [joint1, joint2] of SKELETON_CONNECTIONS) {
      const kp1 = keypointFrame.keypoints.get(joint1);
      const kp2 = keypointFrame.keypoints.get(joint2);
      
      if (!kp1 || !kp2 || kp1.visibility < 0.3 || kp2.visibility < 0.3) continue;
      
      const x1 = kp1.x * width;
      const y1 = kp1.y * height;
      const x2 = kp2.x * width;
      const y2 = kp2.y * height;
      
      const hasIssue = issueJoints.has(joint1) || issueJoints.has(joint2);
      
      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = hasIssue ? '#EF4444' : '#10B981';
      ctx.strokeStyle = hasIssue ? '#EF4444' : '#10B981';
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Draw key angles
    this.drawAngles(ctx, keypointFrame, width, height);
  }

  /**
   * Draw angle measurements for key joints
   */
  private drawAngles(
    ctx: any,
    keypointFrame: KeypointFrame,
    width: number,
    height: number
  ): void {
    // Elbow angle (right arm)
    const shoulder = keypointFrame.keypoints.get(MajorJoint.RIGHT_SHOULDER);
    const elbow = keypointFrame.keypoints.get(MajorJoint.RIGHT_ELBOW);
    const wrist = keypointFrame.keypoints.get(MajorJoint.RIGHT_WRIST);
    
    if (shoulder && elbow && wrist && 
        shoulder.visibility > 0.3 && elbow.visibility > 0.3 && wrist.visibility > 0.3) {
      const elbowAngle = this.calculateAngle(
        { x: shoulder.x * width, y: shoulder.y * height },
        { x: elbow.x * width, y: elbow.y * height },
        { x: wrist.x * width, y: wrist.y * height }
      );
      
      this.drawAngleArc(
        ctx,
        elbow.x * width,
        elbow.y * height,
        elbowAngle,
        'Elbow: '
      );
    }
    
    // Wrist angle
    if (elbow && wrist && elbow.visibility > 0.3 && wrist.visibility > 0.3) {
      const wristAngle = Math.abs((wrist.y - elbow.y) * height);
      const ex = elbow.x * width;
      const ey = elbow.y * height;
      const wx = wrist.x * width;
      const wy = wrist.y * height;
      
      const angle = Math.atan2(wy - ey, wx - ex) * (180 / Math.PI);
      
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(`Wrist: ${Math.abs(angle).toFixed(1)}°`, wx + 15, wy - 10);
      ctx.fillText(`Wrist: ${Math.abs(angle).toFixed(1)}°`, wx + 15, wy - 10);
    }
  }

  /**
   * Draw angle arc with label
   */
  private drawAngleArc(
    ctx: any,
    x: number,
    y: number,
    angle: number,
    label: string
  ): void {
    const radius = 30;
    
    // Draw arc
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, (angle * Math.PI) / 180);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw angle text
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeText(`${label}${angle.toFixed(1)}°`, x + radius + 10, y - 10);
    ctx.fillText(`${label}${angle.toFixed(1)}°`, x + radius + 10, y - 10);
  }

  /**
   * Calculate angle between three points
   */
  private calculateAngle(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p3: { x: number; y: number }
  ): number {
    const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                    Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs(radians * (180 / Math.PI));
    
    if (angle > 180) {
      angle = 360 - angle;
    }
    
    return angle;
  }

  /**
   * Draw keypoints as circles
   */
  private drawKeypoints(
    ctx: any,
    keypointFrame: KeypointFrame,
    issueJoints: Set<MajorJoint>,
    width: number,
    height: number
  ): void {
    keypointFrame.keypoints.forEach((keypoint, joint) => {
      if (keypoint.visibility < 0.3) return;
      
      const x = keypoint.x * width;
      const y = keypoint.y * height;
      const hasIssue = issueJoints.has(joint);
      
      // Outer glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = hasIssue ? '#EF4444' : '#10B981';
      
      // Outer circle
      ctx.beginPath();
      ctx.arc(x, y, hasIssue ? 12 : 8, 0, 2 * Math.PI);
      ctx.fillStyle = hasIssue ? '#EF4444' : '#10B981';
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Inner circle
      ctx.beginPath();
      ctx.arc(x, y, hasIssue ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      // Warning icon for issues
      if (hasIssue) {
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('!', x, y + 25);
      }
    });
    
    ctx.textAlign = 'left'; // Reset
  }

  /**
   * Draw header with branding and phase
   */
  private drawHeader(ctx: any, phase: string, width: number): void {
    // Header background with gradient
    const gradient = ctx.createLinearGradient(0, 0, width, 60);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, 70);
    
    // Title
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🏀 CoachAI Form Analysis', 20, 45);
    
    // Phase badge
    ctx.font = 'bold 18px Arial';
    const phaseWidth = ctx.measureText(phase).width + 30;
    ctx.fillStyle = '#10B981';
    ctx.fillRect(width - phaseWidth - 20, 20, phaseWidth, 35);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(phase, width - phaseWidth - 5, 45);
  }

  /**
   * Draw issue legend box
   */
  private drawIssueLegend(ctx: any, detectedIssues: FormIssue[], width: number): void {
    if (detectedIssues.length === 0) return;
    
    const x = 20;
    const y = 90;
    const boxWidth = Math.min(400, width - 40);
    const boxHeight = 50 + detectedIssues.slice(0, 5).length * 30;
    
    // Background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + boxHeight);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, boxWidth, boxHeight);
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxWidth, boxHeight);
    
    // Title
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚠️ Detected Form Issues:', x + 15, y + 30);
    
    // Issues
    let yOffset = y + 55;
    for (const issue of detectedIssues.slice(0, 5)) {
      const color = SEVERITY_COLORS[issue.severity]?.primary || '#3B82F6';
      
      // Severity dot
      ctx.beginPath();
      ctx.arc(x + 20, yOffset - 4, 7, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      
      // Issue text
      ctx.font = '15px Arial';
      ctx.fillStyle = '#ffffff';
      const issueText = this.formatIssueType(issue.type);
      ctx.fillText(issueText, x + 35, yOffset);
      
      yOffset += 30;
    }
  }

  /**
   * SVG fallback when canvas is not available
   */
  private async generateSVGAnnotatedFrames(
    videoPath: string,
    keypointFrames: KeypointFrame[],
    detectedIssues: FormIssue[],
    frameIndices: number[]
  ): Promise<AnnotatedFrameResult[]> {
    try {
      console.log('Using SVG-based visualization (canvas not available)');
      
      const annotatedFrames: AnnotatedFrameResult[] = [];
      const phases = ['Preparation', 'Release', 'Follow-Through'];
      
      for (let i = 0; i < frameIndices.length; i++) {
        const frameIndex = frameIndices[i];
        if (frameIndex >= keypointFrames.length) continue;
        
        const keypointFrame = keypointFrames[frameIndex];
        
        // Generate SVG-based annotated frame
        const svgContent = this.generateSVGAnnotation(
          keypointFrame,
          detectedIssues,
          phases[i] || `Frame ${frameIndex}`
        );
        
        const framePath = path.join(
          this.outputDir,
          `annotated-${uuidv4()}-frame${frameIndex}.svg`
        );
        
        fs.writeFileSync(framePath, svgContent);
        
        annotatedFrames.push({
          framePath,
          frameNumber: frameIndex,
          timestamp: keypointFrame.timestamp,
        });
      }
      
      console.log(`Generated ${annotatedFrames.length} SVG annotation frames`);
      return annotatedFrames;
      
    } catch (error) {
      console.error('Error generating SVG annotated frames:', error);
      return [];
    }
  }

  /**
   * Generate SVG-based annotation showing pose skeleton and issues
   */
  private generateSVGAnnotation(
    keypointFrame: KeypointFrame,
    detectedIssues: FormIssue[],
    phase: string
  ): string {
    const width = 640;
    const height = 480;
    
    // Get issue joints for highlighting
    const issueJoints = this.getIssueJoints(detectedIssues);
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#1a1a1a"/>
  
  <!-- Header -->
  <rect width="${width}" height="60" fill="rgba(0,0,0,0.8)"/>
  <text x="20" y="35" font-family="Arial" font-size="24" font-weight="bold" fill="#ffffff">
    CoachAI Form Analysis
  </text>
  <text x="${width - 120}" y="35" font-family="Arial" font-size="16" fill="#10B981">
    ${phase}
  </text>
  
  <!-- Pose Skeleton -->`;
    
    // Draw skeleton connections
    for (const [joint1, joint2] of SKELETON_CONNECTIONS) {
      const kp1 = keypointFrame.keypoints.get(joint1);
      const kp2 = keypointFrame.keypoints.get(joint2);
      
      if (!kp1 || !kp2 || kp1.visibility < 0.3 || kp2.visibility < 0.3) continue;
      
      const x1 = kp1.x * width;
      const y1 = kp1.y * height;
      const x2 = kp2.x * width;
      const y2 = kp2.y * height;
      
      const hasIssue = issueJoints.has(joint1) || issueJoints.has(joint2);
      const color = hasIssue ? '#EF4444' : '#10B981';
      
      svg += `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3"/>`;
    }
    
    svg += `
  
  <!-- Keypoints -->`;
    
    // Draw keypoints
    keypointFrame.keypoints.forEach((keypoint, joint) => {
      if (keypoint.visibility < 0.3) return;
      
      const x = keypoint.x * width;
      const y = keypoint.y * height;
      const hasIssue = issueJoints.has(joint);
      const color = hasIssue ? '#EF4444' : '#10B981';
      const radius = hasIssue ? 10 : 6;
      
      svg += `
  <circle cx="${x}" cy="${y}" r="${radius}" fill="${color}"/>
  <circle cx="${x}" cy="${y}" r="${radius / 2}" fill="#ffffff"/>`;
    });
    
    svg += `
  
  <!-- Issue Legend -->
  <rect x="20" y="80" width="350" height="${40 + detectedIssues.length * 25}" fill="rgba(0,0,0,0.8)"/>
  <text x="30" y="105" font-family="Arial" font-size="16" font-weight="bold" fill="#ffffff">
    Detected Form Issues:
  </text>`;
    
    // Draw issue list
    let yOffset = 125;
    for (const issue of detectedIssues.slice(0, 5)) {
      const color = SEVERITY_COLORS[issue.severity]?.primary || '#3B82F6';
      const issueText = this.formatIssueType(issue.type);
      
      svg += `
  <circle cx="40" cy="${yOffset}" r="6" fill="${color}"/>
  <text x="55" y="${yOffset + 5}" font-family="Arial" font-size="14" fill="#ffffff">
    ${issueText}
  </text>`;
      yOffset += 25;
    }
    
    svg += `
</svg>`;
    
    return svg;
  }

  /**
   * Get set of joints that have detected issues
   */
  private getIssueJoints(detectedIssues: FormIssue[]): Set<MajorJoint> {
    const issueJoints = new Set<MajorJoint>();
    
    for (const issue of detectedIssues) {
      const joints = ISSUE_JOINT_MAP[issue.type];
      if (joints) {
        joints.forEach((joint) => issueJoints.add(joint));
      }
    }
    
    return issueJoints;
  }

  /**
   * Format issue type for display
   */
  private formatIssueType(issueType: string): string {
    return issueType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Clean up generated files
   */
  cleanupAnnotatedFrames(framePaths: string[]): void {
    for (const framePath of framePaths) {
      if (fs.existsSync(framePath)) {
        fs.unlinkSync(framePath);
      }
    }
  }
}
