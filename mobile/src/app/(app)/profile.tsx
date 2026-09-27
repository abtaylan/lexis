import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift, Mail, ShieldCheck, Info, Globe, Sun, Moon, Smartphone, LogOut, Trash2, Languages as LanguagesIcon } from 'lucide-react-native';
import { useLocale, LOCALE_META } from '@/i18n';
import { authApi } from '@/api/auth';
import { languagesApi, userLanguagesApi } from '@/api/languages';
import { referralsApi } from '@/api/referrals';
import type { Language } from '@/api/types';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeMode } from '@/store/theme';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
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

  // ── Referans/Davet Programı (V2 öncelik #8) ──
  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: referralsApi.getMine,
  });

  // Üretim web alan adı repoda kesin doğrulanamadığından (bkz. devir dokümanı)
  // paylaşım metni SADECE kodu içerir — yanlış/kırık bir link paylaşmaktansa
  // arkadaşın kodu kayıt ekranındaki "Davet Kodu" alanına elle girmesi istenir.
  const handleShareReferral = async () => {
    if (!referrals?.referral_code) return;
    try {
      await Share.share({
        message: `${mt('referralSectionDesc')}\n\n${mt('referralYourCodeLabel')}: ${referrals.referral_code}`,
      });
    } catch {
      // Kullanıcı paylaşım sayfasını kapattıysa (iptal) sessizce yok say.
    }
  };

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
  const initial = (displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <ScreenContainer scroll={false} padded={false}>
      <ScreenNavBar />

      {/* 27 Eylül 2026 — Kelimeler/Sıralama/Çalışma Programı ekranlarındaki
          gradient hero panel deseni buraya da taşındı: baş harfli avatar +
          ad + e-posta, kart yapısı aynı kalıyor (kullanıcının "mevcut düzeni
          koru, sadece görseli zenginleştir" isteğiyle tutarlı). */}
      <LinearGradient colors={[c.primary, c.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{initial}</Text>
        </View>
        <Text style={styles.heroName} numberOfLines={1}>{displayName || t('profile')}</Text>
        {user?.email ? <Text style={styles.heroEmail} numberOfLines={1}>{user.email}</Text> : null}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Card style={{ marginBottom: spacing.md }}>
        <TextField label={t('displayNameLabel')} value={displayName} onChangeText={setDisplayName} />
        <TextField label={t('dailyGoalLabel')} value={dailyGoal} onChangeText={setDailyGoal} keyboardType="number-pad" />
        {saved ? <Text style={{ color: c.success, fontSize: 12, marginBottom: spacing.sm }}>{t('savedLabel')}</Text> : null}
        <Button title={t('saveBtn')} onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} />
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <SectionHeader icon={ShieldCheck} label={t('accountInfoTitle')} c={c} />
        <InfoRow icon={Mail} label="Email" value={user?.email ?? ''} c={c} />
        <InfoRow icon={ShieldCheck} label={t('roleLabel')} value={user?.role ?? 'user'} c={c} />
        {/* Test/destek sürecinde "telefonda gerçekten hangi build kurulu?"
            sorusunu kesin olarak cevaplamak için gösteriliyor.
            expo-application, EAS'in "remote" versiyonlama ile atadığı gerçek
            native değerleri (iOS: CFBundleShortVersionString / CFBundleVersion,
            Android: versionName / versionCode) derleme zamanında değil ÇALIŞMA
            ZAMANINDA cihazdaki binary'den okur — yani app.json'daki statik
            değeri değil, telefona kurulu olan build'in gerçek sürümünü verir.
            NOT: Önce Constants.nativeAppVersion / nativeBuildVersion
            kullanılmıştı ama bunlar expo-constants'ın bu sürümünde artık
            kaldırılmış; cihazda "? (?)" görünmesinin sebebi buydu. */}
        <InfoRow
          icon={Info}
          label={t('appVersionLabel') || 'Sürüm'}
          value={`${Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '?'} (${
            Application.nativeBuildVersion ?? '?'
          })`}
          c={c}
          last
        />
      </Card>

      <BadgeShowcase />

      {/* Referans/Davet Programı — V2 öncelik #8, 12 Eylül 2026 */}
      <Card style={{ marginBottom: spacing.md }}>
        <SectionHeader icon={Gift} label={mt('referralSectionTitle')} c={c} />
        <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: spacing.md }}>{mt('referralSectionDesc')}</Text>

        {referralsLoading ? (
          <Text style={{ color: c.textMuted, fontSize: 13 }}>{t('loading')}</Text>
        ) : referrals?.referral_code ? (
          <>
            <View style={styles.rowBetween}>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{mt('referralYourCodeLabel')}</Text>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>{referrals.referral_code}</Text>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Button title={mt('referralShareBtn')} onPress={handleShareReferral} />
            </View>

            <View style={[styles.rowBetween, { marginTop: spacing.md }]}>
              <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '600' }}>
                {mt('referralInvitedStatTpl').replace('{n}', String(referrals.total_invited))}
              </Text>
              <Text style={{ color: c.success, fontSize: 12, fontWeight: '600' }}>
                {mt('referralRewardedStatTpl').replace('{n}', String(referrals.total_rewarded))}
              </Text>
            </View>

            {referrals.items.length === 0 ? (
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: spacing.sm }}>{mt('referralListEmpty')}</Text>
            ) : (
              referrals.items.map((item, idx) => {
                const name = item.display_name || item.username || mt('referralAnonymousUser');
                return (
                  <View key={`${item.created_at}-${idx}`} style={styles.langRow}>
                    <Text style={{ flex: 1, color: c.text, fontSize: 13 }}>{name}</Text>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: item.status === 'rewarded' ? c.successSoft : c.primarySoft },
                      ]}
                    >
                      <Text
                        style={{
                          color: item.status === 'rewarded' ? c.success : c.primary,
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        {item.status === 'rewarded' ? mt('referralRewardedStatus') : mt('referralPendingStatus')}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : null}
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.rowBetween}>
          <SectionHeader icon={LanguagesIcon} label={t('myLanguagesTitle')} c={c} noMargin />
          <Pressable onPress={() => setAddLangOpen(true)} style={[styles.addLangBtn, { backgroundColor: c.primarySoft }]}>
            <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>+ {t('addLanguageBtn')}</Text>
          </Pressable>
        </View>
        {(myLanguages ?? []).map((ul) => {
          const lang = langName(ul.learning_lang);
          return (
            <View key={ul.id} style={styles.langRow}>
              <View style={[styles.langFlagWrap, { backgroundColor: c.background }]}>
                <Text style={{ fontSize: 16 }}>{lang?.flag_emoji ?? '🌐'}</Text>
              </View>
              <Text style={{ flex: 1, color: c.text, fontSize: 14, fontWeight: '600' }}>
                {lang?.name_native ?? ul.learning_lang}
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
        <SectionHeader icon={Globe} label={t('interfaceLanguageLabel')} c={c} />
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
        <SectionHeader icon={Sun} label={mt('themeSectionTitle')} c={c} />
        <View style={styles.localeGrid}>
          {(['light', 'dark', 'system'] as const).map((opt) => {
            const active = mode === opt;
            const OptIcon = opt === 'light' ? Sun : opt === 'dark' ? Moon : Smartphone;
            return (
              <Pressable
                key={opt}
                onPress={() => setMode(opt)}
                style={[styles.localeChip, styles.themeChip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : c.surface }]}
              >
                <OptIcon size={14} color={active ? c.primary : c.textSecondary} />
                <Text style={{ color: active ? c.primary : c.text, fontWeight: active ? '700' : '400' }}>
                  {opt === 'light' ? mt('themeLight') : opt === 'dark' ? mt('themeDark') : mt('themeSystem')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* "Tehlikeli Bölge" — çıkış/hesap silme aksiyonları görsel olarak
          ayrıştırılıp ikonlu hale getirildi (27 Eylül 2026); davranış/mutasyon
          mantığı birebir aynı kaldı. */}
      <View style={styles.dangerZone}>
        <Pressable onPress={handleLogout} style={[styles.dangerRow, { borderColor: c.dangerSoft }]}>
          <LogOut color={c.danger} size={16} />
          <Text style={{ color: c.danger, fontWeight: '700', fontSize: 14, flex: 1, marginLeft: spacing.sm }}>{t('logout')}</Text>
        </Pressable>
        <Pressable
          onPress={handleDeleteAccount}
          disabled={deleteAccountMutation.isPending}
          style={[styles.dangerRow, { borderColor: c.dangerSoft, opacity: deleteAccountMutation.isPending ? 0.6 : 1 }]}
        >
          <Trash2 color={c.danger} size={16} />
          <Text style={{ color: c.danger, fontWeight: '700', fontSize: 14, flex: 1, marginLeft: spacing.sm }}>{mt('deleteAccountBtn')}</Text>
        </Pressable>
      </View>
      </ScrollView>

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

// 27 Eylül 2026 — kart başlıklarına renkli ikon rozeti eklemek için ortak
// bir bileşen (Sıralama/Çalışma Programı ekranlarındaki iconBadgeSm deseniyle
// tutarlı). `noMargin`, başlık bir `rowBetween` içinde başka bir elemanla
// (ör. "+ Dil Ekle" linki) aynı satırdaysa alt boşluğu kaldırmak için.
function SectionHeader({
  icon: Icon,
  label,
  c,
  noMargin,
}: {
  icon: React.ComponentType<{ color?: string; size?: number }>;
  label: string;
  c: ReturnType<typeof useThemeColors>;
  noMargin?: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, !noMargin && { marginBottom: spacing.sm }]}>
      <View style={[styles.sectionIconWrap, { backgroundColor: c.primarySoft }]}>
        <Icon color={c.primary} size={14} />
      </View>
      <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </View>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  c,
  last,
}: {
  icon?: React.ComponentType<{ color?: string; size?: number }>;
  label: string;
  value: string;
  c: ReturnType<typeof useThemeColors>;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {Icon ? <Icon color={c.textMuted} size={13} /> : null}
        <Text style={{ color: c.textMuted, fontSize: 13 }}>{label}</Text>
      </View>
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
  hero: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: radius.xl + 4,
    borderBottomRightRadius: radius.xl + 4,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroAvatarText: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  heroName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', maxWidth: 280 },
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, maxWidth: 280 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionIconWrap: { width: 26, height: 26, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.15)' },
  langFlagWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addLangBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  localeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  localeChip: { borderWidth: 1.5, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  themeChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dangerZone: { gap: spacing.sm, marginTop: spacing.xs },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
});
