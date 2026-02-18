/**
 * =============================================
 * Phase 2 — Frontend Error Boundary Tests
 * =============================================
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, ErrorFallback } from './error-boundary';

// ===========================================
// ErrorBoundary Component Tests
// ===========================================

describe('ErrorBoundary', () => {
  // Suppress console.error for expected error boundary triggers
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
    if (shouldThrow) throw new Error('Test error');
    return <div>Normal content</div>;
  };

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should render default fallback UI on error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should render custom ReactNode fallback', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });

  it('should render custom render function fallback', () => {
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => (
          <div>
            <span>Error: {error.message}</span>
            <button onClick={reset}>Reset</button>
          </div>
        )}
      >
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
  });

  it('should call onError callback when error is caught', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('should reset state when Try Again is clicked', () => {
    let shouldThrow = true;
    const ToggleComponent = () => {
      if (shouldThrow) throw new Error('Toggle error');
      return <div>Recovered content</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ToggleComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error and click Try Again
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    // Should re-render children
    rerender(
      <ErrorBoundary>
        <ToggleComponent />
      </ErrorBoundary>,
    );
  });
});

// ===========================================
// ErrorFallback Component Tests
// ===========================================

describe('ErrorFallback', () => {
  const mockError = new Error('Test error') as Error & { digest?: string };
  const mockReset = jest.fn();

  it('should render with default title and description', () => {
    render(<ErrorFallback error={mockError} reset={mockReset} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
  });

  it('should render with custom title and description', () => {
    render(
      <ErrorFallback
        error={mockError}
        reset={mockReset}
        title="Inbox Error"
        description="Failed to load inbox."
      />,
    );
    expect(screen.getByText('Inbox Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load inbox.')).toBeInTheDocument();
  });

  it('should call reset when "Try Again" is clicked', () => {
    render(<ErrorFallback error={mockError} reset={mockReset} />);
    fireEvent.click(screen.getByText('Try Again'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('should have a "Go Home" button', () => {
    render(<ErrorFallback error={mockError} reset={mockReset} />);
    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });

  it('should show error details in development', () => {
    const originalEnv = process.env.NODE_ENV;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = 'development';

    render(<ErrorFallback error={mockError} reset={mockReset} />);
    expect(screen.getByText('Error Details')).toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = originalEnv;
  });

  it('should display digest if present', () => {
    const digestError = new Error('with digest') as Error & { digest?: string };
    digestError.digest = 'abc123';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = 'development';

    render(<ErrorFallback error={digestError} reset={mockReset} />);
    expect(screen.getByText(/abc123/)).toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.env as any).NODE_ENV = 'test';
  });
});
