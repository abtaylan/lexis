'use client';

// Görev Haritası ses efektleri (10 Eylül 2026) -- CC0/ücretsiz kaynak:
// Mixkit (https://mixkit.co, Mixkit Lisansı -- ticari kullanım serbest,
// atıf gerekmiyor). Dosyalar public/sounds/quest/ altında.
// Tarayıcı otomatik-oynatma kısıtlamaları nedeniyle SADECE kullanıcı
// etkileşimi (tıklama/yenileme) sonrası tetikleniyor; .play() reddi
// (autoplay-block, ses dosyası henüz yoksa 404 vb.) sessizce yutuluyor --
// ses opsiyonel bir gelistirme, akışı asla bozmamalı.

const SOUND_PATHS = {
  click: '/sounds/quest/click.mp3',
  complete: '/sounds/quest/complete.mp3',
  badge: '/sounds/quest/badge.mp3',
} as const;

type SoundKey = keyof typeof SOUND_PATHS;

const cache = new Map<SoundKey, HTMLAudioElement>();

function getAudio(key: SoundKey): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let audio = cache.get(key);
  if (!audio) {
    audio = new Audio(SOUND_PATHS[key]);
    audio.volume = key === 'badge' ? 0.55 : 0.4;
    cache.set(key, audio);
  }
  return audio;
}

function play(key: SoundKey) {
  const audio = getAudio(key);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {
    // ses opsiyonel bir gelistirme -- sessizce yut, akisi bozma
  }
}

export function playQuestClick(): void { play('click'); }
export function playQuestComplete(): void { play('complete'); }
export function playQuestBadge(): void { play('badge'); }
