// lib/grammarProgress.ts — Gramer Rehberi harita görünümü için istemci-taraflı
// "hangi konuya baktım" ilerleme takibi. Backend'de kullanıcı bazlı bir
// grammar-progress tablosu yok (bkz. backend/app/api/routes/grammar.py) —
// bu bilinçli olarak hafif tutuldu, sadece localStorage'da tutulur (tarayıcı/
// cihaz bazlı, sunucuya yazılmaz). exam-grammar/page.tsx (harita) ve
// exam-grammar/[slug]/page.tsx (konu detayı, ziyaret edilince işaretler)
// tarafından ortak kullanılır.
//
// useVisitedTopics(), useSyncExternalStore ile okur — bir effect içinde
// setState çağırmak yerine (eslint react-hooks/set-state-in-effect kuralı
// ve hydration güvenliği için önerilen desen budur): server/ilk render'da
// getServerSnapshot boş döner, istemcide mount olur olmaz gerçek değerle
// senkronize olur, ekstra render kaskadı oluşturmaz.
import { useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'lexis_grammar_visited_topics_v1';

function parseVisited(raw: string): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function readRaw(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  // Aynı sekmede yapılan değişiklikler için 'storage' eventi TETİKLENMEZ
  // (tarayıcı davranışı) — bu sayfa navigasyonda zaten yeniden mount olduğu
  // için sorun değil; bu sadece birden fazla sekme/pencere arasında senkron
  // kalması için eklendi.
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getServerSnapshot(): string {
  return '';
}

export function useVisitedTopics(): Set<string> {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  return useMemo(() => parseVisited(raw), [raw]);
}

export function markTopicVisited(slug: string): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const current = parseVisited(readRaw());
    if (current.has(slug)) return;
    current.add(slug);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // localStorage kullanılamıyorsa (gizli mod, kota vb.) ilerleme sessizce takip edilmez.
  }
}
