'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { GuideOverlay } from '@/components/guides/GuideOverlay';

export default function InvoicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-beige-200 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
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
