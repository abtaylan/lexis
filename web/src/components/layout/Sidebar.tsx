'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Layers, HelpCircle,
  CalendarDays, ShieldCheck, LogOut, User, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/store/auth';

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/words',      label: 'Kelimeler',   icon: BookOpen },
  { href: '/flashcards', label: 'Flashcards',  icon: Layers },
  { href: '/quiz',       label: 'Quiz',        icon: HelpCircle },
  { href: '/schedule',   label: 'Program',     icon: CalendarDays },
  { href: '/stats',      label: 'İstatistik',  icon: BarChart3 },
  { href: '/profile',    label: 'Profil',      icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); router.push('/login'); };

  const displayName = user?.display_name || user?.username || user?.email?.split('@')[0] || 'Kullanıcı';
  const avatarLetter = displayName[0].toUpperCase();

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-gray-100 px-4 py-6 fixed left-0 top-0">
      <div className="mb-8 px-2">
        <span className="text-xl font-bold text-blue-600 tracking-tight">Lexis</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </Link>
          );
        })}
      </nav>

      {/* Admin için ayrı yönetim paneline kısayol */}
      {user?.is_admin && (
        <Link href="/admin/users"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#534AB7] bg-[#EEEDFE] hover:bg-[#e0ddfc] transition-colors mb-3">
          <ShieldCheck className="w-4 h-4 shrink-0" />Yönetim Paneli
        </Link>
      )}

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">{avatarLetter}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
