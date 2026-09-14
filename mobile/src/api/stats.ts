import { api } from './client';
import type { AnalyticsData, BadgeCatalogItem, DailyProgress, LeaderboardPeriod, LeaderboardResponse, Stats, UserBadge, UserReport, XpSummary } from './types';

export type ReportExportFormat = 'csv' | 'xlsx' | 'pdf';

export const statsApi = {
  getSummary: async (): Promise<Stats> => {
    const res = await api.get<Stats>('/stats/summary');
    return res.data;
  },
  getHistory: async (days = 14): Promise<DailyProgress[]> => {
    const res = await api.get<DailyProgress[]>('/stats/history', { params: { days } });
    return res.data;
  },
  getAnalytics: async (): Promise<AnalyticsData> => {
    const res = await api.get<AnalyticsData>('/stats/analytics');
    return res.data;
  },
  getXp: async (): Promise<XpSummary> => {
    const res = await api.get<XpSummary>('/stats/xp');
    return res.data;
  },
  getLeaderboard: async (period: LeaderboardPeriod = 'all', limit = 5): Promise<LeaderboardResponse> => {
    const res = await api.get<LeaderboardResponse>('/stats/leaderboard', { params: { period, limit } });
    return res.data;
  },
  getBadges: async (): Promise<UserBadge[]> => {
    const res = await api.get<UserBadge[]>('/stats/badges');
    return res.data;
  },
  getBadgesCatalog: async (): Promise<BadgeCatalogItem[]> => {
    const res = await api.get<BadgeCatalogItem[]>('/stats/badges/catalog');
    return res.data;
  },
  getUserReport: async (period: 'week' | 'month' = 'week'): Promise<UserReport> => {
    const res = await api.get<UserReport>('/stats/report', { params: { period } });
    return res.data;
  },
  // İstatistik & Raporlama V2 öncelik #3, Faz 3 madde F — rapor e-postayla
  // gönderme. Web'deki exportUserReport (indirme) MOBİLDE BİLİNÇLİ OLARAK
  // eklenmedi: blob indirme + native paylaşım expo-file-system/expo-sharing
  // gerektiriyor, bu da yeni native modül + tam EAS rebuild demek (şu an
  // iOS build kotası 1 Ekim'e kadar bloke, bkz. Madde 6 notu) — sadece bu
  // özellik için o maliyete girmeye değmez. E-posta gönderimi ise backend'e
  // saf bir POST çağrısı, native bağımlılık gerektirmiyor.
  sendUserReportEmail: async (
    period: 'week' | 'month', format: ReportExportFormat
  ): Promise<{ sent: boolean; to: string }> => {
    const res = await api.post('/stats/report/send-email', null, { params: { period, format } });
    return res.data;
  },
};
