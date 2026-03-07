/**
 * Security Manager
 * Handles data encryption for transmission and secure storage
 */

import PrivacyManager from './PrivacyManager';
import ErrorHandler, { ErrorCategory } from './ErrorHandler';

/**
 * Encryption result
 */
export interface EncryptionResult {
  encryptedData: string;
  iv: string; // Initialization vector
  tag?: string; // Authentication tag for GCM mode
}

/**
 * Secure transmission payload
 */
export interface SecurePayload {
  data: string;
  signature: string;
  timestamp: number;
  userId: string;
}

/**
 * Security Manager class
 */
class SecurityManager {
  private readonly ENCRYPTION_KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly SALT_LENGTH = 32;

  /**
   * Encrypt data for secure transmission
   */
  async encryptForTransmission(
    data: any,
    userId: string
  ): Promise<EncryptionResult> {
    try {
      console.log('Encrypting data for transmission...');

      // Convert data to JSON string
      const jsonData = JSON.stringify(data);

      // Generate encryption key
      const salt = this.generateSalt();
      const key = await PrivacyManager.generateEncryptionKey(userId, salt);

      // Generate IV
      const iv = this.generateIV();

      // Encrypt data
      const encryptedData = await PrivacyManager.encryptData(jsonData, key);

      return {
        encryptedData,
        iv,
        tag: this.generateAuthTag(encryptedData),
      };
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN, {
        operation: 'encrypt_transmission',
        userId,
      });
      throw new Error('Encryption for transmission failed');
    }
  }

  /**
   * Decrypt data received from transmission
   */
  async decryptFromTransmission(
    encryptionResult: EncryptionResult,
    userId: string
  ): Promise<any> {
    try {
      console.log('Decrypting received data...');

      // Verify authentication tag
      if (encryptionResult.tag) {
        const expectedTag = this.generateAuthTag(encryptionResult.encryptedData);
        if (expectedTag !== encryptionResult.tag) {
          throw new Error('Authentication tag verification failed');
        }
      }

      // Generate decryption key
      const salt = this.generateSalt(); // In production, salt should be transmitted
      const key = await PrivacyManager.generateEncryptionKey(userId, salt);

      // Decrypt data
      const decryptedJson = await PrivacyManager.decryptData(
        encryptionResult.encryptedData,
        key
      );

      // Parse JSON
      return JSON.parse(decryptedJson);
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN, {
        operation: 'decrypt_transmission',
        userId,
      });
      throw new Error('Decryption from transmission failed');
    }
  }

  /**
   * Create secure payload for API transmission
   */
  async createSecurePayload(
    data: any,
    userId: string
  ): Promise<SecurePayload> {
    try {
      // Encrypt data
      const encrypted = await this.encryptForTransmission(data, userId);

      // Create signature
      const signature = this.signData(encrypted.encryptedData, userId);

      return {
        data: encrypted.encryptedData,
        signature,
        timestamp: Date.now(),
        userId,
      };
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN, {
        operation: 'create_secure_payload',
        userId,
      });
      throw new Error('Failed to create secure payload');
    }
  }

  /**
   * Verify and extract secure payload
   */
  async verifySecurePayload(
    payload: SecurePayload
  ): Promise<{ valid: boolean; data?: any }> {
    try {
      // Verify timestamp (reject if older than 5 minutes)
      const age = Date.now() - payload.timestamp;
      if (age > 5 * 60 * 1000) {
        console.warn('Payload timestamp too old');
        return { valid: false };
      }

      // Verify signature
      const expectedSignature = this.signData(payload.data, payload.userId);
      if (expectedSignature !== payload.signature) {
        console.warn('Payload signature verification failed');
        return { valid: false };
      }

      // Decrypt data
      const decrypted = await this.decryptFromTransmission(
        { encryptedData: payload.data, iv: '', tag: '' },
        payload.userId
      );

      return { valid: true, data: decrypted };
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.UNKNOWN, {
        operation: 'verify_secure_payload',
      });
      return { valid: false };
    }
  }

  /**
   * Encrypt sensitive data for local storage
   */
  async encryptForStorage(data: any, userId: string): Promise<string> {
    try {
      const jsonData = JSON.stringify(data);
      const salt = this.generateSalt();
      const key = await PrivacyManager.generateEncryptionKey(userId, salt);
      
      return await PrivacyManager.encryptData(jsonData, key);
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE, {
        operation: 'encrypt_storage',
        userId,
      });
      throw new Error('Storage encryption failed');
    }
  }

  /**
   * Decrypt sensitive data from local storage
   */
  async decryptFromStorage(encryptedData: string, userId: string): Promise<any> {
    try {
      const salt = this.generateSalt();
      const key = await PrivacyManager.generateEncryptionKey(userId, salt);
      const decryptedJson = await PrivacyManager.decryptData(encryptedData, key);
      
      return JSON.parse(decryptedJson);
    } catch (error) {
      ErrorHandler.handleError(error, ErrorCategory.STORAGE, {
        operation: 'decrypt_storage',
        userId,
      });
      throw new Error('Storage decryption failed');
    }
  }

  /**
   * Generate cryptographically secure salt
   */
  private generateSalt(): string {
    // In production, use crypto.randomBytes or similar
    // For MVP, generate pseudo-random salt
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let salt = '';
    
    for (let i = 0; i < this.SALT_LENGTH; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return salt;
  }

  /**
   * Generate initialization vector
   */
  private generateIV(): string {
    // In production, use crypto.randomBytes
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let iv = '';
    
    for (let i = 0; i < this.IV_LENGTH; i++) {
      iv += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return iv;
  }

  /**
   * Generate authentication tag for GCM mode
   */
  private generateAuthTag(data: string): string {
    // In production, use proper HMAC or GCM authentication
    // For MVP, use simple hash
    let hash = 0;
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Sign data for integrity verification
   */
  private signData(data: string, userId: string): string {
    // In production, use HMAC-SHA256 or similar
    // For MVP, use simple hash with user ID
    const combined = `${data}:${userId}`;
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .trim();
  }

  /**
   * Validate API token
   */
  validateToken(token: string): boolean {
    // In production, verify JWT or similar
    // For MVP, basic validation
    return token.length > 0 && token.length < 1000;
  }

  /**
   * Generate secure session token
   */
  generateSessionToken(userId: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const combined = `${userId}:${timestamp}:${random}`;
    
    // In production, use proper JWT or similar
    return Buffer.from(combined).toString('base64');
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string, userId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split(':');
      
      if (parts.length !== 3) {
        return false;
      }
      
      const [tokenUserId, timestamp] = parts;
      
      // Verify user ID matches
      if (tokenUserId !== userId) {
        return false;
      }
      
      // Verify token age (24 hours max)
      const age = Date.now() - parseInt(timestamp);
      if (age > 24 * 60 * 60 * 1000) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Hash password for storage (if needed)
   */
  async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt or similar
    // For MVP, use simple hash (NOT SECURE - replace in production)
    const salt = this.generateSalt();
    const combined = `${password}:${salt}`;
    
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `${Math.abs(hash).toString(16)}:${salt}`;
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const [storedHash, salt] = hash.split(':');
      const combined = `${password}:${salt}`;
      
      let calculatedHash = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        calculatedHash = ((calculatedHash << 5) - calculatedHash) + char;
        calculatedHash = calculatedHash & calculatedHash;
      }
      
      return Math.abs(calculatedHash).toString(16) === storedHash;
    } catch (error) {
      return false;
    }
  }
}

export default new SecurityManager();
