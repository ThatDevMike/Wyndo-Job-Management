'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useGuide } from '@/lib/guide';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/jobs', label: 'Jobs', icon: Calendar },
  { href: '/invoices', label: 'Invoices', icon: FileText },
];

const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { startGuide, hasCompletedGuide } = useGuide();

  const handleLogout = () => {
    logout();
    window.location.href = '/auth/login';
  };

  const handleStartGuide = () => {
    const currentPage = pathname.split('/')[1] || 'dashboard';
    startGuide(currentPage);
  };

  return (
    <aside
      data-guide="sidebar-nav"
      className="fixed left-0 top-0 h-screen w-64 bg-ink-900 text-beige-100 flex flex-col z-40"
    >
      {/* Logo */}
      <div className="p-6 border-b border-ink-700">
        <Link href="/dashboard" className="block">
          <h1 className="text-2xl font-display font-medium tracking-tight">Wyndo</h1>
          <p className="text-beige-500 text-sm mt-0.5">Job Management</p>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-beige-100 text-ink-900'
                  : 'text-beige-300 hover:bg-ink-800 hover:text-beige-100'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="ml-auto"
                >
                  <ChevronRight size={16} />
                </motion.div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help Section */}
      <div className="p-4 border-t border-ink-700">
        <button
          onClick={handleStartGuide}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-beige-300 hover:bg-ink-800 hover:text-beige-100 transition-all duration-200"
        >
          <HelpCircle size={20} />
          <span className="font-medium">Start Guide</span>
          {!hasCompletedGuide('dashboard') && (
            <span className="ml-auto w-2 h-2 rounded-full bg-beige-400 animate-pulse" />
          )}
        </button>

        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-beige-100 text-ink-900'
                  : 'text-beige-300 hover:bg-ink-800 hover:text-beige-100'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-beige-300 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">Sign out</span>
        </button>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-ink-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-beige-100 flex items-center justify-center text-ink-900 font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-beige-100 truncate">{user?.name || 'User'}</p>
            <p className="text-sm text-beige-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
