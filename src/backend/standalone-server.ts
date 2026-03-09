/**
 * Standalone Backend Server
 * Minimal Express server for coach dashboard without React Native dependencies
 */

// IMPORTANT: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Load .env from src/backend directory
const envPath = path.join(__dirname, '.env');
console.log(`📋 Loading environment from: ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
} else {
  console.log(`✅ Loaded ${Object.keys(result.parsed || {}).length} environment variables`);
}

// Now import everything else AFTER environment is loaded
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import AuthAPI from './AuthAPI';
import CoachDashboardAPI from './CoachDashboardAPI';
import VideoUploadAPI from './VideoUploadAPI';
import DrillsAPI from './DrillsAPI';
import DatabaseManager from './database/DatabaseManager';

const app: Express = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

// Middleware
app.use(cors({
  origin: frontendUrl, // Frontend URL - must be specific for credentials
  credentials: true // Allow cookies
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount authentication API routes
app.use('/api/auth', AuthAPI.getRouter());

// Mount coach dashboard API routes
app.use('/api/coach', CoachDashboardAPI.getRouter());

// Mount video upload and analysis API routes
app.use('/api/video', VideoUploadAPI.getRouter());

// Mount drill recommendations API routes
app.use('/api/drills', DrillsAPI);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    // Initialize database connection
    console.log('🔌 Connecting to database...');
    await DatabaseManager.initialize();
    console.log('✅ Database connected successfully');
    
    // Clean up expired sessions periodically (every hour)
    // Temporarily disabled to avoid DNS resolution issues
    // setInterval(async () => {
    //   try {
    //     await DatabaseManager.cleanupExpiredSessions();
    //     console.log('🧹 Cleaned up expired sessions');
    //   } catch (error: any) {
    //     // Don't crash the server if cleanup fails
    //     console.error('⚠️  Session cleanup failed (non-critical):', error.message);
    //   }
    // }, 60 * 60 * 1000); // 1 hour

    // Start listening
    app.listen(port, () => {
      console.log('');
      console.log('🚀 ================================');
      console.log(`✅ Server running on port ${port}`);
      console.log('🚀 ================================');
      console.log('');
      console.log(`📍 Health check:  http://localhost:${port}/health`);
      console.log(`🔐 Auth API:      http://localhost:${port}/api/auth`);
      console.log(`📊 Coach API:     http://localhost:${port}/api/coach`);
      console.log(`🌐 Frontend URL:  ${frontendUrl}`);
      console.log('');
      console.log('Press Ctrl+C to stop the server');
      console.log('');
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. Database connection details in .env file');
    console.error('2. Database is running and accessible');
    console.error('3. Network/firewall settings');
    console.error('');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await DatabaseManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await DatabaseManager.close();
  process.exit(0);
});

// Start the server
startServer();
