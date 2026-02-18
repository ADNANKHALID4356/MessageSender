'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSearchParams } from 'next/navigation';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Key,
  Save,
  Eye,
  EyeOff,
  Link,
  Loader2,
  Monitor,
  Smartphone,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore } from '@/stores';
import { FacebookConnectionCard } from '@/components/facebook';
import { useUpdateProfile, useChangePassword, useSessions, useTerminateSession } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/auth.service';
import { PasswordStrengthIndicator } from '@/components/ui/form-field';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Parse user-agent string for display-friendly device/browser info
 */
function parseUserAgent(ua: string | null): { browser: string; os: string; isMobile: boolean } {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', isMobile: false };

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

  let browser = 'Unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os, isMobile };
}

/**
 * Format a date string as a relative time (e.g. "2 hours ago")
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Active Sessions list component with real data from the API
 */
function SessionsList({
  onLogoutAll,
  isLoggingOutAll,
}: {
  onLogoutAll: () => void;
  isLoggingOutAll: boolean;
}) {
  const { data: sessions, isLoading } = useSessions();
  const terminateSession = useTerminateSession({
    onSuccess: () => {
      // toast is not available here; parent toasts are triggered by invalidation
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sessionList = sessions || [];

  return (
    <div className="space-y-3">
      {sessionList.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No active sessions found</p>
      ) : (
        sessionList.map((session) => {
          const { browser, os, isMobile } = parseUserAgent(session.userAgent);
          const DeviceIcon = isMobile ? Smartphone : Monitor;

          return (
            <div
              key={session.id}
              className={cn(
                'flex items-center justify-between p-3 border rounded-lg',
                session.isCurrent && 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center',
                  session.isCurrent
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-muted'
                )}>
                  <DeviceIcon className={cn(
                    'h-5 w-5',
                    session.isCurrent ? 'text-green-600' : 'text-muted-foreground'
                  )} />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {browser} on {os}
                    {session.isCurrent && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress || 'Unknown IP'} · {formatRelativeTime(session.createdAt)}
                  </p>
                </div>
              </div>
              {!session.isCurrent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => terminateSession.mutate(session.id)}
                  disabled={terminateSession.isPending}
                  title="Terminate session"
                >
                  {terminateSession.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          );
        })
      )}
      {sessionList.length > 1 && (
        <Button
          variant="outline"
          className="w-full text-destructive"
          onClick={onLogoutAll}
          disabled={isLoggingOutAll}
        >
          {isLoggingOutAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Sign out all other sessions
        </Button>
      )}
    </div>
  );
}

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'integrations', label: 'Integrations', icon: Link },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Auto-switch tab based on URL param (e.g., ?tab=integrations from OAuth callback)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tabs.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Profile form state
  const [profileName, setProfileName] = useState(user?.name || user?.firstName || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileUsername, setProfileUsername] = useState(user?.username || '');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileTimezone, setProfileTimezone] = useState('UTC');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordTouched, setPasswordTouched] = useState<Record<string, boolean>>({});

  // Session management state
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // Notification preferences (API-backed with localStorage fallback)
  const [emailNotifs, setEmailNotifs] = useState({
    newMessage: true,
    campaignComplete: true,
    weeklyReport: true,
    securityAlerts: true,
  });
  const [pushNotifs, setPushNotifs] = useState({
    messages: true,
    mentions: true,
    updates: true,
  });

  // Interface density state
  const [density, setDensity] = useState('Default');
  const [isSavingNotifs, setIsSavingNotifs] = useState(false);

  // Load preferences from API on mount, fall back to localStorage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await authService.getNotificationPreferences();
        if (prefs.email) setEmailNotifs(prev => ({ ...prev, ...prefs.email }));
        if (prefs.push) setPushNotifs(prev => ({ ...prev, ...prefs.push }));
      } catch {
        // Fall back to localStorage
        try {
          const saved = localStorage.getItem('notification_prefs');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.email) setEmailNotifs(parsed.email);
            if (parsed.push) setPushNotifs(parsed.push);
          }
        } catch {}
      }
      try {
        const savedDensity = localStorage.getItem('ui_density');
        if (savedDensity) setDensity(savedDensity);
      } catch {}
    };
    loadPreferences();
  }, []);
  // Mutations
  const updateProfile = useUpdateProfile({
    onSuccess: () => {
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' });
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast({ title: 'Password changed', description: 'Your password has been changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleProfileSave = () => {
    const errors: Record<string, string> = {};
    if (!profileName.trim()) errors.name = 'Name is required';
    if (!profileEmail.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail)) {
      errors.email = 'Enter a valid email address';
    }
    if (!profileUsername.trim()) {
      errors.username = 'Username is required';
    } else if (profileUsername.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});
    updateProfile.mutate({
      name: profileName,
      email: profileEmail,
      username: profileUsername,
    });
  };

  const validatePasswordFields = (): boolean => {
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = 'Current password is required';
    if (!newPassword) {
      errors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      errors.newPassword = 'Include uppercase, lowercase, number, and special character';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setPasswordErrors(errors);
    setPasswordTouched({ currentPassword: true, newPassword: true, confirmPassword: true });
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = () => {
    if (!validatePasswordFields()) return;
    changePassword.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleLogoutAllSessions = async () => {
    setIsLoggingOutAll(true);
    try {
      await authService.logoutAll();
      toast({ title: 'Sessions terminated', description: 'All other sessions have been signed out.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out sessions';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsLoggingOutAll(false);
    }
  };

  const handleSaveNotificationPrefs = async () => {
    setIsSavingNotifs(true);
    try {
      await authService.updateNotificationPreferences({
        email: emailNotifs,
        push: pushNotifs,
      });
      // Also save to localStorage as cache
      localStorage.setItem('notification_prefs', JSON.stringify({
        email: emailNotifs,
        push: pushNotifs,
      }));
      toast({ title: 'Saved', description: 'Notification preferences saved.' });
    } catch {
      // Fall back to localStorage-only save
      try {
        localStorage.setItem('notification_prefs', JSON.stringify({
          email: emailNotifs,
          push: pushNotifs,
        }));
        toast({ title: 'Saved locally', description: 'Preferences saved locally. Server sync will retry.' });
      } catch {
        toast({ title: 'Error', description: 'Failed to save preferences.', variant: 'destructive' });
      }
    } finally {
      setIsSavingNotifs(false);
    }
  };

  const handleDensityChange = (d: string) => {
    setDensity(d);
    localStorage.setItem('ui_density', d);
    toast({ title: 'Preference saved', description: `Interface density set to ${d}.` });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {profileName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => toast({ title: 'Coming Soon', description: 'Avatar upload will be available in a future update.' })}>
                      Change Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className={cn(profileErrors.name && 'text-destructive')}>Full Name</Label>
                    <Input
                      id="name"
                      value={profileName}
                      onChange={(e) => { setProfileName(e.target.value); if (profileErrors.name) setProfileErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
                      aria-invalid={!!profileErrors.name}
                      aria-describedby={profileErrors.name ? 'name-error' : undefined}
                      className={cn(profileErrors.name && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {profileErrors.name && (
                      <p id="name-error" className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {profileErrors.name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className={cn(profileErrors.email && 'text-destructive')}>Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => { setProfileEmail(e.target.value); if (profileErrors.email) setProfileErrors(prev => { const n = { ...prev }; delete n.email; return n; }); }}
                      aria-invalid={!!profileErrors.email}
                      aria-describedby={profileErrors.email ? 'email-error' : undefined}
                      className={cn(profileErrors.email && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {profileErrors.email && (
                      <p id="email-error" className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {profileErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className={cn(profileErrors.username && 'text-destructive')}>Username</Label>
                    <Input
                      id="username"
                      value={profileUsername}
                      onChange={(e) => { setProfileUsername(e.target.value); if (profileErrors.username) setProfileErrors(prev => { const n = { ...prev }; delete n.username; return n; }); }}
                      aria-invalid={!!profileErrors.username}
                      aria-describedby={profileErrors.username ? 'username-error' : undefined}
                      className={cn(profileErrors.username && 'border-destructive focus-visible:ring-destructive')}
                    />
                    {profileErrors.username && (
                      <p id="username-error" className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {profileErrors.username}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={profileTimezone}
                    onChange={(e) => setProfileTimezone(e.target.value)}
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="EST">EST (Eastern Standard Time)</option>
                    <option value="PST">PST (Pacific Standard Time)</option>
                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleProfileSave} disabled={updateProfile.isPending}>
                    {updateProfile.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            {currentWorkspace?.id ? (
              <FacebookConnectionCard 
                workspaceId={currentWorkspace.id}
                onConnectionChange={() => {
                  // Refresh workspace data if needed
                }}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Facebook Integration</CardTitle>
                  <CardDescription>
                    Select a workspace to manage Facebook connections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Please select a workspace from the sidebar to configure Facebook integration.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>API Access</CardTitle>
                <CardDescription>
                  Manage API keys for external integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">API Key</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      ••••••••••••••••••••••••
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast({ title: 'Coming Soon', description: 'API key management will be available in a future update.' })}>
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this key to access the MessageSender API. Keep it secret!
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Configure external webhook endpoints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input 
                    id="webhook-url" 
                    placeholder="https://your-server.com/webhook" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Events to send</Label>
                  <div className="space-y-2">
                    {[
                      { id: 'message-received', label: 'Message Received' },
                      { id: 'message-sent', label: 'Message Sent' },
                      { id: 'contact-created', label: 'Contact Created' },
                      { id: 'campaign-completed', label: 'Campaign Completed' },
                    ].map((event) => (
                      <div key={event.id} className="flex items-center gap-2">
                        <Checkbox id={event.id} />
                        <Label htmlFor={event.id} className="cursor-pointer text-sm">
                          {event.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => toast({ title: 'Coming Soon', description: 'Webhook configuration will be available in a future update.' })}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Choose what notifications you receive via email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: 'new-message', key: 'newMessage' as const, label: 'New Messages', description: 'Get notified when you receive new messages' },
                  { id: 'campaign-complete', key: 'campaignComplete' as const, label: 'Campaign Completed', description: 'Receive updates when campaigns finish' },
                  { id: 'weekly-report', key: 'weeklyReport' as const, label: 'Weekly Reports', description: 'Get weekly analytics summary' },
                  { id: 'security-alerts', key: 'securityAlerts' as const, label: 'Security Alerts', description: 'Important security notifications' },
                ].map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox
                      id={item.id}
                      checked={emailNotifs[item.key]}
                      onCheckedChange={(checked) =>
                        setEmailNotifs(prev => ({ ...prev, [item.key]: !!checked }))
                      }
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor={item.id} className="cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveNotificationPrefs} disabled={isSavingNotifs}>
                    {isSavingNotifs ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>
                  Control in-app and browser notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: 'push-messages', key: 'messages' as const, label: 'Real-time Messages', description: 'Show notifications for incoming messages' },
                  { id: 'push-mentions', key: 'mentions' as const, label: 'Mentions', description: 'Get notified when someone mentions you' },
                  { id: 'push-updates', key: 'updates' as const, label: 'System Updates', description: 'Updates about new features and changes' },
                ].map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <Checkbox
                      id={item.id}
                      checked={pushNotifs[item.key]}
                      onCheckedChange={(checked) =>
                        setPushNotifs(prev => ({ ...prev, [item.key]: !!checked }))
                      }
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor={item.id} className="cursor-pointer">
                        {item.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="current-password"
                    className={cn(passwordErrors.currentPassword && passwordTouched.currentPassword && 'text-destructive')}
                  >
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordErrors.currentPassword) {
                          setPasswordErrors(prev => { const n = { ...prev }; delete n.currentPassword; return n; });
                        }
                      }}
                      onBlur={() => setPasswordTouched(prev => ({ ...prev, currentPassword: true }))}
                      aria-invalid={!!passwordErrors.currentPassword && passwordTouched.currentPassword}
                      aria-describedby={passwordErrors.currentPassword ? 'current-password-error' : undefined}
                      className={cn(passwordErrors.currentPassword && passwordTouched.currentPassword && 'border-destructive focus-visible:ring-destructive')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10"
                      tabIndex={-1}
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.currentPassword && passwordTouched.currentPassword && (
                    <p id="current-password-error" className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {passwordErrors.currentPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="new-password"
                    className={cn(passwordErrors.newPassword && passwordTouched.newPassword && 'text-destructive')}
                  >
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordErrors.newPassword) {
                          setPasswordErrors(prev => { const n = { ...prev }; delete n.newPassword; return n; });
                        }
                      }}
                      onBlur={() => setPasswordTouched(prev => ({ ...prev, newPassword: true }))}
                      aria-invalid={!!passwordErrors.newPassword && passwordTouched.newPassword}
                      aria-describedby="new-password-hint"
                      className={cn(passwordErrors.newPassword && passwordTouched.newPassword && 'border-destructive focus-visible:ring-destructive')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {passwordErrors.newPassword && passwordTouched.newPassword ? (
                    <p id="new-password-hint" className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {passwordErrors.newPassword}
                    </p>
                  ) : (
                    <p id="new-password-hint" className="text-xs text-muted-foreground">
                      Minimum 8 characters with uppercase, lowercase, number, and special character
                    </p>
                  )}
                  {newPassword && <PasswordStrengthIndicator password={newPassword} />}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirm-password"
                    className={cn(passwordErrors.confirmPassword && passwordTouched.confirmPassword && 'text-destructive')}
                  >
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordErrors.confirmPassword) {
                        setPasswordErrors(prev => { const n = { ...prev }; delete n.confirmPassword; return n; });
                      }
                    }}
                    onBlur={() => setPasswordTouched(prev => ({ ...prev, confirmPassword: true }))}
                    aria-invalid={!!passwordErrors.confirmPassword && passwordTouched.confirmPassword}
                    aria-describedby={passwordErrors.confirmPassword ? 'confirm-password-error' : confirmPassword && newPassword === confirmPassword ? 'confirm-password-match' : undefined}
                    className={cn(
                      passwordErrors.confirmPassword && passwordTouched.confirmPassword && 'border-destructive focus-visible:ring-destructive',
                      confirmPassword && newPassword === confirmPassword && !passwordErrors.confirmPassword && 'border-green-500 focus-visible:ring-green-500'
                    )}
                  />
                  {passwordErrors.confirmPassword && passwordTouched.confirmPassword ? (
                    <p id="confirm-password-error" className="text-sm text-destructive flex items-center gap-1 animate-in slide-in-from-top-1 fade-in duration-200">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {passwordErrors.confirmPassword}
                    </p>
                  ) : confirmPassword && newPassword === confirmPassword ? (
                    <p id="confirm-password-match" className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Passwords match
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handlePasswordChange}
                    disabled={changePassword.isPending || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {changePassword.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4 mr-2" />
                    )}
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-muted-foreground">
                      Use an authenticator app to generate verification codes
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => toast({ title: 'Coming Soon', description: 'Two-factor authentication will be available in a future update.' })}>Enable</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>
                  Manage devices where you&apos;re currently logged in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SessionsList
                  onLogoutAll={handleLogoutAllSessions}
                  isLoggingOutAll={isLoggingOutAll}
                />
              </CardContent>
            </Card>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>
                  Customize the appearance of the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { id: 'light', label: 'Light', preview: 'bg-white border' },
                    { id: 'dark', label: 'Dark', preview: 'bg-gray-900 border-gray-700' },
                    { id: 'system', label: 'System', preview: 'bg-gradient-to-r from-white to-gray-900 border' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      className={cn(
                        'p-4 border rounded-lg hover:border-primary transition-colors text-left',
                        theme === t.id && 'border-primary ring-2 ring-primary/20'
                      )}
                      onClick={() => setTheme(t.id)}
                    >
                      <div
                        className={cn(
                          'h-24 rounded-md mb-3',
                          t.preview
                        )}
                      />
                      <p className="font-medium">{t.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interface Density</CardTitle>
                <CardDescription>
                  Adjust the spacing and size of interface elements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {['Compact', 'Default', 'Comfortable'].map((d) => (
                    <Button
                      key={d}
                      variant={density === d ? 'secondary' : 'outline'}
                      onClick={() => handleDensityChange(d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tabs */}
        <nav className="md:w-48 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">{renderTabContent()}</div>
      </div>
    </div>
  );
}
