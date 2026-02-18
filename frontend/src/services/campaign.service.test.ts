import { campaignService } from './campaign.service';
import api from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('CampaignService', () => {
  afterEach(() => jest.clearAllMocks());

  const mockCampaign = {
    id: 'camp-1',
    name: 'Test Campaign',
    status: 'draft',
    type: 'broadcast',
    sentCount: 0,
    deliveredCount: 0,
  };

  describe('getCampaigns', () => {
    it('should fetch campaigns with workspace and query params', async () => {
      mockApi.get.mockResolvedValue({ data: [mockCampaign], meta: { total: 1 } });
      
      await campaignService.getCampaigns('ws-1', { page: 1, status: 'draft' });
      
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/campaigns'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('workspaceId=ws-1'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('status=draft'));
    });

    it('should handle empty params', async () => {
      mockApi.get.mockResolvedValue({ data: [], meta: { total: 0 } });
      
      await campaignService.getCampaigns('ws-1');
      
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('workspaceId=ws-1'));
    });
  });

  describe('getCampaign', () => {
    it('should fetch a single campaign by ID', async () => {
      mockApi.get.mockResolvedValue(mockCampaign);
      
      const result = await campaignService.getCampaign('camp-1');
      
      expect(mockApi.get).toHaveBeenCalledWith('/campaigns/camp-1');
      expect(result.id).toBe('camp-1');
    });
  });

  describe('createCampaign', () => {
    it('should create a campaign with workspaceId', async () => {
      mockApi.post.mockResolvedValue(mockCampaign);
      
      const data = { name: 'New', type: 'broadcast' as const, message: { type: 'text', content: 'Hi' } };
      await campaignService.createCampaign('ws-1', data);
      
      expect(mockApi.post).toHaveBeenCalledWith('/campaigns', expect.objectContaining({
        name: 'New',
        workspaceId: 'ws-1',
      }));
    });
  });

  describe('updateCampaign', () => {
    it('should update a campaign', async () => {
      mockApi.put.mockResolvedValue({ ...mockCampaign, name: 'Updated' });
      
      await campaignService.updateCampaign('camp-1', { name: 'Updated' });
      
      expect(mockApi.put).toHaveBeenCalledWith('/campaigns/camp-1', { name: 'Updated' });
    });
  });

  describe('deleteCampaign', () => {
    it('should delete a campaign', async () => {
      mockApi.delete.mockResolvedValue({ message: 'Deleted' });
      
      await campaignService.deleteCampaign('camp-1');
      
      expect(mockApi.delete).toHaveBeenCalledWith('/campaigns/camp-1');
    });
  });

  describe('Campaign Lifecycle', () => {
    it('should launch a campaign', async () => {
      mockApi.post.mockResolvedValue({ ...mockCampaign, status: 'running' });
      
      const result = await campaignService.launchCampaign('camp-1');
      
      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/camp-1/launch');
      expect(result.status).toBe('running');
    });

    it('should pause a campaign', async () => {
      mockApi.post.mockResolvedValue({ ...mockCampaign, status: 'paused' });
      
      const result = await campaignService.pauseCampaign('camp-1');
      
      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/camp-1/pause');
      expect(result.status).toBe('paused');
    });

    it('should resume a campaign', async () => {
      mockApi.post.mockResolvedValue({ ...mockCampaign, status: 'running' });
      
      await campaignService.resumeCampaign('camp-1');
      
      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/camp-1/resume');
    });

    it('should cancel a campaign', async () => {
      mockApi.post.mockResolvedValue({ ...mockCampaign, status: 'failed' });
      
      await campaignService.cancelCampaign('camp-1');
      
      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/camp-1/cancel');
    });

    it('should duplicate a campaign', async () => {
      mockApi.post.mockResolvedValue({ ...mockCampaign, id: 'camp-2', name: 'Test (Copy)' });
      
      await campaignService.duplicateCampaign('camp-1');
      
      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/camp-1/duplicate');
    });

    it('should schedule a campaign', async () => {
      const scheduledAt = '2026-03-01T10:00:00Z';
      mockApi.post.mockResolvedValue({ ...mockCampaign, scheduledAt });
      
      await campaignService.scheduleCampaign('camp-1', scheduledAt);
      
      expect(mockApi.post).toHaveBeenCalledWith('/campaigns/camp-1/schedule', { scheduledAt });
    });
  });

  describe('getCampaignStats', () => {
    it('should fetch campaign stats', async () => {
      const stats = { deliveryRate: 95, readRate: 60 };
      mockApi.get.mockResolvedValue(stats);
      
      const result = await campaignService.getCampaignStats('camp-1');
      
      expect(mockApi.get).toHaveBeenCalledWith('/campaigns/camp-1/stats');
      expect(result).toEqual(stats);
    });
  });

  describe('getCampaignProgress', () => {
    it('should fetch campaign progress', async () => {
      mockApi.get.mockResolvedValue({ progress: 75, sentCount: 75, targetCount: 100 });
      
      const result = await campaignService.getCampaignProgress('camp-1');
      
      expect(result.progress).toBe(75);
    });
  });
});
