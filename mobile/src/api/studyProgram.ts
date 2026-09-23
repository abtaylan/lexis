// src/api/studyProgram.ts — Adaptif Öğrenme Motoru Madde 2 (24 Eylül 2026):
// haftalık rolling çalışma programı. backend/app/api/routes/study_program.py
import { api } from './client';
import type { ExamPracticeQuestionsResult, StudyProgram } from './types';

export const studyProgramApi = {
  current: async (): Promise<StudyProgram> => {
    const res = await api.get<StudyProgram>('/study-program/current');
    return res.data;
  },
  weeklyQuiz: async (): Promise<ExamPracticeQuestionsResult> => {
    const res = await api.get<ExamPracticeQuestionsResult>('/study-program/weekly-quiz');
    return res.data;
  },
};
