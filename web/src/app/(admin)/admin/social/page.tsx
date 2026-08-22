'use client';

import { useEffect, useState } from 'react';
import { Share2, Loader2, CheckCircle2, XCircle, Send, MessageSquare } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { SocialPost } from '@/types';

interface CronRunInfo {
  started_at: string;
  status: string;
}

export default function SocialAutomationPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [mode, setMode] = useState('');
  const [lastRun, setLastRun] = useState<CronRunInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getSocialPosts(30).then((res) => {
      setPosts(res.posts);
      setMode(res.mode);
      setLastRun(res.last_cron_run);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Sosyal Medya</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Günlük içerik paylaşımı otomasyonu (Telegram + Slack)</p>
      </div>

      <div className={`rounded-2xl px-4 py-3 text-sm ${mode === 'real' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
        Mod: <strong>{mode}</strong> — {mode === 'real' ? 'gerçek paylaşımlar Telegram/Slack kanallarına gidiyor.' : 'test modunda, gerçek paylaşım yapılmıyor, sadece log tutuluyor.'}
        {lastRun && <span className="block text-xs mt-1 opacity-80">Son cron çalışması: {new Date(lastRun.started_at).toLocaleString('tr-TR')} — {lastRun.status}</span>}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2"><Share2 className="w-4 h-4" />Son paylaşımlar</h2>
          <span className="text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{posts.length} kayıt</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              {['Tarih', 'Tür', 'İçerik', 'Telegram', 'Slack'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-500">Henüz paylaşım yapılmamış.</td></tr>
            ) : posts.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 hover:dark:bg-slate-800">
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{new Date(p.post_date).toLocaleDateString('tr-TR')}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#534AB7]">
                    {p.content_type === 'word' ? <MessageSquare className="w-3 h-3" /> : <Send className="w-3 h-3" />}{p.content_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400 truncate max-w-[280px]">{p.question_text || '—'}</td>
                <td className="px-4 py-3">{p.telegram_sent ? <CheckCircle2 className="w-4 h-4 text-[#3B6D11]" /> : <XCircle className="w-4 h-4 text-gray-300 dark:text-slate-600" />}</td>
                <td className="px-4 py-3">{p.slack_sent ? <CheckCircle2 className="w-4 h-4 text-[#3B6D11]" /> : <XCircle className="w-4 h-4 text-gray-300 dark:text-slate-600" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
