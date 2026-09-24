// src/utils/offlineOutbox.ts — Offline mod / onbellekleme (24 Eylul 2026,
// V2 oncelik #11). Flashcards ekraninda "Bildim/Bilmedim" (wordsApi.review)
// ve oturum sonu ozeti (wordsApi.logStudySession) cagrilari internet yokken
// basarisiz olursa BURADA (AsyncStorage tabanli bulkStorage ile AYNI
// katman) bir kuyruga yaziliyor; baglanti geri gelince flushOfflineOutbox
// ile KAYIT SIRASI korunarak tek tek tekrar denenip backend'e gonderiliyor.
// Boylece kullanici cevrimdisiyken de calismaya devam edebiliyor -- SM-2
// tekrar mantigi zaten tamamen kart tarafinda (queue/index/correct local
// state), sunucu sadece review kaydini/istatistigi tutuyor -- veri
// kaybolmuyor, sadece senkronu gecikiyor.
import { bulkStorage } from './storage';
import { wordsApi } from '@/api/words';

const OUTBOX_KEY = 'lexis_offline_outbox_v1';

type OutboxItem =
  | { type: 'review'; payload: { wordId: string; success: boolean }; createdAt: number }
  | {
      type: 'logStudySession';
      payload: {
        words_studied: number;
        correct_count: number;
        wrong_count: number;
        duration_secs: number;
        study_type: string;
      };
      createdAt: number;
    };

async function readOutbox(): Promise<OutboxItem[]> {
  try {
    const raw = await bulkStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOutbox(items: OutboxItem[]): Promise<void> {
  await bulkStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function enqueueReview(wordId: string, success: boolean): Promise<void> {
  const items = await readOutbox();
  items.push({ type: 'review', payload: { wordId, success }, createdAt: Date.now() });
  await writeOutbox(items);
}

export async function enqueueLogStudySession(payload: {
  words_studied: number;
  correct_count: number;
  wrong_count: number;
  duration_secs: number;
  study_type: string;
}): Promise<void> {
  const items = await readOutbox();
  items.push({ type: 'logStudySession', payload, createdAt: Date.now() });
  await writeOutbox(items);
}

export async function getOutboxCount(): Promise<number> {
  return (await readOutbox()).length;
}

// Baglanti geri geldiginde kuyruktaki her ogeyi SIRAYLA tekrar dener --
// biri basarisiz olursa (ag yeniden kesilmesi gibi) KALANLARI KUYRUKTA
// BIRAKIP durur, bir sonraki flush denemesinde kaldigi yerden devam eder
// (kismi ilerleme kaybolmaz, hicbir ogeyi iki kez de gondermez).
export async function flushOfflineOutbox(): Promise<{ flushed: number; remaining: number }> {
  const items = await readOutbox();
  if (items.length === 0) return { flushed: 0, remaining: 0 };

  let flushed = 0;
  let i = 0;
  for (; i < items.length; i++) {
    const item = items[i];
    try {
      if (item.type === 'review') {
        await wordsApi.review(item.payload.wordId, item.payload.success);
      } else {
        await wordsApi.logStudySession(item.payload);
      }
      flushed++;
    } catch {
      break;
    }
  }

  const remaining = items.slice(i);
  await writeOutbox(remaining);
  return { flushed, remaining: remaining.length };
}
