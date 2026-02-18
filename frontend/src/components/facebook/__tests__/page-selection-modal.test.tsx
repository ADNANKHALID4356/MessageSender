import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageSelectionModal } from '../page-selection-modal';

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
  useFacebookAvailablePages: jest.fn(),
  useConnectFacebookPage: jest.fn(),
}));

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

describe('PageSelectionModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    workspaceId: 'workspace-123',
    facebookAccountId: 'fb-account-123',
    onSuccess: jest.fn(),
  };

  const mockPages = [
    { 
      id: 'page-1', 
      pageId: '111111', 
      name: 'Test Page 1', 
      category: 'Business',
      picture: 'https://example.com/pic1.jpg',
      isConnected: false 
    },
    { 
      id: 'page-2', 
      pageId: '222222', 
      name: 'Test Page 2', 
      category: 'Community',
      picture: null,
      isConnected: false 
    },
    { 
      id: 'page-3', 
      pageId: '333333', 
      name: 'Connected Page', 
      category: 'Business',
      picture: 'https://example.com/pic3.jpg',
      isConnected: true 
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useFacebookAvailablePages as jest.Mock).mockReturnValue({
      data: mockPages,
      isLoading: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    (useConnectFacebookPage as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('should render modal with title and description', () => {
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    expect(screen.getByText('Select Facebook Pages')).toBeInTheDocument();
    expect(screen.getByText(/Choose which Facebook Pages you want to connect/)).toBeInTheDocument();
  });

  it('should display available pages', () => {
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    expect(screen.getByText('Test Page 1')).toBeInTheDocument();
    expect(screen.getByText('Test Page 2')).toBeInTheDocument();
  });

  it('should show already connected pages in separate section', () => {
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    expect(screen.getByText(/Already Connected/)).toBeInTheDocument();
    expect(screen.getByText('Connected Page')).toBeInTheDocument();
  });

  it('should show available pages count', () => {
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    expect(screen.getByText(/Available Pages \(2\)/)).toBeInTheDocument();
  });

  it('should allow selecting a page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    const page1Element = screen.getByText('Test Page 1').closest('div[class*="rounded-lg border"]');
    if (page1Element) {
      await user.click(page1Element);
    }

    // Check that "Connect Selected (1)" button appears
    await waitFor(() => {
      expect(screen.getByText(/1 page\(s\) selected/)).toBeInTheDocument();
    });
  });

  it('should connect a single page when Connect button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    // Find and click the "Connect" button for the first page
    const connectButtons = screen.getAllByRole('button', { name: 'Connect' });
    await user.click(connectButtons[0]);

    expect(mockMutate).toHaveBeenCalledWith({
      facebookAccountId: 'fb-account-123',
      pageId: 'page-1',
      pageName: 'Test Page 1',
    });
  });

  it('should filter pages by search query', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search pages...');
    await user.type(searchInput, 'Page 1');

    expect(screen.getByText('Test Page 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Page 2')).not.toBeInTheDocument();
  });

  it('should show loading state while fetching pages', () => {
    (useFacebookAvailablePages as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      refetch: mockRefetch,
      isRefetching: false,
    });

    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    expect(screen.getByText('Loading your Facebook pages...')).toBeInTheDocument();
  });

  it('should show empty state when no pages available', () => {
    (useFacebookAvailablePages as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
      isRefetching: false,
    });

    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    expect(screen.getByText('No Pages Found')).toBeInTheDocument();
  });

  it('should call onOpenChange when Close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    // Get all Close buttons and find the one in the footer (not the X button)
    const closeButtons = screen.getAllByRole('button', { name: /Close/i });
    // The Close button in the footer is the one without an SVG inside
    const footerCloseButton = closeButtons.find(btn => 
      btn.textContent?.trim() === 'Close' && !btn.querySelector('svg.h-4.w-4')
    );
    
    if (footerCloseButton) {
      await user.click(footerCloseButton);
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    } else {
      // Fallback: click first Close button
      await user.click(closeButtons[0]);
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it('should refresh pages when refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    // Find the refresh button by its icon
    const buttons = screen.getAllByRole('button');
    const refreshButton = buttons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-refresh-cw')
    );

    if (refreshButton) {
      await user.click(refreshButton);
      expect(mockRefetch).toHaveBeenCalled();
    }
  });

  it('should not render when open is false', () => {
    renderWithProviders(<PageSelectionModal {...defaultProps} open={false} />);

    expect(screen.queryByText('Select Facebook Pages')).not.toBeInTheDocument();
  });

  it('should display page categories', () => {
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    // Use getAllByText since category appears in multiple places for pages with same category
    expect(screen.getAllByText('Business').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Community').length).toBeGreaterThan(0);
  });

  it('should show connected status badge for connected pages', () => {
    renderWithProviders(<PageSelectionModal {...defaultProps} />);

    const connectedBadges = screen.getAllByText('Connected');
    expect(connectedBadges.length).toBeGreaterThan(0);
  });

  describe('bulk selection', () => {
    it('should allow selecting multiple pages', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PageSelectionModal {...defaultProps} />);

      // Click on first page - use checkbox or the card
      const page1Card = screen.getByText('Test Page 1').closest('div[class*="rounded-lg"]');
      const page2Card = screen.getByText('Test Page 2').closest('div[class*="rounded-lg"]');

      if (page1Card) await user.click(page1Card);
      if (page2Card) await user.click(page2Card);

      await waitFor(() => {
        expect(screen.getByText(/2 page\(s\) selected/)).toBeInTheDocument();
      });
    });

    it('should show Connect Selected button when pages are selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PageSelectionModal {...defaultProps} />);

      const page1Card = screen.getByText('Test Page 1').closest('div[class*="rounded-lg"]');
      if (page1Card) await user.click(page1Card);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Connect Selected \(1\)/ })).toBeInTheDocument();
      });
    });
  });
});
