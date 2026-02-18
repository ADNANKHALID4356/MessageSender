// Jest setup file for backend tests

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-min-32-chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-min-32';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes for AES-256

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        generateMockUser: () => {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          isAdmin: boolean;
        };
      };
    }
  }
}

export {};
