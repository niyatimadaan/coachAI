/**
 * Error Handler
 * Comprehensive error handling with graceful degradation and user-friendly messages
 */

/**
 * Error categories for different failure modes
 */
export enum ErrorCategory {
  CAMERA = 'camera',
  VIDEO_PROCESSING = 'video_processing',
  ML_MODEL = 'ml_model',
  STORAGE = 'storage',
  NETWORK = 'network',
  SYNC = 'sync',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  CRITICAL = 'critical', // App cannot continue
  HIGH = 'high', // Feature unavailable, but app can continue
  MEDIUM = 'medium', // Degraded functionality
  LOW = 'low', // Minor issue, user can continue normally
}

/**
 * Recovery strategy types
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  SKIP = 'skip',
  USER_ACTION = 'user_action',
  NONE = 'none',
}

/**
 * User-friendly error information
 */
export interface UserErrorInfo {
  title: string;
  message: string;
  actionText?: string;
  actionCallback?: () => void;
  dismissible: boolean;
}

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError: Error | unknown;
  timestamp: Date;
  userInfo: UserErrorInfo;
  recoveryStrategy: RecoveryStrategy;
  metadata?: Record<string, any>;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public severity: ErrorSeverity,
    public recoveryStrategy: RecoveryStrategy = RecoveryStrategy.NONE,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error handler class for centralized error management
 */
class ErrorHandler {
  private errorLog: ErrorContext[] = [];
  private maxLogSize: number = 100;
  private errorListeners: Array<(error: ErrorContext) => void> = [];

  /**
   * Handle an error with appropriate recovery strategy
   */
  handleError(
    error: Error | unknown,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    metadata?: Record<string, any>
  ): ErrorContext {
    const errorContext = this.createErrorContext(error, category, metadata);
    
    // Log the error
    this.logError(errorContext);
    
    // Notify listeners
    this.notifyListeners(errorContext);
    
    // Execute recovery strategy
    this.executeRecoveryStrategy(errorContext);
    
    return errorContext;
  }

  /**
   * Create error context from error object
   */
  private createErrorContext(
    error: Error | unknown,
    category: ErrorCategory,
    metadata?: Record<string, any>
  ): ErrorContext {
    let severity: ErrorSeverity;
    let recoveryStrategy: RecoveryStrategy;
    let userInfo: UserErrorInfo;
    let finalMetadata = metadata;

    if (error instanceof AppError) {
      severity = error.severity;
      recoveryStrategy = error.recoveryStrategy;
      userInfo = this.getUserErrorInfo(error.category, error.message);
      // Merge AppError metadata with provided metadata
      finalMetadata = { ...error.metadata, ...metadata };
    } else {
      severity = this.determineSeverity(category);
      recoveryStrategy = this.determineRecoveryStrategy(category);
      const errorMessage = error instanceof Error ? error.message : String(error);
      userInfo = this.getUserErrorInfo(category, errorMessage);
    }

    return {
      category,
      severity,
      originalError: error,
      timestamp: new Date(),
      userInfo,
      recoveryStrategy,
      metadata: finalMetadata,
    };
  }

  /**
   * Determine error severity based on category
   */
  private determineSeverity(category: ErrorCategory): ErrorSeverity {
    const severityMap: Record<ErrorCategory, ErrorSeverity> = {
      [ErrorCategory.CAMERA]: ErrorSeverity.HIGH,
      [ErrorCategory.VIDEO_PROCESSING]: ErrorSeverity.HIGH,
      [ErrorCategory.ML_MODEL]: ErrorSeverity.MEDIUM,
      [ErrorCategory.STORAGE]: ErrorSeverity.CRITICAL,
      [ErrorCategory.NETWORK]: ErrorSeverity.LOW,
      [ErrorCategory.SYNC]: ErrorSeverity.LOW,
      [ErrorCategory.PERMISSION]: ErrorSeverity.HIGH,
      [ErrorCategory.UNKNOWN]: ErrorSeverity.MEDIUM,
    };

    return severityMap[category];
  }

  /**
   * Determine recovery strategy based on category
   */
  private determineRecoveryStrategy(category: ErrorCategory): RecoveryStrategy {
    const strategyMap: Record<ErrorCategory, RecoveryStrategy> = {
      [ErrorCategory.CAMERA]: RecoveryStrategy.USER_ACTION,
      [ErrorCategory.VIDEO_PROCESSING]: RecoveryStrategy.RETRY,
      [ErrorCategory.ML_MODEL]: RecoveryStrategy.FALLBACK,
      [ErrorCategory.STORAGE]: RecoveryStrategy.USER_ACTION,
      [ErrorCategory.NETWORK]: RecoveryStrategy.FALLBACK,
      [ErrorCategory.SYNC]: RecoveryStrategy.RETRY,
      [ErrorCategory.PERMISSION]: RecoveryStrategy.USER_ACTION,
      [ErrorCategory.UNKNOWN]: RecoveryStrategy.NONE,
    };

    return strategyMap[category];
  }

  /**
   * Get user-friendly error information
   */
  private getUserErrorInfo(category: ErrorCategory, technicalMessage: string): UserErrorInfo {
    const errorMessages: Record<ErrorCategory, UserErrorInfo> = {
      [ErrorCategory.CAMERA]: {
        title: 'Camera Issue',
        message: 'We couldn\'t access your camera. Please check your camera permissions in settings.',
        actionText: 'Open Settings',
        dismissible: true,
      },
      [ErrorCategory.VIDEO_PROCESSING]: {
        title: 'Processing Error',
        message: 'We had trouble analyzing your video. Let\'s try again.',
        actionText: 'Retry',
        dismissible: true,
      },
      [ErrorCategory.ML_MODEL]: {
        title: 'Analysis Unavailable',
        message: 'Advanced analysis is temporarily unavailable. We\'ll use basic analysis instead.',
        dismissible: true,
      },
      [ErrorCategory.STORAGE]: {
        title: 'Storage Full',
        message: 'Your device storage is full. Please free up some space to continue.',
        actionText: 'Manage Storage',
        dismissible: false,
      },
      [ErrorCategory.NETWORK]: {
        title: 'No Connection',
        message: 'You\'re offline. Don\'t worry, you can still practice and we\'ll sync your progress later.',
        dismissible: true,
      },
      [ErrorCategory.SYNC]: {
        title: 'Sync Issue',
        message: 'We couldn\'t sync your progress right now. We\'ll try again automatically.',
        dismissible: true,
      },
      [ErrorCategory.PERMISSION]: {
        title: 'Permission Required',
        message: 'This feature needs your permission to work. Please grant access in settings.',
        actionText: 'Grant Permission',
        dismissible: true,
      },
      [ErrorCategory.UNKNOWN]: {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again.',
        actionText: 'Retry',
        dismissible: true,
      },
    };

    return errorMessages[category];
  }

  /**
   * Execute recovery strategy
   */
  private executeRecoveryStrategy(errorContext: ErrorContext): void {
    console.log(`Executing recovery strategy: ${errorContext.recoveryStrategy}`);
    
    // Recovery strategies are executed by the calling code
    // This method logs the strategy for monitoring
  }

  /**
   * Log error to internal log
   */
  private logError(errorContext: ErrorContext): void {
    this.errorLog.push(errorContext);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Console log for development
    console.error(`[${errorContext.category}] ${errorContext.severity}:`, errorContext.originalError);
    if (errorContext.metadata) {
      console.error('Metadata:', errorContext.metadata);
    }
  }

  /**
   * Register error listener
   */
  addErrorListener(listener: (error: ErrorContext) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: (error: ErrorContext) => void): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of error
   */
  private notifyListeners(errorContext: ErrorContext): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorContext);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Get error log
   */
  getErrorLog(): ErrorContext[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): ErrorContext[] {
    return this.errorLog.filter(error => error.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): ErrorContext[] {
    return this.errorLog.filter(error => error.severity === severity);
  }
}

export default new ErrorHandler();
