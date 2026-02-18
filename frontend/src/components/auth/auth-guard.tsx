'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { LoadingScreen } from '@/components/ui/spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized, user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isInitialized) return;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

    if (!isAuthenticated && !isPublicRoute) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && isPublicRoute) {
      router.push('/dashboard');
      return;
    }

    if (requireAdmin && isAuthenticated && !user?.isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isInitialized, pathname, router, requireAdmin, user]);

  if (!isInitialized) {
    return <LoadingScreen />;
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!isAuthenticated && !isPublicRoute) {
    return <LoadingScreen />;
  }

  if (requireAdmin && !user?.isAdmin) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
