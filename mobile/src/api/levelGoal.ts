// src/api/levelGoal.ts — Kullanıcı isteği (3 Kasım 2026): ana sayfada
// hedef seviyeye ilerleme kartı. backend/app/api/routes/level_goal.py /
// app/services/level_goal_service.py. web/src/lib/api.ts levelGoalApi ile
// AYNI alan eşleşmesi.
import { api } from './client';

export interface LevelGoalBreakdown {
  exam_accuracy_pct: number;
  exam_attempts: number;
  game_score_pct: number;
  game_xp_30d: number;
  study_program_pct: number;
  study_program_topics_completed: number | null;
  study_program_topics_total: number | null;
}

export interface LevelGoal {
  available: boolean;
  reason?: 'no_placement';
  needs_target?: boolean;
  learning_lang: string;
  placement_level?: string;
  current_level?: string;
  current_level_name?: string;
  target_level?: string | null;
  target_level_name?: string;
  suggested_target_level?: string;
  percent?: number;
  completed_steps?: number;
  total_steps?: number;
  breakdown?: LevelGoalBreakdown;
}

export const levelGoalApi = {
  get: async (): Promise<LevelGoal> => {
    const res = await api.get<LevelGoal>('/me/level-goal');
    return res.data;
  },
  setTarget: async (target_level: string): Promise<LevelGoal> => {
    const res = await api.patch<LevelGoal>('/me/level-goal', { target_level });
    return res.data;
  },
};
