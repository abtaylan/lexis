import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, LOCALE_META } from '@/i18n';
import { authApi } from '@/api/auth';
import { languagesApi, userLanguagesApi } from '@/api/languages';
import type { Language } from '@/api/types';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeMode } from '@/store/theme';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { BadgeShowcase } from '@/components/BadgeShowcase';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { ChipSelect } from '@/components/ui/ChipSelect';

export default function ProfileScreen() {
  const { t, mt, locale, setLocale } = useLocale();
  const c = useThemeColors();
  const { mode, setMode } = useThemeMode();
  const { user, logout, updateUser } = useAuth();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [dailyGoal, setDailyGoal] = useState(String(user?.daily_goal ?? 5));
  const [saved, setSaved] = useState(false);
  const [addLangOpen, setAddLangOpen] = useState(false);

  const { data: myLanguages, refetch: refetchMyLangs } = useQuery({
    queryKey: ['my-languages'],
    queryFn: userLanguagesApi.getAll,
  });
  const { data: allLanguages } = useQuery({ queryKey: ['languages'], queryFn: languagesApi.getAll });

  const saveMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ display_name: displayName.trim(), daily_goal: Number(dailyGoal) || 5 }),
    onSuccess: (u) => {
      updateUser(u);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: (code: string) => userLanguagesApi.setActive(code),
    onSuccess: (_r, code) => {
      updateUser({ learning_lang: code });
      refetchMyLangs();
    },
  });

  const removeLangMutation = useMutation({
    mutationFn: (code: string) => userLanguagesApi.remove(code),
    onSuccess: () => refetchMyLangs(),
    onError: (e) => Alert.alert('', getErrorMessage(e, mt('genericErrorMsg'))),
  });

  // Hesap silme (Google Play Data Safety / Apple hesap silme politikası
  // gereği): geri alınamaz olduğu için tek bir Alert.alert ile ama net bir
  // uyarı metniyle onay alınıyor (aynı destructive-confirm deseni,
  // handleLogout ile aynı). Başarılı olursa backend zaten Supabase auth
  // kullanıcısını sildiği için token artık geçersiz — sadece yerel oturumu
  // temizlemek (logout()) yeterli.
  const deleteAccountMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      logout();
    },
    onError: (e) => Alert.alert('', getErrorMessage(e, mt('genericErrorMsg'))),
  });

  const handleLogout = () => {
    Alert.alert(mt('logoutConfirmMsg'), '', [
      { text: t('cancelBtn'), style: 'cancel' },
      { text: mt('logoutConfirmYes'), style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(mt('deleteAccountBtn'), mt('deleteAccountConfirmMsg'), [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: mt('confirmYesDestructive'),
        style: 'destructive',
        onPress: () => deleteAccountMutation.mutate(),
      },
    ]);
  };

  const langName = (code: string) => allLanguages?.find((l) => l.code === code);

  return (
    <ScreenContainer>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.lg }}>{t('profile')}</Text>

      <Card style={{ marginBottom: spacing.md }}>
        <TextField label={t('displayNameLabel')} value={displayName} onChangeText={setDisplayName} />
        <TextField label={t('dailyGoalLabel')} value={dailyGoal} onChangeText={setDailyGoal} keyboardType="number-pad" />
        {saved ? <Text style={{ color: c.success, fontSize: 12, marginBottom: spacing.sm }}>{t('savedLabel')}</Text> : null}
        <Button title={t('saveBtn')} onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} />
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.sm }}>{t('accountInfoTitle')}</Text>
        <InfoRow label="Email" value={user?.email ?? ''} c={c} />
        <InfoRow label={t('roleLabel')} value={user?.role ?? 'user'} c={c} />
        {/* Test/destek sürecinde "telefonda gerçekten hangi build kurulu?"
            sorusunu kesin olarak cevaplamak için: Constants.nativeAppVersion /
            nativeBuildVersion, EAS'in "remote" versiyonlama ile atadığı
            gerçek native CFBundleVersion / versionCode değerini, derleme
            zamanında değil ÇALIŞMA ZAMANINDA cihazdaki binary'den okur — yani
            app.json'daki statik değeri değil, telefona kurulu olan build'in
            gerçek sürümünü gösterir. */}
        <InfoRow
          label={t('appVersionLabel') || 'Sürüm'}
          value={`${Constants.nativeAppVersion ?? '?'} (${Constants.nativeBuildVersion ?? '?'})`}
          c={c}
        />
      </Card>

      <BadgeShowcase />

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.rowBetween}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{t('myLanguagesTitle')}</Text>
          <Pressable onPress={() => setAddLangOpen(true)}>
            <Text style={{ color: c.primary, fontWeight: '600', fontSize: 13 }}>+ {t('addLanguageBtn')}</Text>
          </Pressable>
        </View>
        {(myLanguages ?? []).map((ul) => {
          const lang = langName(ul.learning_lang);
          return (
            <View key={ul.id} style={styles.langRow}>
              <Text style={{ flex: 1, color: c.text, fontSize: 14 }}>
                {lang?.flag_emoji} {lang?.name_native ?? ul.learning_lang}
              </Text>
              {ul.is_active ? (
                <View style={[styles.badge, { backgroundColor: c.successSoft }]}>
                  <Text style={{ color: c.success, fontSize: 11, fontWeight: '600' }}>{t('activeBadgeLabel')}</Text>
                </View>
              ) : (
                <Pressable onPress={() => setActiveMutation.mutate(ul.learning_lang)}>
                  <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>{t('setActiveBtn')}</Text>
                </Pressable>
              )}
              {!ul.is_active && (
                <Pressable
                  onPress={() =>
                    Alert.alert(t('removeLanguageConfirm'), '', [
                      { text: t('cancelBtn'), style: 'cancel' },
                      { text: t('saveBtn'), style: 'destructive', onPress: () => removeLangMutation.mutate(ul.learning_lang) },
                    ])
                  }
                  hitSlop={10}
                  style={{ marginLeft: spacing.sm }}
                >
                  <Text style={{ color: c.danger, fontSize: 15 }}>✕</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.sm }}>{t('interfaceLanguageLabel')}</Text>
        <View style={styles.localeGrid}>
          {LOCALE_META.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => setLocale(l.code)}
              style={[styles.localeChip, { borderColor: locale === l.code ? c.primary : c.border, backgroundColor: locale === l.code ? c.primarySoft : c.surface }]}
            >
              <Text>{l.flag} {l.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.sm }}>{mt('themeSectionTitle')}</Text>
        <View style={styles.localeGrid}>
          {(['light', 'dark', 'system'] as const).map((opt) => (
            <Pressable
              key={opt}
              onPress={() => setMode(opt)}
              style={[styles.localeChip, { borderColor: mode === opt ? c.primary : c.border, backgroundColor: mode === opt ? c.primarySoft : c.surface }]}
            >
              <Text style={{ color: mode === opt ? c.primary : c.text, fontWeight: mode === opt ? '600' : '400' }}>
                {opt === 'light' ? mt('themeLight') : opt === 'dark' ? mt('themeDark') : mt('themeSystem')}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Button title={t('logout')} variant="danger" onPress={handleLogout} />

      <View style={{ marginTop: spacing.sm }}>
        <Button
          title={mt('deleteAccountBtn')}
          variant="danger"
          loading={deleteAccountMutation.isPending}
          onPress={handleDeleteAccount}
        />
      </View>

      <AddLanguageModal
        visible={addLangOpen}
        onClose={() => setAddLangOpen(false)}
        allLanguages={allLanguages ?? []}
        existingCodes={(myLanguages ?? []).map((l) => l.learning_lang)}
        onAdded={() => {
          setAddLangOpen(false);
          refetchMyLangs();
        }}
      />
    </ScreenContainer>
  );
}

function InfoRow({ label, value, c }: { label: string; value: string; c: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={{ color: c.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function AddLanguageModal({
  visible,
  onClose,
  allLanguages,
  existingCodes,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  allLanguages: Language[];
  existingCodes: string[];
  onAdded: () => void;
}) {
  const { t, mt } = useLocale();
  const c = useThemeColors();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: (code: string) => userLanguagesApi.add(code),
    onSuccess: onAdded,
    onError: (e) => setError(getErrorMessage(e, t('addLanguageFailed'))),
  });

  const options = allLanguages.filter((l) => !existingCodes.includes(l.code)).map((l) => ({ value: l.code, label: `${l.flag_emoji ?? ''} ${l.name_native}`.trim() }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={[styles.modalCard, { backgroundColor: c.surface }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>{t('addLanguageModalTitle')}</Text>
          <Text style={{ color: c.textSecondary, fontSize: 13, marginBottom: spacing.sm }}>{t('selectLanguageLabel')}</Text>
          <ChipSelect options={options} value={selected} onChange={setSelected} />
          {error ? <Text style={{ color: c.danger, fontSize: 12, marginTop: spacing.sm }}>{error}</Text> : null}
          <View style={[styles.modalActions, { marginTop: spacing.lg }]}>
            <View style={{ flex: 1 }}>
              <Button title={t('cancelBtn')} variant="ghost" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={mt('continueBtn')}
                loading={addMutation.isPending}
                onPress={() => selected && addMutation.mutate(selected)}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  langRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  localeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  localeChip: { borderWidth: 1.5, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
});
