import {
  getSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  getSegmentContacts,
  previewSegment,
  recalculateSegment,
  addContactsToSegment,
  removeContactsFromSegment,
} from './segment.service';
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

describe('SegmentService', () => {
  afterEach(() => jest.clearAllMocks());

  const mockSegment = {
    id: 'seg-1',
    name: 'Hot Leads',
    segmentType: 'DYNAMIC',
    contactCount: 50,
    filters: { logic: 'AND', groups: [] },
  };

  describe('getSegments', () => {
    it('should fetch segments with query params', async () => {
      mockApi.get.mockResolvedValue({ data: [mockSegment], pagination: { total: 1 } });

      await getSegments({ type: 'DYNAMIC', search: 'hot' });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/segments'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('type=DYNAMIC'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=hot'));
    });

    it('should fetch without params', async () => {
      mockApi.get.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await getSegments();

      expect(mockApi.get).toHaveBeenCalledWith('/segments');
    });
  });

  describe('getSegmentById', () => {
    it('should fetch a single segment', async () => {
      mockApi.get.mockResolvedValue(mockSegment);

      const result = await getSegmentById('seg-1');

      expect(mockApi.get).toHaveBeenCalledWith('/segments/seg-1');
      expect(result.name).toBe('Hot Leads');
    });
  });

  describe('createSegment', () => {
    it('should create a dynamic segment', async () => {
      mockApi.post.mockResolvedValue(mockSegment);

      await createSegment({
        name: 'New Segment',
        segmentType: 'DYNAMIC',
        filters: { logic: 'AND', groups: [] },
      });

      expect(mockApi.post).toHaveBeenCalledWith('/segments', expect.objectContaining({
        name: 'New Segment',
        segmentType: 'DYNAMIC',
      }));
    });
  });

  describe('updateSegment', () => {
    it('should update a segment', async () => {
      mockApi.put.mockResolvedValue({ ...mockSegment, name: 'Updated' });

      await updateSegment('seg-1', { name: 'Updated' });

      expect(mockApi.put).toHaveBeenCalledWith('/segments/seg-1', { name: 'Updated' });
    });
  });

  describe('deleteSegment', () => {
    it('should delete a segment', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await deleteSegment('seg-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/segments/seg-1');
    });
  });

  describe('getSegmentContacts', () => {
    it('should fetch contacts in a segment', async () => {
      mockApi.get.mockResolvedValue({ data: [], pagination: { total: 0 } });

      await getSegmentContacts('seg-1', { page: 1, limit: 20 });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/segments/seg-1/contacts'));
    });
  });

  describe('addContactsToSegment', () => {
    it('should add contacts', async () => {
      mockApi.post.mockResolvedValue(undefined);

      await addContactsToSegment('seg-1', ['c-1', 'c-2']);

      expect(mockApi.post).toHaveBeenCalledWith('/segments/seg-1/contacts', {
        contactIds: ['c-1', 'c-2'],
      });
    });
  });

  describe('removeContactsFromSegment', () => {
    it('should remove contacts', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await removeContactsFromSegment('seg-1', ['c-1']);

      expect(mockApi.delete).toHaveBeenCalledWith('/segments/seg-1/contacts', {
        data: { contactIds: ['c-1'] },
      });
    });
  });

  describe('previewSegment', () => {
    it('should preview filter results', async () => {
      mockApi.post.mockResolvedValue({ totalContacts: 25, sampleContacts: [] });

      const result = await previewSegment({ logic: 'AND', groups: [] });

      expect(mockApi.post).toHaveBeenCalledWith('/segments/preview', expect.any(Object));
      expect(result.totalContacts).toBe(25);
    });
  });

  describe('recalculateSegment', () => {
    it('should trigger recalculation', async () => {
      mockApi.post.mockResolvedValue(undefined);

      await recalculateSegment('seg-1');

      expect(mockApi.post).toHaveBeenCalledWith('/segments/seg-1/recalculate');
    });
  });
});
