/**
 * Authentication API Routes
 * Handles user registration, login, logout, and session management
 */

import { Router, Request, Response } from 'express';
import DatabaseManager from './database/DatabaseManager';
import crypto from 'crypto';

class AuthAPI {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/signup', this.signup.bind(this));
    this.router.post('/login', this.login.bind(this));
    this.router.post('/logout', this.logout.bind(this));
    this.router.get('/me', this.getCurrentUser.bind(this));
    this.router.post('/refresh', this.refreshToken.bind(this));
  }

  /**
   * Generate a random secure token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get expiration date (24 hours from now)
   */
  private getExpirationDate(): Date {
    const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS || '24');
    const date = new Date();
    date.setHours(date.getHours() + expiryHours);
    return date;
  }

  /**
   * Extract token from Authorization header or cookie
   */
  private extractToken(req: Request): string | null {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const authCookie = cookies.find(c => c.startsWith('auth_token='));
      if (authCookie) {
        return authCookie.substring('auth_token='.length);
      }
    }

    return null;
  }

  /**
   * POST /api/auth/signup
   * Register a new user
   */
  private async signup(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, role = 'coach' } = req.body;

      // Validate required fields
      if (!email || !password || !name) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ success: false, error: 'Invalid email format' });
        return;
      }

      // Validate password length
      if (password.length < 6) {
        res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        return;
      }

      // Check if user already exists
      const existingUser = await DatabaseManager.findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ success: false, error: 'Email already registered' });
        return;
      }

      // Create new user
      const user = await DatabaseManager.createUser(email, password, name, role);

      // Create session
      const token = this.generateToken();
      await DatabaseManager.createSession(token, user.id, this.getExpirationDate());

      // Set cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      // Return user data
      res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          coachId: user.role === 'coach' ? user.id : undefined
        }
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Missing required fields' });
        return;
      }

      // Verify credentials
      const user = await DatabaseManager.verifyPassword(email, password);
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      // Create session
      const token = this.generateToken();
      await DatabaseManager.createSession(token, user.id, this.getExpirationDate());

      // Set cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      // Return user data
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          coachId: user.role === 'coach' ? user.id : undefined
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout current user
   */
  private async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (token) {
        await DatabaseManager.deleteSession(token);
      }

      // Clear cookie
      res.clearCookie('auth_token', { path: '/' });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  private async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const session = await DatabaseManager.findSession(token);

      if (!session) {
        res.status(401).json({ success: false, error: 'Invalid or expired session' });
        return;
      }

      const user = await DatabaseManager.findUserById(session.user_id);

      if (!user) {
        res.status(401).json({ success: false, error: 'User not found' });
        return;
      }

      // Return user data
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        coachId: user.role === 'coach' ? user.id : undefined
      });
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/refresh
   * Refresh authentication token
   */
  private async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const session = await DatabaseManager.findSession(token);

      if (!session) {
        res.status(401).json({ success: false, error: 'Invalid or expired session' });
        return;
      }

      const user = await DatabaseManager.findUserById(session.user_id);

      if (!user) {
        res.status(401).json({ success: false, error: 'User not found' });
        return;
      }

      // Delete old session and create new one
      await DatabaseManager.deleteSession(token);
      const newToken = this.generateToken();
      await DatabaseManager.createSession(newToken, user.id, this.getExpirationDate());

      // Set new cookie
      res.cookie('auth_token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      // Return user data
      res.json({
        success: true,
        token: newToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * Get the router instance
   */
  getRouter(): Router {
    return this.router;
  }
}

export default new AuthAPI();

