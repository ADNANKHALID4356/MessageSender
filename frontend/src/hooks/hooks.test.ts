/**
 * =============================================
 * Frontend Hooks Tests — Admin, Bypass, Sponsored, Templates
 * =============================================
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- Mocks -----
jest.mock('@/services/admin.service', () => ({
  healthService: { getStatus: jest.fn().mockResolvedValue({ status: 'healthy', services: {} }) },
  reportService: { generate: jest.fn().mockResolvedValue({ reportType: 'campaign_summary', data: [] }) },
  backupService: {
    list: jest.fn().mockResolvedValue([]),
    getStats: jest.fn().mockResolvedValue({ totalBackups: 0 }),
    create: jest.fn().mockResolvedValue({ id: 'b1', status: 'completed' }),
    delete: jest.fn().mockResolvedValue(undefined),
  },
  emailService: {
    getSmtpConfig: jest.fn().mockResolvedValue(null),
    configureSmtp: jest.fn().mockResolvedValue({}),
    testConnection: jest.fn().mockResolvedValue({ success: true }),
    sendTest: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('@/services/bypass.service', () => ({
  otnService: {
    getTokens: jest.fn().mockResolvedValue([]),
    getTokenCount: jest.fn().mockResolvedValue({ count: 0 }),
    requestOtn: jest.fn().mockResolvedValue({}),
    useOtnToken: jest.fn().mockResolvedValue({}),
  },
  recurringService: {
    getSubscriptions: jest.fn().mockResolvedValue([]),
    requestSubscription: jest.fn().mockResolvedValue({}),
    sendRecurring: jest.fn().mockResolvedValue({}),
    cancelSubscription: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/services/sponsored.service', () => ({
  sponsoredService: {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ id: 'sp1' }),
    getStats: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: 'sp1' }),
    submitForReview: jest.fn().mockResolvedValue({}),
    pause: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/templates.service', () => ({
  templatesService: {
    getTemplates: jest.fn().mockResolvedValue([]),
    createTemplate: jest.fn().mockResolvedValue({ id: 't1' }),
    updateTemplate: jest.fn().mockResolvedValue({}),
    deleteTemplate: jest.fn().mockResolvedValue(undefined),
    getCannedResponses: jest.fn().mockResolvedValue([]),
    createCannedResponse: jest.fn().mockResolvedValue({ id: 'cr1' }),
    updateCannedResponse: jest.fn().mockResolvedValue({}),
    deleteCannedResponse: jest.fn().mockResolvedValue(undefined),
  },
}));

// ---- Imports after mocks -----
import { useSystemHealth, useBackups, useCreateBackup } from '@/hooks/use-admin';
import { useOtnTokens, useRecurringSubscriptions } from '@/hooks/use-bypass';
import { useSponsoredCampaigns, useCreateSponsoredCampaign } from '@/hooks/use-sponsored';
import { useTemplates, useCannedResponses } from '@/hooks/use-templates';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

// ===========================================
// Admin Hooks
// ===========================================

describe('Admin Hooks', () => {
  it('useSystemHealth should return health data', async () => {
    const { result } = renderHook(() => useSystemHealth(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ status: 'healthy', services: {} });
  });

  it('useBackups should return empty list', async () => {
    const { result } = renderHook(() => useBackups('ws1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('useCreateBackup should provide mutateAsync', () => {
    const { result } = renderHook(() => useCreateBackup(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

// ===========================================
// Bypass Hooks
// ===========================================

describe('Bypass Hooks', () => {
  it('useOtnTokens should not fetch when contactId is undefined', async () => {
    const { result } = renderHook(() => useOtnTokens(undefined, 'page1'), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
  });

  it('useOtnTokens should fetch when both params present', async () => {
    const { result } = renderHook(() => useOtnTokens('contact1', 'page1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('useRecurringSubscriptions should not fetch when disabled', async () => {
    const { result } = renderHook(() => useRecurringSubscriptions(undefined, undefined), {
      wrapper: createWrapper(),
    });
    expect(result.current.isFetching).toBe(false);
  });
});

// ===========================================
// Sponsored Hooks
// ===========================================

describe('Sponsored Hooks', () => {
  it('useSponsoredCampaigns should return empty list', async () => {
    const { result } = renderHook(() => useSponsoredCampaigns(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('useCreateSponsoredCampaign should provide mutateAsync', () => {
    const { result } = renderHook(() => useCreateSponsoredCampaign(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

// ===========================================
// Template Hooks
// ===========================================

describe('Template Hooks', () => {
  it('useTemplates should return empty list and create function', async () => {
    const { result } = renderHook(() => useTemplates(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.templates).toEqual([]);
    expect(result.current.create).toBeDefined();
    expect(result.current.update).toBeDefined();
    expect(result.current.remove).toBeDefined();
  });

  it('useCannedResponses should return empty list', async () => {
    const { result } = renderHook(() => useCannedResponses(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.responses).toEqual([]);
  });
});
