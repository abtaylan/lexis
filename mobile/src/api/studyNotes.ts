// src/api/studyNotes.ts — "Çalışma Notlarım" (16 Ekim 2026 kullanıcı
// isteği -- mobil karşılığı). Web'deki lib/api.ts'teki studyNotesApi ile
// birebir aynı davranış; tek fark görsel yükleme: web'de File nesnesi var,
// React Native'de FormData'ya {uri, name, type} şeklinde (ImagePicker
// sonucundan) ekleniyor (RN'in standart multipart yükleme deseni).
//
// 16 Ekim 2026, İKİNCİ kullanıcı isteği (aynı gün): her kaynak (gemini/
// notebooklm/manual) artık GÜN değil, KONU başına kaydediliyor (bkz.
// backend study_notes.py / migration 090_study_notes_topic_slug.sql).
import { api } from './client';
import type { StudyDaySummary, StudyDayDetail, StudyNote, StudyNoteSource } from './types';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

export const studyNotesApi = {
  listDays: async (): Promise<StudyDaySummary[]> => {
    const res = await api.get('/study-notes');
    return res.data.days;
  },
  getDay: async (date: string): Promise<StudyDayDetail> => {
    const res = await api.get<StudyDayDetail>(`/study-notes/${date}`);
    return res.data;
  },
  saveNote: async (
    date: string,
    source: StudyNoteSource,
    topicSlug: string,
    content: string,
    topicTitle?: string | null
  ): Promise<StudyNote> => {
    const res = await api.post<StudyNote>('/study-notes', {
      date,
      source,
      topic_slug: topicSlug,
      content,
      topic_title: topicTitle || undefined,
    });
    return res.data;
  },
  deleteNote: async (date: string, source: StudyNoteSource, topicSlug: string): Promise<void> => {
    await api.delete(`/study-notes/${date}/${source}/${topicSlug}`);
  },
  uploadImages: async (
    date: string,
    source: StudyNoteSource,
    topicSlug: string,
    images: PickedImage[]
  ): Promise<StudyNote> => {
    const form = new FormData();
    images.forEach((img) => {
      // React Native'in FormData implementasyonu web'den farklı -- dosya
      // burada bir Blob/File değil, {uri, name, type} şeklinde bir obje.
      form.append('files', { uri: img.uri, name: img.name, type: img.type } as unknown as Blob);
    });
    const res = await api.post<StudyNote>(`/study-notes/${date}/${source}/${topicSlug}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  deleteImage: async (
    date: string,
    source: StudyNoteSource,
    topicSlug: string,
    imageUrl: string
  ): Promise<void> => {
    await api.delete(`/study-notes/${date}/${source}/${topicSlug}/images`, { params: { image_url: imageUrl } });
  },
};
