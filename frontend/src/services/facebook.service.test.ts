/**
 * @jest-environment jsdom
 */

import { facebookService } from './facebook.service';
import api from '../lib/api-client';

// Mock the API client
jest.mock('../lib/api-client');
const mockedApi = api as jest.Mocked<typeof api>;

describe('FacebookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateOAuth', () => {
    it('should call API with workspace ID', async () => {
      const mockResponse = { authUrl: 'https://facebook.com/oauth' };
      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await facebookService.initiateOAuth('workspace-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/facebook/oauth/initiate', {
        workspaceId: 'workspace-1',
        redirectUrl: undefined,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include redirect URL when provided', async () => {
      const mockResponse = { authUrl: 'https://facebook.com/oauth' };
      mockedApi.post.mockResolvedValue(mockResponse);

      await facebookService.initiateOAuth('workspace-1', 'http://localhost:3000/callback');

      expect(mockedApi.post).toHaveBeenCalledWith('/facebook/oauth/initiate', {
        workspaceId: 'workspace-1',
        redirectUrl: 'http://localhost:3000/callback',
      });
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', async () => {
      const mockStatus = {
        connected: true,
        account: {
          id: 'fb-account-1',
          facebookUserId: 'fb-123',
          name: 'Test User',
          tokenValid: true,
          tokenExpiresAt: '2024-03-01T00:00:00Z',
        },
        pages: [
          {
            id: 'page-1',
            pageId: 'fb-page-123',
            name: 'Test Page',
            isWebhookActive: true,
          },
        ],
      };
      mockedApi.get.mockResolvedValue(mockStatus);

      const result = await facebookService.getConnectionStatus('workspace-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/facebook/workspaces/workspace-1/status');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getAvailablePages', () => {
    it('should return available pages', async () => {
      const mockPages = [
        { id: 'page-1', pageId: 'fb-page-1', name: 'Page 1', isConnected: true },
        { id: 'page-2', pageId: 'fb-page-2', name: 'Page 2', isConnected: false },
      ];
      mockedApi.get.mockResolvedValue(mockPages);

      const result = await facebookService.getAvailablePages('fb-account-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/facebook/accounts/fb-account-1/pages');
      expect(result).toEqual(mockPages);
    });
  });

  describe('connectPage', () => {
    it('should connect a page', async () => {
      const mockPage = {
        id: 'page-1',
        pageId: 'fb-page-123',
        name: 'Test Page',
      };
      mockedApi.post.mockResolvedValue(mockPage);

      const result = await facebookService.connectPage('workspace-1', {
        facebookAccountId: 'fb-account-1',
        pageId: 'fb-page-123',
        pageName: 'Test Page',
      });

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/facebook/workspaces/workspace-1/pages',
        {
          facebookAccountId: 'fb-account-1',
          pageId: 'fb-page-123',
          pageName: 'Test Page',
        }
      );
      expect(result).toEqual(mockPage);
    });
  });

  describe('disconnectPage', () => {
    it('should disconnect a page', async () => {
      mockedApi.delete.mockResolvedValue(undefined);

      await facebookService.disconnectPage('workspace-1', 'page-1');

      expect(mockedApi.delete).toHaveBeenCalledWith(
        '/facebook/workspaces/workspace-1/pages/page-1'
      );
    });
  });

  describe('disconnectAccount', () => {
    it('should disconnect the Facebook account', async () => {
      mockedApi.delete.mockResolvedValue(undefined);

      await facebookService.disconnectAccount('workspace-1');

      expect(mockedApi.delete).toHaveBeenCalledWith(
        '/facebook/workspaces/workspace-1/disconnect'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh the token', async () => {
      const mockResponse = {
        success: true,
        expiresAt: '2024-05-01T00:00:00Z',
      };
      mockedApi.post.mockResolvedValue(mockResponse);

      const result = await facebookService.refreshToken('fb-account-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/facebook/accounts/fb-account-1/refresh');
      expect(result).toEqual(mockResponse);
    });
  });
});
