import api from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export type SegmentType = 'DYNAMIC' | 'STATIC';

export interface FilterCondition {
  field: string;
  operator: string;
  value?: any;
  customFieldKey?: string;
}

export interface FilterGroup {
  logic?: 'AND' | 'OR';
  conditions: FilterCondition[];
}

export interface SegmentFilters {
  logic?: 'AND' | 'OR';
  groups: FilterGroup[];
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  segmentType: SegmentType;
  filters: SegmentFilters | null;
  contactCount: number;
  lastCalculatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentListResponse {
  data: Segment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SegmentListQuery {
  page?: number;
  limit?: number;
  type?: SegmentType;
  search?: string;
  sortBy?: 'createdAt' | 'name' | 'contactCount';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSegmentDto {
  name: string;
  description?: string;
  segmentType: SegmentType;
  filters?: SegmentFilters;
  contactIds?: string[]; // For static segments
}

export interface UpdateSegmentDto {
  name?: string;
  description?: string;
  filters?: SegmentFilters;
}

export interface SegmentContactsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface SegmentContact {
  id: string;
  fullName: string | null;
  email: string | null;
  pageId: string;
}

export interface SegmentContactsResponse {
  data: SegmentContact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SegmentPreviewResponse {
  totalContacts: number;
  sampleContacts: SegmentContact[];
}

// ===========================================
// API Functions
// ===========================================

/**
 * Get all segments for workspace
 */
export async function getSegments(query?: SegmentListQuery): Promise<SegmentListResponse> {
  const params = new URLSearchParams();
  
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  if (query?.type) params.append('type', query.type);
  if (query?.search) params.append('search', query.search);
  if (query?.sortBy) params.append('sortBy', query.sortBy);
  if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

  const queryString = params.toString();
  return api.get<SegmentListResponse>(`/segments${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get segment by ID
 */
export async function getSegmentById(segmentId: string): Promise<Segment> {
  return api.get<Segment>(`/segments/${segmentId}`);
}

/**
 * Create a new segment
 */
export async function createSegment(data: CreateSegmentDto): Promise<Segment> {
  return api.post<Segment>('/segments', data);
}

/**
 * Update segment
 */
export async function updateSegment(segmentId: string, data: UpdateSegmentDto): Promise<Segment> {
  return api.put<Segment>(`/segments/${segmentId}`, data);
}

/**
 * Delete segment
 */
export async function deleteSegment(segmentId: string): Promise<void> {
  return api.delete(`/segments/${segmentId}`);
}

/**
 * Get contacts in a segment
 */
export async function getSegmentContacts(
  segmentId: string,
  query?: SegmentContactsQuery
): Promise<SegmentContactsResponse> {
  const params = new URLSearchParams();
  
  if (query?.page) params.append('page', query.page.toString());
  if (query?.limit) params.append('limit', query.limit.toString());
  if (query?.search) params.append('search', query.search);

  const queryString = params.toString();
  return api.get<SegmentContactsResponse>(
    `/segments/${segmentId}/contacts${queryString ? `?${queryString}` : ''}`
  );
}

/**
 * Add contacts to a static segment
 */
export async function addContactsToSegment(
  segmentId: string,
  contactIds: string[]
): Promise<void> {
  return api.post(`/segments/${segmentId}/contacts`, { contactIds });
}

/**
 * Remove contacts from a static segment
 */
export async function removeContactsFromSegment(
  segmentId: string,
  contactIds: string[]
): Promise<void> {
  return api.delete(`/segments/${segmentId}/contacts`, { data: { contactIds } });
}

/**
 * Preview segment filters (returns count and sample contacts)
 */
export async function previewSegment(filters: SegmentFilters): Promise<SegmentPreviewResponse> {
  return api.post<SegmentPreviewResponse>('/segments/preview', filters);
}

/**
 * Recalculate a dynamic segment
 */
export async function recalculateSegment(segmentId: string): Promise<void> {
  return api.post(`/segments/${segmentId}/recalculate`);
}

/**
 * Recalculate all dynamic segments in workspace
 */
export async function recalculateAllSegments(): Promise<void> {
  return api.post('/segments/recalculate-all');
}
