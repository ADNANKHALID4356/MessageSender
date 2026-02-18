/**
 * @jest-environment jsdom
 */

import { pageService } from './page.service';
import api from '../lib/api-client';

// Mock the API client
jest.mock('../lib/api-client');
const mockedApi = api as jest.Mocked<typeof api>;

describe('PageService', () => {
  const mockPage = {
    id: 'page-1',
    workspaceId: 'workspace-1',
    facebookAccountId: 'fb-account-1',
    pageId: 'fb-page-123',
    pageName: 'Test Page',
    category: 'Business',
    picture: 'http://example.com/pic.jpg',
    isActive: true,
    isWebhookActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPages', () => {
    it('should return pages for workspace', async () => {
      mockedApi.get.mockResolvedValue([mockPage]);

      const result = await pageService.getPages('workspace-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces/workspace-1/pages');
      expect(result).toEqual([mockPage]);
    });
  });

  describe('getPage', () => {
    it('should return page by ID', async () => {
      mockedApi.get.mockResolvedValue(mockPage);

      const result = await pageService.getPage('workspace-1', 'page-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces/workspace-1/pages/page-1');
      expect(result).toEqual(mockPage);
    });
  });

  describe('getStats', () => {
    it('should return page statistics', async () => {
      const mockStats = {
        totalConversations: 100,
        activeConversations: 20,
        totalMessages: 500,
        inboundMessages: 300,
        outboundMessages: 200,
        totalContacts: 50,
      };
      mockedApi.get.mockResolvedValue(mockStats);

      const result = await pageService.getStats('workspace-1', 'page-1');

      expect(mockedApi.get).toHaveBeenCalledWith('/workspaces/workspace-1/pages/page-1/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('updatePage', () => {
    it('should update page settings', async () => {
      const updatedPage = { ...mockPage, welcomeMessage: 'Hello!' };
      mockedApi.put.mockResolvedValue(updatedPage);

      const result = await pageService.updatePage('workspace-1', 'page-1', {
        welcomeMessage: 'Hello!',
      });

      expect(mockedApi.put).toHaveBeenCalledWith('/workspaces/workspace-1/pages/page-1', {
        welcomeMessage: 'Hello!',
      });
      expect(result).toEqual(updatedPage);
    });
  });

  describe('deactivatePage', () => {
    it('should deactivate page', async () => {
      mockedApi.delete.mockResolvedValue(undefined);

      await pageService.deactivatePage('workspace-1', 'page-1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/workspaces/workspace-1/pages/page-1');
    });
  });

  describe('reactivatePage', () => {
    it('should reactivate page', async () => {
      const reactivatedPage = { ...mockPage, isActive: true };
      mockedApi.post.mockResolvedValue(reactivatedPage);

      const result = await pageService.reactivatePage('workspace-1', 'page-1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/workspaces/workspace-1/pages/page-1/reactivate'
      );
      expect(result).toEqual(reactivatedPage);
    });
  });

  describe('syncPage', () => {
    it('should sync page info', async () => {
      const syncedPage = { ...mockPage, pageName: 'Updated Name' };
      mockedApi.post.mockResolvedValue(syncedPage);

      const result = await pageService.syncPage('workspace-1', 'page-1');

      expect(mockedApi.post).toHaveBeenCalledWith('/workspaces/workspace-1/pages/page-1/sync');
      expect(result).toEqual(syncedPage);
    });
  });

  describe('validateToken', () => {
    it('should validate page token', async () => {
      const mockValidation = {
        valid: true,
        expiresAt: 1704067200,
        scopes: ['pages_messaging', 'pages_manage_metadata'],
      };
      mockedApi.get.mockResolvedValue(mockValidation);

      const result = await pageService.validateToken('workspace-1', 'page-1');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/workspaces/workspace-1/pages/page-1/token/validate'
      );
      expect(result).toEqual(mockValidation);
    });
  });

  describe('fixWebhook', () => {
    it('should fix webhook subscription', async () => {
      const mockStatus = { fixed: true, status: true };
      mockedApi.post.mockResolvedValue(mockStatus);

      const result = await pageService.fixWebhook('workspace-1', 'page-1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/workspaces/workspace-1/pages/page-1/webhook/fix'
      );
      expect(result).toEqual(mockStatus);
    });
  });
});
