'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Send,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  Facebook,
  Tags,
  Filter,
  Megaphone,
  UserCog,
  Menu,
  X,
  Shield,
  FileText,
  Activity,
  FileCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Send Message', href: '/send-message', icon: Send },
  { title: 'Inbox', href: '/inbox', icon: MessageSquare, badge: 5 },
  { title: 'Contacts', href: '/contacts', icon: Users },
  { title: 'Segments', href: '/segments', icon: Filter },
  { title: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Reports', href: '/reports', icon: FileText },
  { title: 'Compliance', href: '/compliance', icon: Shield },
];

const managementNavItems: NavItem[] = [
  { title: 'Workspaces', href: '/workspaces', icon: Building2 },
  { title: 'Facebook Pages', href: '/pages', icon: Facebook },
  { title: 'Templates', href: '/templates', icon: FileCode },
  { title: 'Tags', href: '/tags', icon: Tags },
  { title: 'Team Members', href: '/team', icon: UserCog, adminOnly: true },
  { title: 'System Health', href: '/health', icon: Activity },
  { title: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [previousPathname, setPreviousPathname] = useState(pathname);

  // Close mobile menu when route changes (but not on initial mount)
  useEffect(() => {
    if (previousPathname !== pathname) {
      setPreviousPathname(pathname);
      if (mobileOpen) {
        onMobileClose?.();
      }
    }
  }, [pathname, previousPathname, mobileOpen, onMobileClose]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

    if (item.adminOnly && !user?.isAdmin) {
      return null;
    }

    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:text-foreground',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.title : undefined}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'inset-y-0 left-0 flex h-screen flex-col border-r bg-card transition-all duration-300 shrink-0',
          collapsed ? 'w-16' : 'w-64',
          // Mobile: fixed overlay with slide animation
          'fixed z-50',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: always visible, in normal document flow
          'lg:static lg:translate-x-0 lg:z-auto'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && <span className="font-semibold">MessageSender</span>}
          </Link>
          
          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                Main
              </p>
            )}
            {mainNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>

          {/* Management Navigation */}
          <div className="space-y-1 pt-4">
            {!collapsed && (
              <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
                Management
              </p>
            )}
            {managementNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </nav>

        {/* Collapse Toggle - Hidden on mobile */}
        <div className="border-t p-2 hidden lg:block">
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full', collapsed && 'px-2')}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Collapse
              </>
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
