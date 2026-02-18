import api from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export type BypassMethod =
  | 'WITHIN_WINDOW'
  | 'OTN_TOKEN'
  | 'RECURRING_NOTIFICATION'
  | 'MESSAGE_TAG_CONFIRMED_EVENT'
  | 'MESSAGE_TAG_POST_PURCHASE'
  | 'MESSAGE_TAG_ACCOUNT_UPDATE'
  | 'MESSAGE_TAG_HUMAN_AGENT'
  | 'SPONSORED_MESSAGE'
  | 'BLOCKED';

export type MessageTag =
  | 'CONFIRMED_EVENT_UPDATE'
  | 'POST_PURCHASE_UPDATE'
  | 'ACCOUNT_UPDATE'
  | 'HUMAN_AGENT';

export interface WindowStatus {
  isWithin24Hours: boolean;
  lastMessageFromContact: string | null;
  windowExpiresAt: string | null;
  availableBypassMethods: BypassMethod[];
  hasOtnToken: boolean;
  hasRecurringSubscription: boolean;
}

// ===========================================
// Messages Service
// ===========================================

export const messagesService = {
  /**
   * Get the 24-hour messaging window status for a contact on a page
   */
  async getWindowStatus(contactId: string, pageId: string): Promise<WindowStatus> {
    return api.get<WindowStatus>(`/messages/window-status/${contactId}/${pageId}`);
  },
};

export default messagesService;
