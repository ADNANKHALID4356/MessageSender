'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Facebook,
  CheckCircle2,
  AlertCircle,
  Unplug,
  RefreshCw,
  Loader2,
  ExternalLink,
  Shield,
  Clock,
  Plug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  useFacebookConnectionStatus,
  useInitiateFacebookOAuth,
  useDisconnectFacebookAccount,
  useRefreshFacebookAccount,
} from '@/hooks';
import { PageSelectionModal } from './page-selection-modal';
import { facebookService } from '@/services/facebook.service';

interface FacebookConnectionCardProps {
  workspaceId: string;
  onConnectionChange?: () => void;
  className?: string;
}

export function FacebookConnectionCard({
  workspaceId,
  onConnectionChange,
  className,
}: FacebookConnectionCardProps) {
  const searchParams = useSearchParams();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showPageSelectionModal, setShowPageSelectionModal] = useState(false);
  const [mockConnecting, setMockConnecting] = useState(false);
  const [oauthMessage, setOauthMessage] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // API hooks
  const { 
    data: connectionStatus, 
    isLoading, 
    refetch: refetchStatus 
  } = useFacebookConnectionStatus(workspaceId, {
    enabled: !!workspaceId,
  });

  const initiateOAuth = useInitiateFacebookOAuth({
    onSuccess: (data) => {
      // Redirect to Facebook OAuth
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      setOauthMessage({
        type: 'error',
        message: error.message || 'Failed to initiate Facebook connection',
      });
    },
  });

  const disconnectAccount = useDisconnectFacebookAccount({
    onSuccess: () => {
      setShowDisconnectDialog(false);
      refetchStatus();
      onConnectionChange?.();
    },
    onError: (error) => {
      setOauthMessage({
        type: 'error',
        message: error.message || 'Failed to disconnect account',
      });
    },
  });

  const refreshToken = useRefreshFacebookAccount({
    onSuccess: () => {
      refetchStatus();
      setOauthMessage({
        type: 'success',
        message: 'Token refreshed successfully!',
      });
    },
    onError: (error) => {
      setOauthMessage({
        type: 'error',
        message: error.message || 'Failed to refresh token',
      });
    },
  });

  // Handle OAuth callback messages from URL
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');
    const facebookAccountId = searchParams.get('facebookAccountId');
    const tab = searchParams.get('tab');

    // Only process if we're on the integrations tab
    if (tab !== 'integrations' && !success && !error) return;

    if (success === 'true') {
      setOauthMessage({
        type: 'success',
        message: 'Facebook account connected successfully!',
      });
      // Show page selection modal after successful connection
      if (facebookAccountId) {
        setShowPageSelectionModal(true);
      }
      refetchStatus();
      onConnectionChange?.();
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      setOauthMessage({
        type: 'error',
        message: errorMessage || `OAuth error: ${error}`,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, refetchStatus, onConnectionChange]);

  // Clear message after 5 seconds
  useEffect(() => {
    if (oauthMessage) {
      const timer = setTimeout(() => setOauthMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [oauthMessage]);

  const handleConnect = () => {
    initiateOAuth.mutate(workspaceId);
  };

  const handleDisconnect = () => {
    disconnectAccount.mutate(workspaceId);
  };

  const handleRefreshToken = () => {
    if (connectionStatus?.account?.id) {
      refreshToken.mutate(connectionStatus.account.id);
    }
  };

  const handleMockConnect = async () => {
    setMockConnecting(true);
    try {
      await facebookService.createMockConnection(workspaceId);
      setOauthMessage({
        type: 'success',
        message: 'Mock Facebook account connected successfully! 3 demo pages created.',
      });
      refetchStatus();
      onConnectionChange?.();
    } catch (error: any) {
      setOauthMessage({
        type: 'error',
        message: error.message || 'Failed to create mock connection',
      });
    } finally {
      setMockConnecting(false);
    }
  };

  // Calculate token expiry status
  const getTokenStatus = () => {
    if (!connectionStatus?.account?.tokenExpiresAt) return null;
    
    const expiresAt = new Date(connectionStatus.account.tokenExpiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Token expired', color: 'text-red-500' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, color: 'text-amber-500' };
    } else {
      return { status: 'valid', message: `Valid for ${daysUntilExpiry} days`, color: 'text-green-500' };
    }
  };

  const tokenStatus = getTokenStatus();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Facebook className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Facebook Connection</CardTitle>
              <CardDescription>Loading connection status...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                connectionStatus?.connected 
                  ? "bg-green-100 dark:bg-green-900/30" 
                  : "bg-blue-100 dark:bg-blue-900/30"
              )}>
                <Facebook className={cn(
                  "h-5 w-5",
                  connectionStatus?.connected ? "text-green-600" : "text-blue-600"
                )} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Facebook Connection
                  {connectionStatus?.connected && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  {connectionStatus?.connected
                    ? `Connected as ${connectionStatus.account?.name || 'Unknown'}`
                    : 'Connect your Facebook account to manage pages'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* OAuth Messages */}
          {oauthMessage && (
            <Alert variant={oauthMessage.type === 'error' ? 'destructive' : 'default'}>
              {oauthMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{oauthMessage.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>{oauthMessage.message}</AlertDescription>
            </Alert>
          )}

          {connectionStatus?.connected ? (
            <>
              {/* Connected Account Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {connectionStatus.account?.name?.charAt(0).toUpperCase() || 'F'}
                    </div>
                    <div>
                      <p className="font-medium">{connectionStatus.account?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Facebook User ID: {connectionStatus.account?.facebookUserId}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://facebook.com/${connectionStatus.account?.facebookUserId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>

                {/* Token Status */}
                {tokenStatus && (
                  <div className={cn(
                    "flex items-center gap-2 text-sm",
                    tokenStatus.color
                  )}>
                    <Clock className="h-4 w-4" />
                    <span>{tokenStatus.message}</span>
                    {tokenStatus.status !== 'valid' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefreshToken}
                        disabled={refreshToken.isPending}
                        className="h-6 text-xs"
                      >
                        {refreshToken.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Refresh
                      </Button>
                    )}
                  </div>
                )}

                {/* Connected Pages Count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>
                    {connectionStatus.pages?.length || 0} page(s) connected
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPageSelectionModal(true)}
                  className="flex-1"
                >
                  <Plug className="h-4 w-4 mr-2" />
                  Manage Pages
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRefreshToken}
                  disabled={refreshToken.isPending}
                >
                  {refreshToken.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDisconnectDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <Facebook className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h4 className="font-medium mb-2">Connect Your Facebook Account</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Facebook account to start managing your pages 
                  and receiving messages from customers.
                </p>
                <ul className="text-sm text-muted-foreground text-left space-y-2 mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Manage multiple Facebook Pages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Receive and respond to messages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Send bulk messages and campaigns</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Track analytics and engagement</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={handleConnect} 
                  disabled={initiateOAuth.isPending || mockConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {initiateOAuth.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Facebook className="h-4 w-4 mr-2" />
                  )}
                  Connect with Facebook
                </Button>

                {/* Development Mode - Mock Connect Button (only visible in dev) */}
                {process.env.NODE_ENV === 'development' && (
                <Button 
                  onClick={handleMockConnect} 
                  disabled={mockConnecting || initiateOAuth.isPending}
                  variant="outline"
                  className="w-full border-dashed"
                  size="lg"
                >
                  {mockConnecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Use Mock Mode (Dev Only)
                </Button>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-center text-muted-foreground">
                  By connecting, you agree to grant necessary permissions to manage your pages.
                  You can disconnect at any time.
                </p>
                <p className="text-xs text-center text-amber-600 dark:text-amber-500">
                  💡 Use Mock Mode to test without Facebook App credentials
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Facebook Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your Facebook account? 
              This will remove all connected pages and you will no longer 
              receive messages from customers.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Warning: This action cannot be undone
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  All page connections, message history context, and campaign settings 
                  related to this Facebook account will be removed.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectAccount.isPending}
            >
              {disconnectAccount.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Disconnect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Selection Modal */}
      {connectionStatus?.account?.id && (
        <PageSelectionModal
          open={showPageSelectionModal}
          onOpenChange={setShowPageSelectionModal}
          workspaceId={workspaceId}
          facebookAccountId={connectionStatus.account.id}
          onSuccess={() => {
            refetchStatus();
            onConnectionChange?.();
          }}
        />
      )}
    </>
  );
}
