'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users, BarChart3, ArrowLeft, LogOut, ShieldCheck, Activity, CreditCard,
  BookOpen, Share2, Bell, Gamepad2, History, Smartphone, Eye,
} from 'lucide-react';
import { useAuth } from '@/store/auth';

// NOT: Bu dosya önceden artık var olmayan bir i18n API'sine (useT/t) bağlıydı
// — bkz. app/(admin)/layout.tsx'teki not. Admin panel iç kullanım için
// olduğundan burada bilinçli olarak sabit Türkçe metin kullanılıyor.
const adminNav = [
  { href: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { href: '/admin/stats', label: 'İstatistikler', icon: BarChart3 },
  { href: '/admin/system-health', label: 'Sistem Sağlığı', icon: Activity },
  { href: '/admin/payments', label: 'Ödemeler', icon: CreditCard },
  { href: '/admin/content', label: 'Kelime Havuzu', icon: BookOpen },
  { href: '/admin/social', label: 'Sosyal Medya', icon: Share2 },
  { href: '/admin/notifications-log', label: 'Bildirim Logları', icon: Bell },
  { href: '/admin/game-analytics', label: 'Oyun Analitiği', icon: Gamepad2 },
  { href: '/admin/audit-log', label: 'Denetim Kaydı', icon: History },
  { href: '/admin/mobile', label: 'Mobil Uygulama', icon: Smartphone },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => { logout(); router.push('/login'); };

  const displayName = user?.display_name || user?.username || user?.email?.split('@')[0] || 'Admin';
  const isReadonly = user?.role === 'admin_readonly';

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[#1e1b2e] text-gray-300 dark:text-slate-600 px-4 py-6 fixed left-0 top-0 overflow-y-auto">
      {/* Logo */}
      <div className="mb-6 px-2 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#534AB7] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <span className="text-base font-bold text-white tracking-tight">Lexis</span>
          <span className="block text-[10px] text-gray-400 dark:text-slate-500 -mt-0.5 uppercase tracking-wider">Yönetim Paneli</span>
        </div>
      </div>

      {isReadonly && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-300 text-xs">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>Salt görüntüleme modu</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {adminNav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-[#534AB7] text-white' : 'text-gray-400 dark:text-slate-500 hover:bg-white/5 hover:text-white'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </Link>
          );
        })}
      </nav>

      {/* Alt — uygulamaya dön + kullanıcı + çıkış */}
      <div className="mt-6 border-t border-white/10 pt-4 space-y-1">
        <Link href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 dark:text-slate-500 hover:bg-white/5 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 shrink-0" />Uygulamaya Dön
        </Link>

        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-[#534AB7] flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {displayName[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>

        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-400 dark:text-slate-500 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
