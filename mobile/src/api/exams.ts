// src/api/exams.ts — Sınav Hazırlık Alanı API istemcisi. games.ts ile aynı desen.
import { api } from './client';
import type {
  AddWordFromQuestionResult,
  ExamAttemptResult,
  ExamFinishResult,
  ExamPracticeQuestionsResult,
  ExamQuestionSuggestionInput,
  ExamQuestionSuggestionResult,
  ExamSession,
  ExamSessionMode,
  ExamType,
  ExamTypeInfo,
  NextQuestionResult,
  WeakTopicsResult,
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
  // Madde #3b — yanlış cevaptan sonra aynı konudan ekstra pratik soru seti.
  practiceQuestionsByTopic: async (
    topicTag: string,
    opts?: { examType?: ExamType; excludeQuestionId?: string; limit?: number }
  ): Promise<ExamPracticeQuestionsResult> => {
    const params: Record<string, string | number> = {};
    if (opts?.examType) params.exam_type = opts.examType;
    if (opts?.excludeQuestionId) params.exclude_question_id = opts.excludeQuestionId;
    if (opts?.limit) params.limit = opts.limit;
    const res = await api.get<ExamPracticeQuestionsResult>(
      `/exams/topics/${encodeURIComponent(topicTag)}/practice-questions`,
      { params }
    );
    return res.data;
  },
  // Madde #3c — haftalık/günlük zayıf konu özeti (dashboard widget'ı için).
  weakTopics: async (days = 7, limit = 5): Promise<WeakTopicsResult> => {
    const res = await api.get<WeakTopicsResult>('/exams/stats/weak-topics', {
      params: { days, limit },
    });
    return res.data;
  },
};
