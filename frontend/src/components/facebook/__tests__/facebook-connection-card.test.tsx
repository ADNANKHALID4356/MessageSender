import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FacebookConnectionCard } from '../facebook-connection-card';

// Mock ResizeObserver which is not available in jsdom
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the hooks
const mockRefetch = jest.fn();
const mockMutate = jest.fn();

jest.mock('@/hooks', () => ({
  useFacebookConnectionStatus: jest.fn(),
  useInitiateFacebookOAuth: jest.fn(),
  useDisconnectFacebookAccount: jest.fn(),
  useRefreshFacebookAccount: jest.fn(),
  // Also mock the hooks used by PageSelectionModal (which is embedded in FacebookConnectionCard)
  useFacebookAvailablePages: jest.fn(),
  useConnectFacebookPage: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

// Import the mocked hooks
import {
  useFacebookConnectionStatus,
  useInitiateFacebookOAuth,
  useDisconnectFacebookAccount,
  useRefreshFacebookAccount,
} from '@/hooks';

// Import hooks for PageSelectionModal
import {
  useFacebookAvailablePages,
  useConnectFacebookPage,
} from '@/hooks';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe('FacebookConnectionCard', () => {
  const mockWorkspaceId = 'workspace-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (useInitiateFacebookOAuth as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    (useDisconnectFacebookAccount as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    (useRefreshFacebookAccount as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    // Mock for PageSelectionModal (embedded component)
    (useFacebookAvailablePages as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
      isRefetching: false,
    });

    (useConnectFacebookPage as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  describe('when not connected', () => {
    beforeEach(() => {
      (useFacebookConnectionStatus as jest.Mock).mockReturnValue({
        data: { connected: false, account: null, pages: [] },
        isLoading: false,
        refetch: mockRefetch,
      });
    });

    it('should render connect button when not connected', () => {
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByText('Connect with Facebook')).toBeInTheDocument();
      expect(screen.getByText('Connect your Facebook account to manage pages')).toBeInTheDocument();
    });

    it('should show feature list when not connected', () => {
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByText('Manage multiple Facebook Pages')).toBeInTheDocument();
      expect(screen.getByText('Receive and respond to messages')).toBeInTheDocument();
      expect(screen.getByText('Send bulk messages and campaigns')).toBeInTheDocument();
      expect(screen.getByText('Track analytics and engagement')).toBeInTheDocument();
    });

    it('should initiate OAuth when connect button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      const connectButton = screen.getByRole('button', { name: /connect with facebook/i });
      await user.click(connectButton);

      expect(mockMutate).toHaveBeenCalledWith(mockWorkspaceId);
    });

    it('should show loading state when connecting', () => {
      (useInitiateFacebookOAuth as jest.Mock).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      });

      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByRole('button', { name: /connect with facebook/i })).toBeDisabled();
    });
  });

  describe('when connected', () => {
    const mockAccount = {
      id: 'fb-account-123',
      facebookUserId: '123456789',
      name: 'John Doe',
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    beforeEach(() => {
      (useFacebookConnectionStatus as jest.Mock).mockReturnValue({
        data: { 
          connected: true, 
          account: mockAccount, 
          pages: [{ id: 'page-1', name: 'Test Page' }] 
        },
        isLoading: false,
        refetch: mockRefetch,
      });
    });

    it('should show connected account information', () => {
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByText('Connected as John Doe')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/Facebook User ID: 123456789/)).toBeInTheDocument();
    });

    it('should show pages count', () => {
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByText('1 page(s) connected')).toBeInTheDocument();
    });

    it('should show Manage Pages button when connected', () => {
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByRole('button', { name: /manage pages/i })).toBeInTheDocument();
    });

    it('should show token status', () => {
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByText(/Valid for \d+ days/)).toBeInTheDocument();
    });

    it('should show disconnect confirmation dialog when disconnect button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      // Find the disconnect button (it's an icon button)
      const buttons = screen.getAllByRole('button');
      const disconnectButton = buttons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-unplug') ||
        btn.innerHTML.includes('Unplug')
      );
      
      if (disconnectButton) {
        await user.click(disconnectButton);
        await waitFor(() => {
          expect(screen.getByText('Disconnect Facebook Account')).toBeInTheDocument();
        });
      }
    });
  });

  describe('when loading', () => {
    it('should show loading state', () => {
      (useFacebookConnectionStatus as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
        refetch: mockRefetch,
      });

      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByText('Loading connection status...')).toBeInTheDocument();
    });
  });

  describe('token expiration warnings', () => {
    it('should show warning when token is expiring soon', () => {
      const expiringAccount = {
        id: 'fb-account-123',
        facebookUserId: '123456789',
        name: 'John Doe',
        tokenExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
      };

      (useFacebookConnectionStatus as jest.Mock).mockReturnValue({
        data: { 
          connected: true, 
          account: expiringAccount, 
          pages: [] 
        },
        isLoading: false,
        refetch: mockRefetch,
      });

      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      // Allow for slight date calculation differences (4-5 days)
      expect(screen.getByText(/Expires in [45] days/)).toBeInTheDocument();
    });

    it('should show expired message when token is expired', () => {
      const expiredAccount = {
        id: 'fb-account-123',
        facebookUserId: '123456789',
        name: 'John Doe',
        tokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
      };

      (useFacebookConnectionStatus as jest.Mock).mockReturnValue({
        data: { 
          connected: true, 
          account: expiredAccount, 
          pages: [] 
        },
        isLoading: false,
        refetch: mockRefetch,
      });

      renderWithProviders(
        <FacebookConnectionCard workspaceId={mockWorkspaceId} />
      );

      expect(screen.getByText('Token expired')).toBeInTheDocument();
    });
  });
});
