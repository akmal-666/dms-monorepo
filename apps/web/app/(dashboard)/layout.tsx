'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, token, isLoading } = useAuthStore();

  useEffect(() => {
    // Client-side authentication check
    if (!isLoading && (!user || !token)) {
      router.push('/login');
    }
  }, [user, token, isLoading, router]);

  if (isLoading || !user || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222,47%,6%)] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm font-semibold tracking-wider">Securing session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header />

        {/* Dynamic page contents */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
