import { api } from './client';
import type { ScheduleCreate, ScheduleItem, ScheduleTemplate, ScheduleTemplateCreate } from './types';

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
};
