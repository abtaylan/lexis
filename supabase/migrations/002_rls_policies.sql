-- ============================================================
-- LEXIS — Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- ============================================================

-- RLS'yi aktif et
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_schedule ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────
-- Kullanıcı kendi profilini okuyabilir/güncelleyebilir
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admin hepsini görebilir
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── words ──────────────────────────────────────────────────
CREATE POLICY "words_select_own" ON words
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "words_insert_own" ON words
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "words_update_own" ON words
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "words_delete_own" ON words
    FOR DELETE USING (auth.uid() = user_id);

-- Admin
CREATE POLICY "words_admin_all" ON words
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── daily_progress ─────────────────────────────────────────
CREATE POLICY "progress_own" ON daily_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "progress_admin" ON daily_progress
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ── study_sessions ─────────────────────────────────────────
CREATE POLICY "sessions_own" ON study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- ── quiz_results ───────────────────────────────────────────
CREATE POLICY "quiz_results_own" ON quiz_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM study_sessions
            WHERE id = quiz_results.session_id AND user_id = auth.uid()
        )
    );

-- ── study_schedule ─────────────────────────────────────────
CREATE POLICY "schedule_own" ON study_schedule
    FOR ALL USING (auth.uid() = user_id);
