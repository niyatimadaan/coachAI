/**
 * Coach Dashboard Backend Server
 * Express server for coach dashboard API endpoints
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import CoachDashboardAPI from './CoachDashboardAPI';
import ReportGenerator from './ReportGenerator';

class CoachDashboardServer {
  private app: Express;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS for all origins (configure as needed for production)
    this.app.use(cors());

    // Parse JSON request bodies
    this.app.use(bodyParser.json());

    // Parse URL-encoded request bodies
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Mount coach dashboard API routes
    this.app.use('/api/coach', CoachDashboardAPI.getRouter());

    // Report generation endpoints
    this.app.get('/api/reports/generate', this.generateReport.bind(this));
    this.app.get('/api/reports/admin-summary/:coachId', this.getAdminSummary.bind(this));

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      console.error('Server error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Generate report endpoint
   */
  private async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { coachId, format = 'json', timeframe = '30d', includeDetails = 'false' } = req.query;

      if (!coachId) {
        res.status(400).json({ error: 'coachId is required' });
        return;
      }

      if (format !== 'csv' && format !== 'json') {
        res.status(400).json({ error: 'format must be csv or json' });
        return;
      }

      if (timeframe !== '7d' && timeframe !== '30d' && timeframe !== '90d') {
        res.status(400).json({ error: 'timeframe must be 7d, 30d, or 90d' });
        return;
      }

      const report = await ReportGenerator.generateReport({
        coachId: coachId as string,
        format: format as 'csv' | 'json',
        timeframe: timeframe as '7d' | '30d' | '90d',
        includeDetails: includeDetails === 'true'
      });

      // Set appropriate content type
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="progress-report-${coachId}-${timeframe}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
      }

      res.send(report);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  /**
   * Get administrative summary endpoint
   */
  private async getAdminSummary(req: Request, res: Response): Promise<void> {
    try {
      const { coachId } = req.params;

      const summary = await ReportGenerator.generateAdminSummary(coachId);

      res.json({ success: true, summary });
    } catch (error) {
      console.error('Error generating admin summary:', error);
      res.status(500).json({ error: 'Failed to generate admin summary' });
    }
  }

  /**
   * Start the server
   */
  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Coach Dashboard API server running on port ${this.port}`);
      console.log(`Health check: http://localhost:${this.port}/health`);
      console.log(`API base URL: http://localhost:${this.port}/api/coach`);
    });
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Express {
    return this.app;
  }
}

// Start server if run directly
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const server = new CoachDashboardServer(port);
  server.start();
}

export default CoachDashboardServer;
