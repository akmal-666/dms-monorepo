'use client';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Upload, 
  History, 
  Users, 
  Settings, 
  LogOut, 
  Layers, 
  User, 
  TrendingUp, 
  ClipboardList,
  Shield
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  
  const user = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const dashboardId = params?.dashboardId as string;

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  // Profile data from store or default fallback
  const userName = user?.name || 'Nil Yeager';
  const userRole = user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Super Admin';

  const menuItems = [
    {
      header: 'Main Menu',
      items: [
        {
          label: 'Dashboard Portal',
          icon: Layers,
          href: '/',
          active: pathname === '/',
        },
        ...(dashboardId
          ? [
              {
                label: 'Dashboard Overview',
                icon: LayoutDashboard,
                href: `/${dashboardId}`,
                active: pathname === `/${dashboardId}`,
              },
              {
                label: 'Excel Import',
                icon: Upload,
                href: `/${dashboardId}/import`,
                active: pathname === `/${dashboardId}/import`,
              },
            ]
          : []),
      ],
    },
    ...(dashboardId
      ? [
          {
            header: 'Management',
            items: [
              {
                label: 'Requirement Table',
                icon: ClipboardList,
                href: `/${dashboardId}#requirements-table`,
                active: false,
              },
              {
                label: 'Import History',
                icon: History,
                href: `/${dashboardId}#import-history`,
                active: false,
              },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col shrink-0">
      {/* Brand logo (CRMi-style) */}
      <div className="h-16 flex items-center px-6 border-b border-border gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary/20">
          C
        </div>
        <span className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1">
          CRM<span className="text-primary font-extrabold text-sm">i</span>
        </span>
      </div>

      {/* User profile card */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/40">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/80 to-purple-600 flex items-center justify-center text-white font-semibold shadow-inner border border-primary/20">
            {userName.charAt(0)}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-semibold text-foreground truncate">{userName}</span>
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <Shield className="w-3 h-3 text-primary shrink-0" />
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {menuItems.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            <h4 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {section.header}
            </h4>
            <div className="space-y-0.5">
              {section.items.map((item, iIdx) => (
                <Link
                  key={iIdx}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 group",
                    item.active
                      ? "sidebar-active"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <item.icon className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    item.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-border mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
