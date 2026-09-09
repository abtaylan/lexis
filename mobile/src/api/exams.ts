// src/api/exams.ts — Sınav Hazırlık Alanı API istemcisi. games.ts ile aynı desen.
import { api } from './client';
import type {
  AddWordFromQuestionResult,
  ExamAttemptResult,
  ExamFinishResult,
  ExamQuestionSuggestionInput,
  ExamQuestionSuggestionResult,
  ExamSession,
  ExamSessionMode,
  ExamType,
  ExamTypeInfo,
  NextQuestionResult,
} from './types';

export const examsApi = {
  listExamTypes: async (): Promise<ExamTypeInfo[]> => {
    const res = await api.get<ExamTypeInfo[]>('/exams/exam-types');
    return res.data;
  },
  createSession: async (
    exam_type: ExamType,
    session_mode: ExamSessionMode,
    total_questions?: number
  ): Promise<ExamSession> => {
    const res = await api.post<ExamSession>('/exams/sessions', { exam_type, session_mode, total_questions });
    return res.data;
  },
  nextQuestion: async (sessionId: string): Promise<NextQuestionResult> => {
    const res = await api.get<NextQuestionResult>(`/exams/sessions/${sessionId}/next-question`);
    return res.data;
  },
  submitAttempt: async (
    sessionId: string,
    data: { question_id: string; selected_option: string; time_taken_ms?: number }
  ): Promise<ExamAttemptResult> => {
    const res = await api.post<ExamAttemptResult>(`/exams/sessions/${sessionId}/attempt`, data);
    return res.data;
  },
  finishSession: async (sessionId: string): Promise<ExamFinishResult> => {
    const res = await api.post<ExamFinishResult>(`/exams/sessions/${sessionId}/finish`);
    return res.data;
  },
  addWordFromQuestion: async (questionId: string): Promise<AddWordFromQuestionResult> => {
    const res = await api.post<AddWordFromQuestionResult>(`/exams/questions/${questionId}/add-word`);
    return res.data;
  },
  // Sınav Hazırlık İstatistik & İçerik Motoru Faz 2 — kullanıcı soru önerisi.
  suggestQuestion: async (data: ExamQuestionSuggestionInput): Promise<ExamQuestionSuggestionResult> => {
    const res = await api.post<ExamQuestionSuggestionResult>('/exams/questions/suggest', data);
    return res.data;
  },
};
