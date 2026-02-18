// Export all services
export { 
  authService, 
  type LoginRequest, 
  type LoginResponse, 
  type AuthUser,
  type AdminSignupRequest,
  type UserSignupRequest,
  type SignupResponse,
  type PendingUser,
  type ManagedUser,
} from './auth.service';
export { workspaceService, type Workspace, type WorkspaceMember } from './workspace.service';
export { 
  contactService, 
  type Contact, 
  type Tag, 
  type EngagementLevel, 
  type ContactSource,
  type ContactStats,
  type ContactListParams,
} from './contact.service';
export { 
  conversationService, 
  messageService,
  type Conversation, 
  type ConversationDetail,
  type ConversationStatus,
  type ConversationStats,
  type Message, 
  type MessageStats,
  type ConversationListParams,
  type SendMessageRequest,
} from './conversation.service';
export { campaignService, type Campaign, type CampaignType, type CampaignStatus } from './campaign.service';
export { facebookService, type FacebookAccount, type FacebookPage, type ConnectionStatus } from './facebook.service';
export { pageService, type Page, type PageStats, type TokenValidation, type WebhookStatus } from './page.service';
export * from './segment.service';
export { analyticsService } from './analytics.service';
export { templatesService, type MessageTemplate, type CannedResponse, type TemplateContent } from './templates.service';
