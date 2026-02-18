import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/stores/auth-store';

// Mock useAuthStore
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}));

describe('AuthGuard Component', () => {
  const mockInitialize = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockReset();
  });

  it('shows loading screen while not initialized', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isInitialized: false,
      user: null,
      initialize: mockInitialize,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(mockInitialize).toHaveBeenCalled();
  });

  it('renders children when authenticated', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isInitialized: true,
      user: { id: '1', email: 'test@example.com', isAdmin: false },
      initialize: mockInitialize,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      isInitialized: true,
      user: null,
      initialize: mockInitialize,
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('redirects non-admin users when requireAdmin is true', async () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isInitialized: true,
      user: { id: '1', email: 'test@example.com', isAdmin: false },
      initialize: mockInitialize,
    });

    render(
      <AuthGuard requireAdmin>
        <div>Admin Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('allows admin users when requireAdmin is true', () => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      isInitialized: true,
      user: { id: '1', email: 'admin@example.com', isAdmin: true },
      initialize: mockInitialize,
    });

    render(
      <AuthGuard requireAdmin>
        <div>Admin Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
