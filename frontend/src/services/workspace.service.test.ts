import { workspaceService } from './workspace.service';
import api from '@/lib/api-client';

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

describe('WorkspaceService', () => {
  afterEach(() => jest.clearAllMocks());

  const mockWorkspace = {
    id: 'ws-1',
    name: 'Test Workspace',
    description: 'Test',
    status: 'active',
    settings: {},
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  describe('getWorkspaces', () => {
    it('should fetch user workspaces from /my endpoint', async () => {
      mockApi.get.mockResolvedValue({ data: [mockWorkspace], meta: { total: 1 } });

      await workspaceService.getWorkspaces();

      expect(mockApi.get).toHaveBeenCalledWith('/workspaces/my');
    });

    it('should include search and status params', async () => {
      mockApi.get.mockResolvedValue({ data: [], meta: { total: 0 } });

      await workspaceService.getWorkspaces({ search: 'test', status: 'active' });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=test'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('status=active'));
    });
  });

  describe('getWorkspace', () => {
    it('should fetch single workspace', async () => {
      mockApi.get.mockResolvedValue(mockWorkspace);

      const result = await workspaceService.getWorkspace('ws-1');

      expect(mockApi.get).toHaveBeenCalledWith('/workspaces/ws-1');
      expect(result.name).toBe('Test Workspace');
    });
  });

  describe('createWorkspace', () => {
    it('should create a workspace', async () => {
      mockApi.post.mockResolvedValue(mockWorkspace);

      await workspaceService.createWorkspace({ name: 'New Workspace' });

      expect(mockApi.post).toHaveBeenCalledWith('/workspaces', { name: 'New Workspace' });
    });
  });

  describe('updateWorkspace', () => {
    it('should update a workspace', async () => {
      mockApi.put.mockResolvedValue({ ...mockWorkspace, name: 'Updated' });

      await workspaceService.updateWorkspace('ws-1', { name: 'Updated' });

      expect(mockApi.put).toHaveBeenCalledWith('/workspaces/ws-1', { name: 'Updated' });
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete a workspace', async () => {
      mockApi.delete.mockResolvedValue({ message: 'Deleted' });

      await workspaceService.deleteWorkspace('ws-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/workspaces/ws-1');
    });
  });

  describe('Members', () => {
    it('should get workspace members', async () => {
      mockApi.get.mockResolvedValue([{ id: 'm-1', role: 'owner' }]);

      const result = await workspaceService.getMembers('ws-1');

      expect(mockApi.get).toHaveBeenCalledWith('/workspaces/ws-1/users');
      expect(result).toHaveLength(1);
    });

    it('should add a member', async () => {
      mockApi.post.mockResolvedValue({ id: 'm-2', role: 'agent' });

      await workspaceService.addMember('ws-1', { userId: 'u-2', role: 'agent' });

      expect(mockApi.post).toHaveBeenCalledWith('/workspaces/ws-1/users', {
        userId: 'u-2',
        role: 'agent',
      });
    });

    it('should update a member role', async () => {
      mockApi.put.mockResolvedValue({ id: 'm-2', role: 'manager' });

      await workspaceService.updateMember('ws-1', 'u-2', { role: 'manager' });

      expect(mockApi.put).toHaveBeenCalledWith('/workspaces/ws-1/users/u-2', {
        role: 'manager',
      });
    });

    it('should remove a member', async () => {
      mockApi.delete.mockResolvedValue({ message: 'Removed' });

      await workspaceService.removeMember('ws-1', 'u-2');

      expect(mockApi.delete).toHaveBeenCalledWith('/workspaces/ws-1/users/u-2');
    });
  });

  describe('getStats', () => {
    it('should fetch workspace stats', async () => {
      mockApi.get.mockResolvedValue({ contacts: 100, messages: 500 });

      const result = await workspaceService.getStats('ws-1');

      expect(mockApi.get).toHaveBeenCalledWith('/workspaces/ws-1/stats');
      expect(result.contacts).toBe(100);
    });
  });
});
