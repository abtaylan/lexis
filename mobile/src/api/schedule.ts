import { api } from './client';
import type { ScheduleCreate, ScheduleItem, ScheduleTemplate, ScheduleTemplateCreate, ScheduleMiss, RoadmapResponse } from './types';

export const scheduleApi = {
  getAll: async (): Promise<ScheduleItem[]> => {
    const res = await api.get('/schedule');
    return res.data.items;
  },
  create: async (data: ScheduleCreate): Promise<ScheduleItem> => {
    const res = await api.post<ScheduleItem>('/schedule', data);
    return res.data;
  },
  update: async (
    id: string,
    data: Partial<ScheduleCreate> & { is_active?: boolean; clear_reminder?: boolean }
  ): Promise<ScheduleItem> => {
    const res = await api.patch<ScheduleItem>(`/schedule/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/schedule/${id}`);
  },
  getTemplates: async (): Promise<ScheduleTemplate[]> => {
    const res = await api.get('/schedule/templates');
    return res.data.templates;
  },
  createTemplate: async (data: ScheduleTemplateCreate): Promise<ScheduleTemplate> => {
    const res = await api.post<ScheduleTemplate>('/schedule/templates', data);
    return res.data;
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/schedule/templates/${id}`);
  },
  // 9 Ekim 2026 -- "calisma programi telefon takvimine entegre olsun"
  // istegi: webcal/https ICS feed linkini doner (backend token yoksa
  // olusturur, bkz. backend/app/api/routes/schedule.py::get_calendar_feed).
  getCalendarFeed: async (): Promise<{ feed_url: string; webcal_url: string }> => {
    const res = await api.get('/schedule/calendar-feed');
    return res.data;
  },

  // ── Kaçırılan gün/etkinlik takibi (15 Ekim 2026 kullanıcı isteği) ──────
  markMissed: async (scheduleItemId: string): Promise<ScheduleMiss> => {
    const res = await api.post<ScheduleMiss>('/schedule/missed', { schedule_item_id: scheduleItemId });
    return res.data;
  },
  getMissed: async (): Promise<ScheduleMiss[]> => {
    const res = await api.get('/schedule/missed');
    return res.data.items;
  },
  resolveMissed: async (missId: string): Promise<ScheduleMiss> => {
    const res = await api.post<ScheduleMiss>(`/schedule/missed/${missId}/resolve`);
    return res.data;
  },

  // ── Canlı "Program Haritası" (15 Ekim 2026 kullanıcı isteği) ───────────
  getRoadmap: async (): Promise<RoadmapResponse> => {
    const res = await api.get<RoadmapResponse>('/schedule/roadmap');
    return res.data;
  },
};
