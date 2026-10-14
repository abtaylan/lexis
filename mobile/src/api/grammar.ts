// src/api/grammar.ts — Gramer Rehberi (Grammar Reference) API istemcisi. exams.ts ile aynı desen.
import { api } from './client';
import type { GrammarCategory, GrammarTopicDetail, GrammarTopicSummary, StudyPassageResponse } from './types';

export const grammarApi = {
  listCategories: async (): Promise<GrammarCategory[]> => {
    const res = await api.get<GrammarCategory[]>('/grammar/categories');
    return res.data;
  },
  listTopics: async (): Promise<GrammarTopicSummary[]> => {
    const res = await api.get<GrammarTopicSummary[]>('/grammar/topics');
    return res.data;
  },
  getTopic: async (slug: string): Promise<GrammarTopicDetail> => {
    const res = await api.get<GrammarTopicDetail>(`/grammar/topics/${slug}`);
    return res.data;
  },
  // Günün Okuma Parçası (14 Ekim 2026) -- AI uretimi, onbelleklenmez,
  // her cagrida taze parca doner (bkz. backend route docstring'i).
  getStudyPassage: async (slug: string): Promise<StudyPassageResponse> => {
    const res = await api.get<StudyPassageResponse>(`/grammar/topics/${slug}/study-passage`);
    return res.data;
  },
};
