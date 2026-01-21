'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useGuide } from '@/lib/guide';
import { Sidebar } from '@/components/layout/Sidebar';
import { GuideOverlay } from '@/components/guides/GuideOverlay';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { startGuide, hasCompletedGuide } = useGuide();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  useEffect(() => {
    // Start the dashboard guide for new users
    if (mounted && isAuthenticated && !hasCompletedGuide('dashboard')) {
      const timer = setTimeout(() => {
        startGuide('dashboard');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mounted, isAuthenticated, hasCompletedGuide, startGuide]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-beige-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-ink-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-ink-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige-200">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
      <GuideOverlay />
    </div>
  );
}
