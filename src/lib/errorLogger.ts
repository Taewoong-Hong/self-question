import axios from 'axios';

interface ErrorInfo {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private originalConsoleError: typeof console.error;

  private constructor() {
    this.originalConsoleError = console.error;
    this.setupErrorHandlers();
  }

  public static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private setupErrorHandlers() {
    // console.error 오버라이드
    console.error = (...args: any[]) => {
      // 원래 console.error 호출
      this.originalConsoleError.apply(console, args);
      
      // 에러 로깅
      const errorMessage = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      this.logError({
        message: errorMessage,
        stack: new Error().stack,
        severity: 'medium'
      });
    };

    // 전역 에러 핸들러
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          message: event.message,
          stack: event.error?.stack,
          url: event.filename,
          severity: 'high',
          metadata: {
            line: event.lineno,
            column: event.colno
          }
        });
      });

      // Promise rejection 핸들러
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
          severity: 'high',
          metadata: {
            promise: event.promise
          }
        });
      });
    }
  }

  public async logError(errorInfo: ErrorInfo) {
    try {
      // 브라우저 환경에서만 실행
      if (typeof window === 'undefined') return;

      const payload = {
        ...errorInfo,
        url: errorInfo.url || window.location.href,
        userAgent: errorInfo.userAgent || navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      // 에러 로그 전송
      await axios.post('/api/admin/error-logs', payload);
    } catch (error) {
      // 로깅 실패 시 원래 console.error 사용
      this.originalConsoleError('Failed to log error:', error);
    }
  }

  public logCustomError(message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', metadata?: any) {
    this.logError({
      message,
      severity,
      metadata,
      stack: new Error().stack
    });
  }
}

// 싱글톤 인스턴스 export
export const errorLogger = ErrorLogger.getInstance();