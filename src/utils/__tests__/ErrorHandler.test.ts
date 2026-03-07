/**
 * Error Handler Tests
 * Tests for error handling, classification, and user messaging
 */

import ErrorHandler, {
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  AppError,
} from '../ErrorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.clearErrorLog();
  });

  describe('Error Classification', () => {
    it('should classify camera errors correctly', () => {
      const error = new Error('Camera access denied');
      const context = ErrorHandler.handleError(error, ErrorCategory.CAMERA);

      expect(context.category).toBe(ErrorCategory.CAMERA);
      expect(context.severity).toBe(ErrorSeverity.HIGH);
      expect(context.recoveryStrategy).toBe(RecoveryStrategy.USER_ACTION);
    });

    it('should classify storage errors as critical', () => {
      const error = new Error('Storage full');
      const context = ErrorHandler.handleError(error, ErrorCategory.STORAGE);

      expect(context.category).toBe(ErrorCategory.STORAGE);
      expect(context.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should classify network errors as low severity', () => {
      const error = new Error('Network timeout');
      const context = ErrorHandler.handleError(error, ErrorCategory.NETWORK);

      expect(context.category).toBe(ErrorCategory.NETWORK);
      expect(context.severity).toBe(ErrorSeverity.LOW);
      expect(context.recoveryStrategy).toBe(RecoveryStrategy.FALLBACK);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide clear camera error message', () => {
      const error = new Error('Camera unavailable');
      const context = ErrorHandler.handleError(error, ErrorCategory.CAMERA);

      expect(context.userInfo.title).toBe('Camera Issue');
      expect(context.userInfo.message).toContain('camera');
      expect(context.userInfo.message).not.toContain('technical');
      expect(context.userInfo.actionText).toBe('Open Settings');
    });

    it('should provide clear storage error message', () => {
      const error = new Error('ENOSPC');
      const context = ErrorHandler.handleError(error, ErrorCategory.STORAGE);

      expect(context.userInfo.title).toBe('Storage Full');
      expect(context.userInfo.message).toContain('storage');
      expect(context.userInfo.dismissible).toBe(false);
    });

    it('should provide clear network error message', () => {
      const error = new Error('Network error');
      const context = ErrorHandler.handleError(error, ErrorCategory.NETWORK);

      expect(context.userInfo.title).toBe('No Connection');
      expect(context.userInfo.message).toContain('offline');
      expect(context.userInfo.message).toContain('sync');
    });
  });

  describe('AppError Handling', () => {
    it('should handle AppError with custom properties', () => {
      const appError = new AppError(
        'Custom error',
        ErrorCategory.ML_MODEL,
        ErrorSeverity.MEDIUM,
        RecoveryStrategy.FALLBACK,
        { modelName: 'pose-estimation' }
      );

      const context = ErrorHandler.handleError(appError, ErrorCategory.ML_MODEL);

      expect(context.severity).toBe(ErrorSeverity.MEDIUM);
      expect(context.recoveryStrategy).toBe(RecoveryStrategy.FALLBACK);
      expect(context.metadata).toEqual({ modelName: 'pose-estimation' });
    });
  });

  describe('Error Logging', () => {
    it('should log errors to internal log', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      ErrorHandler.handleError(error1, ErrorCategory.CAMERA);
      ErrorHandler.handleError(error2, ErrorCategory.STORAGE);

      const log = ErrorHandler.getErrorLog();
      expect(log).toHaveLength(2);
      expect(log[0].category).toBe(ErrorCategory.CAMERA);
      expect(log[1].category).toBe(ErrorCategory.STORAGE);
    });

    it('should maintain log size limit', () => {
      // Add more than max log size (100)
      for (let i = 0; i < 150; i++) {
        ErrorHandler.handleError(new Error(`Error ${i}`), ErrorCategory.UNKNOWN);
      }

      const log = ErrorHandler.getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });

    it('should filter errors by category', () => {
      ErrorHandler.handleError(new Error('Camera error'), ErrorCategory.CAMERA);
      ErrorHandler.handleError(new Error('Storage error'), ErrorCategory.STORAGE);
      ErrorHandler.handleError(new Error('Another camera error'), ErrorCategory.CAMERA);

      const cameraErrors = ErrorHandler.getErrorsByCategory(ErrorCategory.CAMERA);
      expect(cameraErrors).toHaveLength(2);
      expect(cameraErrors.every(e => e.category === ErrorCategory.CAMERA)).toBe(true);
    });

    it('should filter errors by severity', () => {
      ErrorHandler.handleError(new Error('Critical error'), ErrorCategory.STORAGE);
      ErrorHandler.handleError(new Error('Low error'), ErrorCategory.NETWORK);
      ErrorHandler.handleError(new Error('Another critical'), ErrorCategory.STORAGE);

      const criticalErrors = ErrorHandler.getErrorsBySeverity(ErrorSeverity.CRITICAL);
      expect(criticalErrors).toHaveLength(2);
      expect(criticalErrors.every(e => e.severity === ErrorSeverity.CRITICAL)).toBe(true);
    });
  });

  describe('Error Listeners', () => {
    it('should notify listeners of errors', () => {
      const listener = jest.fn();
      ErrorHandler.addErrorListener(listener);

      const error = new Error('Test error');
      ErrorHandler.handleError(error, ErrorCategory.CAMERA);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.CAMERA,
        })
      );
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      ErrorHandler.addErrorListener(listener1);
      ErrorHandler.addErrorListener(listener2);

      ErrorHandler.handleError(new Error('Test'), ErrorCategory.CAMERA);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should remove listeners', () => {
      const listener = jest.fn();
      ErrorHandler.addErrorListener(listener);
      ErrorHandler.removeErrorListener(listener);

      ErrorHandler.handleError(new Error('Test'), ErrorCategory.CAMERA);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = jest.fn();

      ErrorHandler.addErrorListener(badListener);
      ErrorHandler.addErrorListener(goodListener);

      // Should not throw
      expect(() => {
        ErrorHandler.handleError(new Error('Test'), ErrorCategory.CAMERA);
      }).not.toThrow();

      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe('Recovery Strategies', () => {
    it('should assign retry strategy to video processing errors', () => {
      const error = new Error('Processing failed');
      const context = ErrorHandler.handleError(error, ErrorCategory.VIDEO_PROCESSING);

      expect(context.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
    });

    it('should assign fallback strategy to ML model errors', () => {
      const error = new Error('Model loading failed');
      const context = ErrorHandler.handleError(error, ErrorCategory.ML_MODEL);

      expect(context.recoveryStrategy).toBe(RecoveryStrategy.FALLBACK);
    });

    it('should assign user action strategy to permission errors', () => {
      const error = new Error('Permission denied');
      const context = ErrorHandler.handleError(error, ErrorCategory.PERMISSION);

      expect(context.recoveryStrategy).toBe(RecoveryStrategy.USER_ACTION);
    });
  });

  describe('Error Context', () => {
    it('should include timestamp', () => {
      const before = new Date();
      const context = ErrorHandler.handleError(new Error('Test'), ErrorCategory.CAMERA);
      const after = new Date();

      expect(context.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(context.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should include original error', () => {
      const originalError = new Error('Original error message');
      const context = ErrorHandler.handleError(originalError, ErrorCategory.CAMERA);

      expect(context.originalError).toBe(originalError);
    });

    it('should include metadata when provided', () => {
      const metadata = { userId: 'user123', videoPath: '/path/to/video' };
      const context = ErrorHandler.handleError(
        new Error('Test'),
        ErrorCategory.VIDEO_PROCESSING,
        metadata
      );

      expect(context.metadata).toEqual(metadata);
    });
  });

  describe('Clear Error Log', () => {
    it('should clear all errors from log', () => {
      ErrorHandler.handleError(new Error('Error 1'), ErrorCategory.CAMERA);
      ErrorHandler.handleError(new Error('Error 2'), ErrorCategory.STORAGE);

      expect(ErrorHandler.getErrorLog()).toHaveLength(2);

      ErrorHandler.clearErrorLog();

      expect(ErrorHandler.getErrorLog()).toHaveLength(0);
    });
  });
});
