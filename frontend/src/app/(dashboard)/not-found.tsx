'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ArrowLeft,
  Search,
  MessageSquare,
  Users,
  Send,
  BarChart3,
  Settings,
  FileText,
  Tag,
  Inbox,
  Layout,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const quickLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, description: 'Overview & stats' },
  { href: '/inbox', label: 'Inbox', icon: Inbox, description: 'Messages & conversations' },
  { href: '/contacts', label: 'Contacts', icon: Users, description: 'Manage contacts' },
  { href: '/campaigns', label: 'Campaigns', icon: Send, description: 'View campaigns' },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, description: 'Performance data' },
  { href: '/settings', label: 'Settings', icon: Settings, description: 'Account settings' },
];

/**
 * Dashboard-level 404 page for routes inside the (dashboard) layout
 * (e.g., /dashboard/nonexistent-page)
 * Inherits the dashboard layout (sidebar, header) automatically.
 */
export default function DashboardNotFound() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-300">
      {/* 404 Visual */}
      <div className="relative mb-6">
        <div className="text-[100px] font-black text-primary/10 leading-none select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-3 bg-background rounded-xl shadow-md border">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-2">
        The page you&apos;re looking for doesn&apos;t exist within the dashboard.
      </p>
      {pathname && (
        <p className="text-sm text-muted-foreground/60 font-mono mb-8">
          {pathname}
        </p>
      )}

      {/* Quick Navigation */}
      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Quick Navigation
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {quickLinks.map(({ href, label, icon: Icon, description }) => (
            <Link key={href} href={href}>
              <Card className="hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Back button */}
      <Button asChild variant="outline" size="lg">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
    </div>
  );
}
