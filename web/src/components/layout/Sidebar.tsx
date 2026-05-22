'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard, BookOpen, Layers, BrainCircuit,
  Calendar, Settings, LogOut, Shield, Zap
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useStats } from '@/hooks/useStats';
import { ProgressBar } from '@/components/ui';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/words',      label: 'Kelimeler',   icon: BookOpen },
  { href: '/flashcards', label: 'Flashcards',  icon: Layers },
  { href: '/quiz',       label: 'Quiz',        icon: BrainCircuit },
  { href: '/schedule',   label: 'Program',     icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: stats } = useStats();

  const todayProgress = stats
    ? Math.min(100, Math.round((stats.words_learned_today / stats.daily_goal) * 100))
    : 0;

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-100 flex flex-col z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-slate-800 tracking-tight">Lexis</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-sky-50 text-sky-600'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}

        {user?.is_admin && (
          <Link
            href="/admin"
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mt-2 border border-dashed',
              pathname.startsWith('/admin')
                ? 'border-sky-200 bg-sky-50 text-sky-600'
                : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
            )}
          >
            <Shield size={18} strokeWidth={2} />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-4">
        {/* Daily goal */}
        {stats && (
          <div className="px-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium text-slate-500">Günlük Hedef</span>
              <span className="text-xs font-semibold text-slate-700">
                {stats.words_learned_today}/{stats.daily_goal}
              </span>
            </div>
            <ProgressBar value={todayProgress} color="blue" size="sm" />
          </div>
        )}

        {/* Streak */}
        {stats && stats.streak_days > 0 && (
          <div className="flex items-center gap-2 px-2">
            <span className="text-base">🔥</span>
            <span className="text-xs text-slate-500">
              <b className="text-slate-700">{stats.streak_days}</b> günlük seri
            </span>
          </div>
        )}

        {/* Profile / Logout */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-xs font-medium text-slate-600 truncate">{user?.username}</span>
          </div>
          <button
            onClick={logout}
            title="Çıkış"
            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
