import { api } from './client';
import type {
  CheckoutResponse, PricingPlan, SubscriptionStatus,
  VerifyPurchaseRequest, VerifyPurchaseResponse,
} from './types';

// src/api/subscription.ts — web'deki lib/api.ts içindeki subscriptionApi'nin
// mobil karşılığı. getStatus ortak (her iki platformda da "şu an premium
// mıyım" sorgusu aynı). getPlans/checkout/cancel web'e (iyzico) özgüdür,
// mobil premium.tsx bunları KULLANMIYOR — bkz. verifyPurchase altta.
// Kullanıcı kararı: store kuralları nedeniyle mobilde native Apple/Google
// IAP zorunlu, web'de iyzico kalıyor (bkz. backlog Bölüm 1/2).
export const subscriptionApi = {
  getPlans: async (): Promise<PricingPlan[]> => {
    const res = await api.get<PricingPlan[]>('/subscription/plans');
    return res.data;
  },
  getStatus: async (): Promise<SubscriptionStatus> => {
    const res = await api.get<SubscriptionStatus>('/subscription/me');
    return res.data;
  },
  checkout: async (plan_id: string): Promise<CheckoutResponse> => {
    const res = await api.post<CheckoutResponse>('/subscription/checkout', { plan_id });
    return res.data;
  },
  cancel: async (): Promise<{ message: string }> => {
    const res = await api.post('/subscription/cancel');
    return res.data;
  },
  // Mobil IAP satın alma tamamlandığında (expo-iap purchaseUpdatedListener)
  // elde edilen bilgi buraya gönderilir — backend Apple/Google sunucularına
  // sorarak doğrular, ASLA istemciden geleni doğrudan güvenmez (bkz. backend
  // app/services/apple_appstore.py / google_play.py). Store kimlik bilgileri
  // henüz .env'de yoksa (Apple Developer Program 26 Ağustos'ta aktive
  // olacak) backend 501 döner — premium.tsx bunu ayrı bir mesajla gösterir.
  verifyPurchase: async (req: VerifyPurchaseRequest): Promise<VerifyPurchaseResponse> => {
    const res = await api.post<VerifyPurchaseResponse>('/subscription/verify-purchase', req);
    return res.data;
  },
};
