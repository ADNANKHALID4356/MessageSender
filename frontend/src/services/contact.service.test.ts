import { contactService } from './contact.service';
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

describe('ContactService', () => {
  afterEach(() => jest.clearAllMocks());

  const mockContact = {
    id: 'c-1',
    psid: 'psid-123',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    source: 'ORGANIC',
    isSubscribed: true,
    engagementLevel: 'HOT',
    tags: [],
  };

  describe('getContacts', () => {
    it('should fetch contacts with query params', async () => {
      mockApi.get.mockResolvedValue({ data: [mockContact], meta: { total: 1 } });

      await contactService.getContacts('ws-1', { search: 'john', engagementLevel: 'HOT' });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/contacts'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=john'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('engagementLevel=HOT'));
    });

    it('should append tag IDs as multiple params', async () => {
      mockApi.get.mockResolvedValue({ data: [], meta: { total: 0 } });

      await contactService.getContacts('ws-1', { tagIds: ['t1', 't2'] });

      const calledUrl = mockApi.get.mock.calls[0][0];
      expect(calledUrl).toContain('tagIds=t1');
      expect(calledUrl).toContain('tagIds=t2');
    });
  });

  describe('getContact', () => {
    it('should fetch a single contact', async () => {
      mockApi.get.mockResolvedValue(mockContact);

      const result = await contactService.getContact('ws-1', 'c-1');

      expect(mockApi.get).toHaveBeenCalledWith('/contacts/c-1');
      expect(result.firstName).toBe('John');
    });
  });

  describe('createContact', () => {
    it('should create a contact', async () => {
      mockApi.post.mockResolvedValue(mockContact);

      await contactService.createContact('ws-1', {
        pageId: 'p-1',
        psid: 'new-psid',
        firstName: 'Jane',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/contacts', expect.objectContaining({
        psid: 'new-psid',
      }));
    });
  });

  describe('updateContact', () => {
    it('should update a contact', async () => {
      mockApi.put.mockResolvedValue({ ...mockContact, firstName: 'Updated' });

      await contactService.updateContact('ws-1', 'c-1', { firstName: 'Updated' });

      expect(mockApi.put).toHaveBeenCalledWith('/contacts/c-1', { firstName: 'Updated' });
    });
  });

  describe('deleteContact', () => {
    it('should delete a contact', async () => {
      mockApi.delete.mockResolvedValue({ message: 'Deleted' });

      await contactService.deleteContact('ws-1', 'c-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/contacts/c-1');
    });
  });

  describe('Tag Operations', () => {
    it('should add tags to a contact', async () => {
      mockApi.post.mockResolvedValue(mockContact);

      await contactService.addTags('ws-1', 'c-1', ['tag-1', 'tag-2']);

      expect(mockApi.post).toHaveBeenCalledWith('/contacts/c-1/tags', {
        tagIds: ['tag-1', 'tag-2'],
      });
    });

    it('should remove tags from a contact', async () => {
      mockApi.delete.mockResolvedValue(mockContact);

      await contactService.removeTags('ws-1', 'c-1', ['tag-1']);

      expect(mockApi.delete).toHaveBeenCalledWith('/contacts/c-1/tags', {
        data: { tagIds: ['tag-1'] },
      });
    });

    it('should bulk tag contacts', async () => {
      mockApi.post.mockResolvedValue({ updated: 5 });

      await contactService.bulkTag('ws-1', {
        contactIds: ['c-1', 'c-2'],
        addTagIds: ['t-1'],
      });

      expect(mockApi.post).toHaveBeenCalledWith('/contacts/bulk-tag', expect.objectContaining({
        contactIds: ['c-1', 'c-2'],
      }));
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk delete contacts', async () => {
      mockApi.post.mockResolvedValue({ deleted: 3 });

      await contactService.bulkDelete('ws-1', ['c-1', 'c-2', 'c-3']);

      expect(mockApi.post).toHaveBeenCalledWith('/contacts/bulk-delete', {
        contactIds: ['c-1', 'c-2', 'c-3'],
      });
    });

    it('should import contacts', async () => {
      mockApi.post.mockResolvedValue({ imported: 10, skipped: 2, errors: [] });

      const result = await contactService.importContacts('ws-1', {
        contacts: [{ psid: 'p1', pageId: 'page1' }],
      });

      expect(result.imported).toBe(10);
    });
  });

  describe('Tag Management', () => {
    it('should get all tags', async () => {
      mockApi.get.mockResolvedValue([{ id: 't-1', name: 'VIP' }]);

      const result = await contactService.getTags('ws-1');

      expect(mockApi.get).toHaveBeenCalledWith('/contacts/tags/all');
      expect(result).toHaveLength(1);
    });

    it('should create a tag', async () => {
      mockApi.post.mockResolvedValue({ id: 't-new', name: 'New Tag' });

      await contactService.createTag('ws-1', { name: 'New Tag', color: '#ff0000' });

      expect(mockApi.post).toHaveBeenCalledWith('/contacts/tags', {
        name: 'New Tag',
        color: '#ff0000',
      });
    });

    it('should delete a tag', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await contactService.deleteTag('ws-1', 't-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/contacts/tags/t-1');
    });
  });

  describe('getStats', () => {
    it('should fetch contact stats', async () => {
      mockApi.get.mockResolvedValue({ total: 100, subscribed: 90 });

      const result = await contactService.getStats('ws-1');

      expect(mockApi.get).toHaveBeenCalledWith('/contacts/stats');
      expect(result.total).toBe(100);
    });
  });
});
