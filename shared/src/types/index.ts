// ===========================================
// USER & AUTH TYPES
// ===========================================

export interface Admin {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PermissionLevel {
  VIEW_ONLY = 'view_only',
  OPERATOR = 'operator',
  MANAGER = 'manager',
}

export interface Session {
  id: string;
  userId?: string;
  isAdmin: boolean;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  isAdmin: boolean;
  workspaces?: WorkspaceAccess[];
}

export interface WorkspaceAccess {
  workspaceId: string;
  workspaceName: string;
  permissionLevel: PermissionLevel;
}

// ===========================================
// WORKSPACE TYPES
// ===========================================

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  colorTheme: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceDashboard {
  workspace: Workspace;
  stats: WorkspaceStats;
  recentActivity: ActivityItem[];
  connectedPages: number;
  totalContacts: number;
}

export interface WorkspaceStats {
  totalContacts: number;
  newContactsToday: number;
  newContactsWeek: number;
  messagesSentToday: number;
  messagesSentWeek: number;
  activeConversations: number;
  activeCampaigns: number;
}

export interface ActivityItem {
  id: string;
  type: 'message_sent' | 'message_received' | 'contact_added' | 'campaign_completed' | 'campaign_started' | 'tag_added';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ===========================================
// FACEBOOK TYPES
// ===========================================

export interface FacebookAccount {
  id: string;
  workspaceId: string;
  fbUserId: string;
  fbUserName?: string;
  isConnected: boolean;
  lastSyncedAt?: Date;
  connectionError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  id: string;
  workspaceId: string;
  facebookAccountId: string;
  fbPageId: string;
  name: string;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
  category?: string;
  followersCount: number;
  isActive: boolean;
  webhookSubscribed: boolean;
  lastSyncedAt?: Date;
  tokenError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TOKEN_ERROR = 'token_error',
  SYNCING = 'syncing',
}

// ===========================================
// CONTACT TYPES
// ===========================================

export interface Contact {
  id: string;
  workspaceId: string;
  pageId: string;
  psid: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profilePictureUrl?: string;
  locale?: string;
  timezone?: number;
  gender?: string;
  source: ContactSource;
  sourceDetails?: Record<string, any>;
  customFields: Record<string, any>;
  engagementScore: number;
  engagementLevel: EngagementLevel;
  firstInteractionAt?: Date;
  lastInteractionAt?: Date;
  lastMessageFromContactAt?: Date;
  lastMessageToContactAt?: Date;
  isSubscribed: boolean;
  unsubscribedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: Tag[];
}

export enum ContactSource {
  ORGANIC = 'organic',
  AD = 'ad',
  COMMENT = 'comment',
  REFERRAL = 'referral',
}

export enum EngagementLevel {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold',
  INACTIVE = 'inactive',
  NEW = 'new',
}

export interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface CustomFieldDefinition {
  id: string;
  workspaceId: string;
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  options?: string[];
  isRequired: boolean;
  sortOrder: number;
  createdAt: Date;
}

export enum CustomFieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DROPDOWN = 'dropdown',
  CHECKBOX = 'checkbox',
}

// ===========================================
// 24-HOUR BYPASS TYPES
// ===========================================

export interface WindowStatus {
  isWithinWindow: boolean;
  expiresAt?: Date;
  minutesRemaining?: number;
}

export interface BypassStatus {
  windowStatus: WindowStatus;
  hasOtnToken: boolean;
  otnTokenCount: number;
  hasRecurringSubscription: boolean;
  recurringSubscriptions: RecurringSubscriptionInfo[];
  recommendedMethod: BypassMethod;
  availableMethods: BypassMethod[];
}

export enum BypassMethod {
  WITHIN_WINDOW = 'within_window',
  OTN_TOKEN = 'otn_token',
  RECURRING_NOTIFICATION = 'recurring_notification',
  MESSAGE_TAG_CONFIRMED_EVENT = 'message_tag_confirmed_event',
  MESSAGE_TAG_POST_PURCHASE = 'message_tag_post_purchase',
  MESSAGE_TAG_ACCOUNT_UPDATE = 'message_tag_account_update',
  MESSAGE_TAG_HUMAN_AGENT = 'message_tag_human_agent',
  SPONSORED_MESSAGE = 'sponsored_message',
  BLOCKED = 'blocked',
}

export enum MessageTag {
  CONFIRMED_EVENT_UPDATE = 'CONFIRMED_EVENT_UPDATE',
  POST_PURCHASE_UPDATE = 'POST_PURCHASE_UPDATE',
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  HUMAN_AGENT = 'HUMAN_AGENT',
}

export interface OtnToken {
  id: string;
  contactId: string;
  pageId: string;
  token: string;
  title?: string;
  payload?: string;
  isUsed: boolean;
  expiresAt?: Date;
  requestedAt: Date;
  optedInAt?: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface RecurringSubscription {
  id: string;
  contactId: string;
  pageId: string;
  token: string;
  frequency: RecurringFrequency;
  topic?: string;
  isActive: boolean;
  expiresAt?: Date;
  lastSentAt?: Date;
  messagesSentCount: number;
  optedInAt: Date;
  optedOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringSubscriptionInfo {
  id: string;
  frequency: RecurringFrequency;
  canSendNow: boolean;
  nextSendAvailable?: Date;
}

export enum RecurringFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// ===========================================
// MESSAGE TYPES
// ===========================================

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  pageId: string;
  campaignId?: string;
  direction: MessageDirection;
  messageType: MessageType;
  content: MessageContent;
  fbMessageId?: string;
  fbTimestamp?: number;
  bypassMethod?: BypassMethod;
  messageTag?: MessageTag;
  status: MessageStatus;
  errorCode?: string;
  errorMessage?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  FILE = 'file',
  TEMPLATE = 'template',
}

export enum MessageStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  RECEIVED = 'received',
}

export interface MessageContent {
  text?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  buttons?: MessageButton[];
  quickReplies?: QuickReply[];
  templateType?: string;
  elements?: any[];
}

export interface MessageButton {
  type: 'web_url' | 'postback' | 'phone_number';
  title: string;
  url?: string;
  payload?: string;
}

export interface QuickReply {
  contentType: 'text' | 'user_phone_number' | 'user_email';
  title?: string;
  payload?: string;
  imageUrl?: string;
}

export interface SendMessageRequest {
  recipientId: string;
  pageId: string;
  messageType: MessageType;
  content: MessageContent;
  bypassMethod?: BypassMethod;
  messageTag?: MessageTag;
  otnTokenId?: string;
  recurringSubscriptionId?: string;
}

export interface BulkSendRequest {
  workspaceId: string;
  pageId?: string;
  segmentId?: string;
  contactIds?: string[];
  content: MessageContent;
  bypassMethod: BypassMethod;
  messageTag?: MessageTag;
}

export interface SendProgress {
  jobId: string;
  status: JobStatus;
  totalRecipients: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
}

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ===========================================
// SEGMENT TYPES
// ===========================================

export interface Segment {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  segmentType: SegmentType;
  filters: SegmentFilter;
  contactCount: number;
  lastCalculatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum SegmentType {
  DYNAMIC = 'dynamic',
  STATIC = 'static',
}

export interface SegmentFilter {
  logic: FilterLogic;
  conditions: FilterCondition[];
  groups?: SegmentFilter[];
}

export enum FilterLogic {
  AND = 'AND',
  OR = 'OR',
}

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  not?: boolean;
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_OR_EQUAL = 'greater_or_equal',
  LESS_OR_EQUAL = 'less_or_equal',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  IN = 'in',
  NOT_IN = 'not_in',
  BEFORE = 'before',
  AFTER = 'after',
  BETWEEN = 'between',
}

// ===========================================
// CAMPAIGN TYPES
// ===========================================

export interface Campaign {
  id: string;
  workspaceId: string;
  createdByAdmin: boolean;
  createdByUserId?: string;
  name: string;
  description?: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  audienceType: AudienceType;
  audienceSegmentId?: string;
  audiencePageIds?: string[];
  audienceContactIds?: string[];
  messageContent: MessageContent;
  bypassMethod?: BypassMethod;
  messageTag?: MessageTag;
  scheduledAt?: Date;
  timezone: string;
  recurringPattern?: RecurringPattern;
  dripSequence?: DripStep[];
  isAbTest: boolean;
  abVariants?: ABVariant[];
  abWinnerCriteria?: ABWinnerCriteria;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  repliedCount: number;
  unsubscribedCount: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum CampaignType {
  ONE_TIME = 'one_time',
  SCHEDULED = 'scheduled',
  RECURRING = 'recurring',
  DRIP = 'drip',
  TRIGGER = 'trigger',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AudienceType {
  ALL = 'all',
  SEGMENT = 'segment',
  PAGES = 'pages',
  MANUAL = 'manual',
  CSV = 'csv',
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
}

export interface DripStep {
  order: number;
  content: MessageContent;
  delayMinutes: number;
  condition?: DripCondition;
}

export enum DripCondition {
  ALWAYS = 'always',
  IF_REPLIED = 'if_replied',
  IF_NOT_REPLIED = 'if_not_replied',
  IF_CLICKED = 'if_clicked',
}

export interface ABVariant {
  id: string;
  name: string;
  content: MessageContent;
  percentage: number;
  sentCount: number;
  deliveredCount: number;
  repliedCount: number;
  clickedCount: number;
}

export enum ABWinnerCriteria {
  DELIVERY_RATE = 'delivery',
  RESPONSE_RATE = 'response',
  CLICK_RATE = 'click',
}

// ===========================================
// CONVERSATION / INBOX TYPES
// ===========================================

export interface Conversation {
  id: string;
  workspaceId: string;
  pageId: string;
  contactId: string;
  status: ConversationStatus;
  assignedToUserId?: string;
  assignedToAdmin: boolean;
  labels: string[];
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  lastMessageDirection?: MessageDirection;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  contact?: Contact;
  page?: Page;
  messages?: Message[];
}

export enum ConversationStatus {
  OPEN = 'open',
  PENDING = 'pending',
  RESOLVED = 'resolved',
}

export interface ConversationNote {
  id: string;
  conversationId: string;
  createdByAdmin: boolean;
  createdByUserId?: string;
  content: string;
  createdAt: Date;
}

// ===========================================
// ANALYTICS TYPES
// ===========================================

export interface DashboardAnalytics {
  period: AnalyticsPeriod;
  totalContacts: number;
  newContacts: number;
  contactsChange: number;
  messagesSent: number;
  messagesSentChange: number;
  messagesReceived: number;
  deliveryRate: number;
  responseRate: number;
  activeConversations: number;
  chartData: ChartDataPoint[];
}

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  totalRecipients: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  replied: number;
  unsubscribed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  responseRate: number;
  abVariantResults?: ABVariant[];
}

// ===========================================
// ACTIVITY LOG TYPES
// ===========================================

export interface ActivityLog {
  id: string;
  workspaceId?: string;
  actorType: ActorType;
  actorUserId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

export enum ActorType {
  ADMIN = 'admin',
  USER = 'user',
  SYSTEM = 'system',
}

// ===========================================
// API RESPONSE TYPES
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// ===========================================
// WEBHOOK TYPES
// ===========================================

export interface FacebookWebhookEvent {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  time: number;
  messaging?: MessagingEvent[];
}

export interface MessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: IncomingMessage;
  postback?: Postback;
  optin?: Optin;
  delivery?: Delivery;
  read?: Read;
  referral?: Referral;
}

export interface IncomingMessage {
  mid: string;
  text?: string;
  attachments?: Attachment[];
  quick_reply?: { payload: string };
}

export interface Attachment {
  type: string;
  payload: {
    url?: string;
    title?: string;
  };
}

export interface Postback {
  title: string;
  payload: string;
  referral?: Referral;
}

export interface Optin {
  ref?: string;
  one_time_notif_token?: string;
  notification_messages_token?: string;
  notification_messages_frequency?: RecurringFrequency;
  payload?: string;
}

export interface Delivery {
  mids: string[];
  watermark: number;
}

export interface Read {
  watermark: number;
}

export interface Referral {
  ref?: string;
  source?: string;
  type?: string;
  ad_id?: string;
}
