import { api } from './client';
import type { ExamReminder, ExamReminderCreate } from './types';

// Kullanıcı isteği (8 Eylül 2026) — tüm yabancı dil sınavları için sınav
// hatırlatıcısı. Bkz. backend/app/api/routes/exam_reminders.py.
export const examReminderApi = {
  getAll: async (): Promise<ExamReminder[]> => {
    const res = await api.get('/exam-reminders');
    return res.data.exam_reminders;
  },
  create: async (data: ExamReminderCreate): Promise<ExamReminder> => {
    const res = await api.post<ExamReminder>('/exam-reminders', data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/exam-reminders/${id}`);
  },
};
