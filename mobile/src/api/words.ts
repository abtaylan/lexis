import { api } from './client';
import type { DictionaryResult, Word, WordCreate, WordUpdate } from './types';

export interface PaginatedWords {
  items: Word[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const wordsApi = {
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    list_type?: string;
  }): Promise<PaginatedWords> => {
    const res = await api.get('/words', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.per_page ?? 20,
        search: params?.search,
        status: params?.status,
        list_type: params?.list_type,
      },
    });
    return {
      items: res.data.items,
      total: res.data.total,
      page: res.data.page,
      per_page: res.data.page_size,
      pages: Math.ceil(res.data.total / res.data.page_size),
    };
  },
  create: async (data: WordCreate): Promise<Word> => {
    const res = await api.post<Word>('/words', data);
    return res.data;
  },
  update: async (id: string, data: WordUpdate): Promise<Word> => {
    const res = await api.patch<Word>(`/words/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/words/${id}`);
  },
  getDue: async (): Promise<Word[]> => {
    const res = await api.get('/words/due/today');
    return res.data.items;
  },
  review: async (id: string, success: boolean): Promise<Word> => {
    const res = await api.post<Word>(`/words/${id}/review`, { word_id: id, success });
    return res.data;
  },
};

export const dictionaryApi = {
  /**
   * Sözlük araması. ÖNEMLİ: bu uç nokta diğerlerinden çok daha yavaş —
   * backend sırayla Cambridge'i scrape ediyor, sonra free_dictionary ve
   * MyMemory'ye düşüyor. Railway konteyneri soğuksa veya Cambridge yavaş
   * cevap veriyorsa toplam süre client.ts'teki genel 20sn timeout'u
   * aşabiliyor; axios o zaman istisna fırlatıyor ve arayüzde "Sözlükte
   * bulunamadı" yazıyor — kullanıcıya kelime sözlükte yokmuş gibi
   * görünüyor, oysa istek hiç tamamlanmamış oluyor. (3 Eylül 2026'da
   * doğrulandı: canlı API "try" için 10, "bus" için 4 anlamı sorunsuz
   * dönüyor, yani sorun sunucuda değil, isteğin yarıda kesilmesinde.)
   * Bu yüzden SADECE bu çağrı için timeout'u belirgin şekilde yükseltiyoruz.
   */
  lookup: async (word: string, learning_lang?: string, native_lang?: string): Promise<DictionaryResult> => {
    const res = await api.get<DictionaryResult>('/dictionary/lookup', {
      params: { word, learning_lang, native_lang },
      timeout: 60000,
    });
    return res.data;
  },
};
