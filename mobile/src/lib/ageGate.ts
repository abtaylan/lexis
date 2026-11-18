// src/lib/ageGate.ts — "nötr yaş ekranı" (neutral age screen, bkz.
// components/AgeGateScreen.tsx) cevabını AsyncStorage'da saklar.
//
// 18 Kasım 2026 — Google Play Aile Politikası / COPPA uyumu: Lexis'in
// Google Play'deki hedef yaş grubu 9-12 dahil tüm yaşlara açılacak (bkz.
// Play Console > Hedef kitle ve içerik). Bu, reklam SDK'sinin (bkz.
// lib/adsInit.ts) çocuk olarak işaretli kullanıcılarda
// tagForChildDirectedTreatment ile başlatılmasını ZORUNLU kılıyor. Bu
// dosya uygulama ilk açıldığında (auth durumundan bağımsız, bkz.
// app/_layout.tsx) sorulan doğum yılı cevabını kalıcı olarak saklar,
// böylece soru bir daha sorulmaz.
import { bulkStorage } from '@/utils/storage';

const STORAGE_KEY = 'lexis_age_gate_v1';

export interface AgeGateAnswer {
  isChild: boolean;
  birthYear: number;
}

export async function getAgeGateAnswer(): Promise<AgeGateAnswer | null> {
  const raw = await bulkStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.isChild === 'boolean' && typeof parsed?.birthYear === 'number') {
      return parsed as AgeGateAnswer;
    }
  } catch {
    /* bozuk kayıt — yeniden sorulacak */
  }
  return null;
}

/** 13 yaşından küçük olup olmadığını doğum yılından hesaplar ve kaydeder. */
export async function setAgeGateAnswer(birthYear: number): Promise<AgeGateAnswer> {
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  const answer: AgeGateAnswer = { isChild: age < 13, birthYear };
  await bulkStorage.setItem(STORAGE_KEY, JSON.stringify(answer));
  return answer;
}
