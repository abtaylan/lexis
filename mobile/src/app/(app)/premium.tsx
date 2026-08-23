import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIAP, ErrorCode, type Purchase } from 'expo-iap';
import { Crown, Check, X, RefreshCw } from 'lucide-react-native';
import { subscriptionApi } from '@/api/subscription';
import type { SubscriptionStatus } from '@/api/types';
import { useLocale } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

// ── Premium — web'deki app/(app)/premium/page.tsx'in mobil karşılığı.
// KULLANICI KARARI (bkz. backlog Bölüm 1/2): web'de iyzico kalıyor, mobilde
// store kuralları (App Store/Play Store dijital abonelik politikası) native
// Apple/Google IAP'ı zorunlu kılıyor — bu yüzden bu ekran artık web'in
// iyzico checkout akışını DEĞİL, `expo-iap` (StoreKit2/Play Billing sarmalayıcısı,
// bkz. https://openiap.dev) ile native satın alma akışını kullanıyor.
// Backend Apple/Google sunucularına sorarak doğruluyor (bkz.
// app/services/apple_appstore.py / google_play.py) — istemciden geleni
// asla doğrudan güvenmiyor.
//
// ÖNEMLİ — bu ekran şu an CANLI TEST EDİLEMEZ: App Store Connect/Play
// Console'da henüz gerçek ürün tanımlanmadı (Apple Developer Program 26
// Ağustos'ta aktive edilecek). Ürün ID'leri aşağıda PLACEHOLDER'dır — store
// panellerinde TAM OLARAK bu ID'lerle abonelik ürünü oluşturulmalı, aksi
// halde fetchProducts boş döner.
const PRODUCT_MONTHLY = 'app.lexis.mobile.premium.monthly';
const PRODUCT_YEARLY = 'app.lexis.mobile.premium.yearly';
const PRODUCT_IDS = [PRODUCT_MONTHLY, PRODUCT_YEARLY];

// Store'un kendi abonelik yönetim sayfası — gerçek iptal işlemi APP'TEN
// DEĞİL, buradan yapılır (Apple/Google kuralı). "Aboneliği İptal Et" butonu
// backend'e cancel isteği ATMIYOR (o endpoint iyzico'ya özgü), sadece bu
// sayfayı açıyor.
function openStoreSubscriptionSettings() {
  const url = Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions?package=app.lexis.mobile';
  Linking.openURL(url).catch(() => {});
}

// Bu iki metin henüz merkezi 9-dilli sözlükte yok (mağaza entegrasyonu bu
// oturumda eklendi) — kapsamı dar tutmak için şimdilik Türkçe sabit
// bırakıldı, tıpkı admin panelindeki "iç kullanım" metinleri gibi. İleride
// merkezi sözlüğe taşınabilir.
const IAP_UI = {
  restoreBtn: 'Satın Alımları Geri Yükle',
  notConfigured: 'Premium satın alma mağaza tarafında henüz aktif değil, kısa süre sonra tekrar deneyin.',
  manageBtn: 'Mağazadan Yönet',
};

export default function PremiumScreen() {
  const { t, locale } = useLocale();
  const { updateUser } = useAuth();
  const c = useThemeColors();

  const FEATURES = [t('premiumFeature1'), t('premiumFeature2'), t('premiumFeature3'), t('premiumFeature4')];

  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [purchasingSku, setPurchasingSku] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = async () => {
    try {
      const statusRes = await subscriptionApi.getStatus();
      setSubStatus(statusRes);
      await updateUser({ is_premium: statusRes.is_premium, premium_until: statusRes.premium_until });
    } catch {
      setError(t('premiumPlansLoadError'));
    } finally {
      setLoadingStatus(false);
    }
  };

  // purchase.purchaseToken alanı expo-iap'te platform bağımsız birleşik bir
  // alan: iOS'ta StoreKit2 JWS'i, Android'de gerçek purchaseToken'ı taşır
  // (bkz. openiap PurchaseCommon tipi) — backend'e olduğu gibi iletiliyor.
  const verifyAndFinish = async (purchase: Purchase) => {
    setError('');
    try {
      const res = await subscriptionApi.verifyPurchase({
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        product_id: purchase.productId,
        transaction_id: purchase.transactionId ?? purchase.id,
        purchase_token: purchase.purchaseToken ?? '',
      });
      setSubStatus(res);
      await updateUser({ is_premium: res.is_premium, premium_until: res.premium_until });
      // Doğrulama backend'de başarılıysa transaction'ı bitiriyoruz — bunu
      // yapmadan iOS aynı transaction'ı tekrar tekrar teslim eder.
      await finishTransaction({ purchase, isConsumable: false });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setError(status === 501 ? IAP_UI.notConfigured : t('premiumCheckoutStartError'));
      // Doğrulama başarısız olduysa transaction BİTİRİLMEZ — bir sonraki
      // getAvailablePurchases/restore çağrısında tekrar denenebilir olsun.
    } finally {
      setPurchasingSku(null);
      setRestoring(false);
    }
  };

  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction, getAvailablePurchases } = useIAP({
    onPurchaseSuccess: verifyAndFinish,
    onPurchaseError: (e) => {
      setPurchasingSku(null);
      setRestoring(false);
      // Kullanıcı satın almayı kendisi iptal ettiyse (ör. sistem
      // diyaloğunu kapattıysa) hata göstermiyoruz — bu normal bir akış.
      if (e.code !== ErrorCode.UserCancelled) setError(t('premiumCheckoutStartError'));
    },
  });

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (connected) fetchProducts({ skus: PRODUCT_IDS, type: 'subs' });
  }, [connected, fetchProducts]);

  const handleSubscribe = async (sku: string) => {
    setError('');
    setPurchasingSku(sku);
    try {
      await requestPurchase({
        request: { apple: { sku }, google: { skus: [sku] } },
        type: 'subs',
      });
      // Sonuç onPurchaseSuccess/onPurchaseError callback'lerine düşer.
    } catch {
      setPurchasingSku(null);
      setError(t('premiumCheckoutStartError'));
    }
  };

  const handleRestore = async () => {
    setError('');
    setRestoring(true);
    try {
      await getAvailablePurchases();
      // Bulunan satın alımlar varsa onPurchaseSuccess ile aynı yoldan
      // (purchaseUpdatedListener) doğrulanır — expo-iap bunu otomatik tetikler.
    } catch {
      setRestoring(false);
      setError(t('premiumCheckoutStartError'));
    }
  };

  const isPremium = !!subStatus?.is_premium;

  if (loadingStatus) {
    return (
      <ScreenContainer>
        <View style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.warningSoft }]}>
          <Crown color={c.warning} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: '700' }}>Lexis Premium</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>{t('premiumPageSubtitle')}</Text>
        </View>
      </View>

      {error ? (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft, marginBottom: spacing.md }}>
          <Text style={{ color: c.danger, fontSize: 12 }}>{error}</Text>
        </Card>
      ) : null}

      {isPremium ? (
        <Card style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
            <View style={[styles.crownAvatar, { backgroundColor: c.warningSoft }]}>
              <Crown color={c.warning} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 15, fontWeight: '700' }}>{t('premiumActive')}</Text>
              {subStatus?.premium_until ? (
                <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                  {t('premiumPeriodEndTpl').replace('{date}', new Date(subStatus.premium_until).toLocaleDateString(locale))}
                </Text>
              ) : null}
            </View>
          </View>
          <Button title={IAP_UI.manageBtn} variant="secondary" onPress={openStoreSubscriptionSettings} />
        </Card>
      ) : (
        <>
          <View style={styles.plansGrid}>
            {subscriptions.map((plan) => (
              <Card key={plan.id} style={styles.planCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs, flexWrap: 'wrap' }}>
                  <Crown color={c.warning} size={14} />
                  <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: '600' }}>{plan.title}</Text>
                  {plan.id === PRODUCT_YEARLY && (
                    <View style={[styles.badge, { backgroundColor: c.warningSoft }]}>
                      <Text style={{ color: c.warning, fontSize: 10, fontWeight: '700' }}>{t('premiumBestValueBadge')}</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: c.text, fontSize: 26, fontWeight: '700', marginBottom: spacing.md }}>
                  {plan.displayPrice}
                </Text>
                <Button
                  title={t('premiumSubscribeBtnTpl').replace('{interval}', plan.title)}
                  loading={purchasingSku === plan.id}
                  disabled={!!purchasingSku}
                  onPress={() => handleSubscribe(plan.id)}
                />
              </Card>
            ))}
            {connected && subscriptions.length === 0 && (
              <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center' }}>{IAP_UI.notConfigured}</Text>
            )}
          </View>

          <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreRow}>
            {restoring ? <ActivityIndicator color={c.primary} size="small" /> : <RefreshCw color={c.primary} size={14} />}
            <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>{IAP_UI.restoreBtn}</Text>
          </Pressable>

          <Card>
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14, marginBottom: spacing.md }}>{t('premiumFeaturesTitle')}</Text>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Check color={c.success} size={15} style={{ marginTop: 1 }} />
                <Text style={{ color: c.textSecondary, fontSize: 13, flex: 1 }}>{f}</Text>
              </View>
            ))}
            <View style={styles.featureRow}>
              <X color={c.textMuted} size={15} style={{ marginTop: 1 }} />
              <Text style={{ color: c.textMuted, fontSize: 13, flex: 1 }}>{t('premiumNoAdsNegative')}</Text>
            </View>
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  headerIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  crownAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  plansGrid: { gap: spacing.md, marginBottom: spacing.md },
  planCard: {},
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  restoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, marginBottom: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.xs },
});
