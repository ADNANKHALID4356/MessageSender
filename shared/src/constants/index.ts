// ===========================================
// VALIDATION CONSTANTS
// ===========================================

export const VALIDATION = {
  // User Validation
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 100,

  // Workspace Validation
  WORKSPACE_NAME_MIN_LENGTH: 2,
  WORKSPACE_NAME_MAX_LENGTH: 100,
  WORKSPACE_DESCRIPTION_MAX_LENGTH: 500,
  MAX_WORKSPACES: 5,

  // Message Validation
  MESSAGE_TEXT_MAX_LENGTH: 2000,
  BUTTON_TITLE_MAX_LENGTH: 20,
  QUICK_REPLY_TITLE_MAX_LENGTH: 20,
  PAYLOAD_MAX_LENGTH: 1000,

  // Segment Validation
  SEGMENT_NAME_MAX_LENGTH: 100,
  MAX_SEGMENT_CONDITIONS: 20,

  // Campaign Validation
  CAMPAIGN_NAME_MAX_LENGTH: 100,
  MAX_DRIP_STEPS: 20,
  MAX_AB_VARIANTS: 5,

  // Tag Validation
  TAG_NAME_MAX_LENGTH: 50,
  TAG_COLOR_LENGTH: 7, // #RRGGBB

  // Custom Field Validation
  CUSTOM_FIELD_NAME_MAX_LENGTH: 50,
  CUSTOM_FIELD_KEY_MAX_LENGTH: 50,
  MAX_CUSTOM_FIELD_OPTIONS: 50,

  // Notes Validation
  NOTE_MAX_LENGTH: 5000,
} as const;

// ===========================================
// RATE LIMIT CONSTANTS
// ===========================================

export const RATE_LIMITS = {
  // Facebook API Limits
  MESSAGES_PER_PAGE_PER_HOUR: 200,
  BATCH_SIZE: 50,
  BATCH_DELAY_MS: 100,

  // API Rate Limits
  LOGIN_ATTEMPTS_PER_IP: 5,
  LOGIN_WINDOW_MINUTES: 15,
  API_REQUESTS_PER_MINUTE: 100,
  WEBHOOK_RETRY_ATTEMPTS: 3,

  // Job Processing
  MAX_CONCURRENT_JOBS: 10,
  JOB_TIMEOUT_MS: 300000, // 5 minutes
} as const;

// ===========================================
// TIME CONSTANTS
// ===========================================

export const TIME = {
  // Token Expiry
  ACCESS_TOKEN_EXPIRY_SECONDS: 3600, // 1 hour
  REFRESH_TOKEN_EXPIRY_SECONDS: 604800, // 7 days
  REFRESH_TOKEN_REMEMBER_ME_SECONDS: 2592000, // 30 days
  
  // Facebook
  MESSAGING_WINDOW_HOURS: 24,
  OTN_TOKEN_EXPIRY_DAYS: 365,
  
  // Engagement Scoring
  HOT_THRESHOLD_HOURS: 24,
  WARM_THRESHOLD_HOURS: 168, // 7 days
  COLD_THRESHOLD_HOURS: 720, // 30 days
  INACTIVE_THRESHOLD_HOURS: 2160, // 90 days

  // Cache TTL
  SESSION_CACHE_TTL_SECONDS: 300,
  CONTACT_CACHE_TTL_SECONDS: 60,
  PAGE_CACHE_TTL_SECONDS: 600,
} as const;

// ===========================================
// PAGINATION CONSTANTS
// ===========================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// ===========================================
// HTTP STATUS CODES
// ===========================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ===========================================
// ERROR CODES
// ===========================================

export const ERROR_CODES = {
  // Auth Errors
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  TOKEN_INVALID: 'AUTH_003',
  SESSION_EXPIRED: 'AUTH_004',
  INSUFFICIENT_PERMISSIONS: 'AUTH_005',
  ACCOUNT_LOCKED: 'AUTH_006',
  ACCOUNT_INACTIVE: 'AUTH_007',

  // Validation Errors
  VALIDATION_FAILED: 'VAL_001',
  REQUIRED_FIELD_MISSING: 'VAL_002',
  INVALID_FORMAT: 'VAL_003',
  VALUE_OUT_OF_RANGE: 'VAL_004',

  // Resource Errors
  RESOURCE_NOT_FOUND: 'RES_001',
  RESOURCE_ALREADY_EXISTS: 'RES_002',
  RESOURCE_LIMIT_REACHED: 'RES_003',

  // Facebook Errors
  FB_TOKEN_EXPIRED: 'FB_001',
  FB_PAGE_NOT_CONNECTED: 'FB_002',
  FB_API_ERROR: 'FB_003',
  FB_RATE_LIMITED: 'FB_004',
  FB_PERMISSION_DENIED: 'FB_005',
  FB_OUTSIDE_WINDOW: 'FB_006',
  FB_BLOCKED_BY_USER: 'FB_007',

  // Message Errors
  MESSAGE_FAILED: 'MSG_001',
  INVALID_RECIPIENT: 'MSG_002',
  BYPASS_NOT_AVAILABLE: 'MSG_003',
  OTN_TOKEN_INVALID: 'MSG_004',
  OTN_TOKEN_USED: 'MSG_005',

  // Workspace Errors
  WORKSPACE_LIMIT_REACHED: 'WS_001',
  WORKSPACE_NOT_FOUND: 'WS_002',

  // System Errors
  INTERNAL_ERROR: 'SYS_001',
  SERVICE_UNAVAILABLE: 'SYS_002',
  DATABASE_ERROR: 'SYS_003',
  CACHE_ERROR: 'SYS_004',
} as const;

// ===========================================
// SOCKET EVENTS
// ===========================================

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Inbox
  NEW_MESSAGE: 'inbox:new_message',
  MESSAGE_DELIVERED: 'inbox:message_delivered',
  MESSAGE_READ: 'inbox:message_read',
  CONVERSATION_UPDATED: 'inbox:conversation_updated',
  
  // Campaigns
  CAMPAIGN_PROGRESS: 'campaign:progress',
  CAMPAIGN_COMPLETED: 'campaign:completed',
  CAMPAIGN_FAILED: 'campaign:failed',
  
  // Contacts
  CONTACT_CREATED: 'contact:created',
  CONTACT_UPDATED: 'contact:updated',
  
  // Pages
  PAGE_STATUS_CHANGED: 'page:status_changed',
  PAGE_SYNC_COMPLETED: 'page:sync_completed',

  // Notifications
  NOTIFICATION: 'notification',
  ALERT: 'alert',
} as const;

// ===========================================
// QUEUE NAMES
// ===========================================

export const QUEUES = {
  MESSAGE_SEND: 'message-send',
  BULK_MESSAGE: 'bulk-message',
  WEBHOOK_PROCESS: 'webhook-process',
  CONTACT_SYNC: 'contact-sync',
  CAMPAIGN_EXECUTE: 'campaign-execute',
  ANALYTICS_AGGREGATE: 'analytics-aggregate',
  EMAIL_SEND: 'email-send',
  CLEANUP: 'cleanup',
} as const;

// ===========================================
// CACHE KEYS
// ===========================================

export const CACHE_KEYS = {
  SESSION: (sessionId: string) => `session:${sessionId}`,
  USER: (userId: string) => `user:${userId}`,
  PAGE: (pageId: string) => `page:${pageId}`,
  PAGE_TOKEN: (pageId: string) => `page:token:${pageId}`,
  CONTACT: (contactId: string) => `contact:${contactId}`,
  CONTACT_BYPASS: (contactId: string) => `contact:bypass:${contactId}`,
  RATE_LIMIT: (key: string) => `rate:${key}`,
  WORKSPACE_STATS: (workspaceId: string) => `workspace:stats:${workspaceId}`,
} as const;
