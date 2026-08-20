'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, BarChart3, ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useT } from '@/lib/i18n';

const adminNav = [
  { href: '/admin/users', key: 'admin.sidebar.navUsers', icon: Users },
  { href: '/admin/stats', key: 'admin.sidebar.navStats', icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();
  const { t } = useT();

  const handleLogout = () => { logout(); router.push('/login'); };

  const displayName = user?.display_name || user?.username || user?.email?.split('@')[0] || t('admin.sidebar.fallbackName');

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[#1e1b2e] text-gray-300 px-4 py-6 fixed left-0 top-0">
      {/* Logo */}
      <div className="mb-8 px-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#534AB7] flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-base font-bold text-white tracking-tight">Lexis</span>
          <span className="block text-[10px] text-gray-400 -mt-0.5 uppercase tracking-wider">{t('admin.sidebar.subtitle')}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {adminNav.map(({ href, key, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-[#534AB7] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{t(key)}
            </Link>
          );
        })}
      </nav>

      {/* Alt — uygulamaya dön + kullanıcı + çıkış */}
      <div className="mt-6 border-t border-white/10 pt-4 space-y-1">
        <Link href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 shrink-0" />{t('admin.sidebar.backToApp')}
        </Link>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#534AB7] flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {displayName[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />{t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
}
