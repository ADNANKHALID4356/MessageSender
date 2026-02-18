import api, { tokenManager, ApiResponse, PaginatedResponse } from '@/lib/api-client';

// ===========================================
// Types
// ===========================================

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
  isAdmin?: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface AdminSignupRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

export interface UserSignupRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName?: string;
}

export interface SignupResponse {
  message: string;
  userId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Fallback for display
  username?: string;
  isAdmin: boolean;
  workspaces?: WorkspaceMembership[];
  currentWorkspaceId?: string;
}

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  role: 'owner' | 'manager' | 'agent';
  permissions: string[];
  permissionLevel?: string; // Backend uses this
}

export interface PendingUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  createdAt: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLoginAt: string | null;
  workspaces: {
    workspaceId: string;
    workspaceName: string;
    permissionLevel: string;
  }[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  username?: string;
}

export interface NotificationPreferences {
  email: {
    newMessage: boolean;
    campaignComplete: boolean;
    weeklyReport: boolean;
    securityAlerts: boolean;
  };
  push: {
    messages: boolean;
    mentions: boolean;
    updates: boolean;
  };
}

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ===========================================
// Auth Service
// ===========================================

export const authService = {
  /**
   * Check if admin account exists
   */
  async checkAdminExists(): Promise<{ exists: boolean }> {
    return api.get<{ exists: boolean }>('/auth/admin/exists');
  },

  /**
   * Admin signup (only works if no admin exists)
   */
  async adminSignup(data: AdminSignupRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/admin/signup', data);
    tokenManager.setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  /**
   * User signup (requires admin approval)
   */
  async userSignup(data: UserSignupRequest): Promise<SignupResponse> {
    return api.post<SignupResponse>('/auth/signup', data);
  },

  /**
   * Login with credentials
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const endpoint = data.isAdmin ? '/auth/admin/login' : '/auth/login';
    const response = await api.post<LoginResponse>(endpoint, {
      username: data.username,
      password: data.password,
      rememberMe: data.rememberMe,
    });

    // Store tokens
    tokenManager.setTokens(response.accessToken, response.refreshToken);

    return response;
  },

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens();
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    });

    tokenManager.setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<AuthUser> {
    return api.get<AuthUser>('/auth/me');
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileRequest): Promise<AuthUser> {
    return api.patch<AuthUser>('/auth/profile', data);
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/change-password', data);
  },

  /**
   * Logout from all sessions
   */
  async logoutAll(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/logout-all');
  },

  // ===========================================
  // Notification Preferences
  // ===========================================

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return api.get<NotificationPreferences>('/auth/notification-preferences');
  },

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return api.patch<NotificationPreferences>('/auth/notification-preferences', prefs);
  },

  // ===========================================
  // Session Management
  // ===========================================

  /**
   * Get all active sessions
   */
  async getSessions(): Promise<SessionInfo[]> {
    return api.get<SessionInfo[]>('/auth/sessions');
  },

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/auth/sessions/${sessionId}/terminate`);
  },

  /**
   * Set current workspace
   */
  async setCurrentWorkspace(workspaceId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/workspace', { workspaceId });
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = tokenManager.getAccessToken();
    if (!token) return false;
    return !tokenManager.isTokenExpired(token);
  },

  // ===========================================
  // Admin: User Management
  // ===========================================

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<ManagedUser[]> {
    return api.get<ManagedUser[]>('/auth/admin/users');
  },

  /**
   * Get pending users awaiting approval (admin only)
   */
  async getPendingUsers(): Promise<PendingUser[]> {
    return api.get<PendingUser[]>('/auth/admin/users/pending');
  },

  /**
   * Approve a pending user (admin only)
   */
  async approveUser(
    userId: string,
    workspaceId?: string,
    permissionLevel?: string
  ): Promise<{ message: string }> {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (permissionLevel) params.append('permissionLevel', permissionLevel);
    const queryString = params.toString();
    return api.post<{ message: string }>(
      `/auth/admin/users/${userId}/approve${queryString ? `?${queryString}` : ''}`
    );
  },

  /**
   * Reject a pending user (admin only)
   */
  async rejectUser(userId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/auth/admin/users/${userId}/reject`);
  },

  /**
   * Deactivate a user (admin only)
   */
  async deactivateUser(userId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/auth/admin/users/${userId}/deactivate`);
  },

  /**
   * Reactivate a user (admin only)
   */
  async reactivateUser(userId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/auth/admin/users/${userId}/reactivate`);
  },

  /**
   * Grant workspace access to a user (admin only)
   */
  async grantWorkspaceAccess(
    userId: string,
    workspaceId: string,
    permissionLevel: string
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/auth/admin/users/${userId}/workspace-access?workspaceId=${workspaceId}&permissionLevel=${permissionLevel}`
    );
  },

  /**
   * Revoke workspace access from a user (admin only)
   */
  async revokeWorkspaceAccess(
    userId: string,
    workspaceId: string
  ): Promise<{ message: string }> {
    return api.post<{ message: string }>(
      `/auth/admin/users/${userId}/workspace-access/revoke?workspaceId=${workspaceId}`
    );
  },
};

export default authService;
