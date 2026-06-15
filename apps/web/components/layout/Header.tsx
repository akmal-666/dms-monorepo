'use client';
import { Bell, Globe, Search, User as UserIcon, LogOut, Layout } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { useParams, useRouter } from 'next/navigation';
import DashboardSwitcher from './DashboardSwitcher';
import { useState } from 'react';

export default function Header() {
  const params = useParams();
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);
  
  const dashboardId = params?.dashboardId as string;
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const userName = user?.name || 'Jahen Doe';
  const userRole = user?.role ? user.role.toUpperCase() : 'ADMIN';

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Search or Switcher */}
      <div className="flex items-center gap-4">
        {dashboardId ? (
          <div className="flex items-center gap-3">
            <DashboardSwitcher />
          </div>
        ) : (
          <div className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Layout className="w-4 h-4 text-primary" />
            Dashboard Portal
          </div>
        )}

        {/* Search Input matching CRMi */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search here..."
            className="bg-secondary/40 border border-border rounded-xl pl-9 pr-4 py-1.5 text-xs w-64 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-foreground"
          />
        </div>
      </div>

      {/* Right side: Quick stats & Actions */}
      <div className="flex items-center gap-4">
        {/* Globe Flag mock */}
        <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors hidden sm:flex items-center gap-1">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold">EN</span>
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-card" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* User profile section matching CRMi top right */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(v => !v)}
            className="flex items-center gap-2.5 hover:bg-secondary/50 p-1.5 rounded-xl transition-all border border-transparent hover:border-border"
          >
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-foreground leading-none">{userName}</span>
              <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">{userRole}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {userName.charAt(0)}
            </div>
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute top-full right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 py-1.5 animate-scale-in">
                <div className="px-3 py-1.5 border-b border-border/60 mb-1">
                  <p className="text-xs font-bold text-foreground">{userName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'admin@dms.local'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/5 flex items-center gap-2 font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
