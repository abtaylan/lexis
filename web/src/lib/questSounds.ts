'use client';

// Görev Haritası ses efektleri (10-11 Eylül 2026):
//  - click / complete / badge: Mixkit (https://mixkit.co, Mixkit Lisansı --
//    ticari kullanım serbest, atıf gerekmiyor).
//  - badge (11 Eylül güncellemesi) / ambient: bu ortamda Mixkit'ten ek
//    dosya indirmek (tarayıcı otomasyonuyla) mümkün olmadığı için (bkz.
//    devir notları) NumPy/ffmpeg ile programatik olarak sentezlenmiş,
//    tamamen orijinal, lisans gerektirmeyen sesler -- badge artık
//    complete'ten ayırt edici, yükselen 4 notalı bir "unlock" cini sesi;
//    ambient, Görev Haritası ekranında çok kısık sesle çalan, kesintisiz
//    dönen (seamless loop) yumuşak bir pad.
// Dosyalar public/sounds/quest/ altında.
// Tarayıcı otomatik-oynatma kısıtlamaları nedeniyle SADECE kullanıcı
// etkileşimi (tıklama/yenileme) sonrası tetikleniyor; .play() reddi
// (autoplay-block, ses dosyası henüz yoksa 404 vb.) sessizce yutuluyor --
// ses opsiyonel bir gelistirme, akışı asla bozmamalı.

const SOUND_PATHS = {
  click: '/sounds/quest/click.mp3',
  complete: '/sounds/quest/complete.mp3',
  badge: '/sounds/quest/badge.mp3',
} as const;

const AMBIENT_PATH = '/sounds/quest/ambient.mp3';
const AMBIENT_VOLUME = 0.18;

type SoundKey = keyof typeof SOUND_PATHS;

const cache = new Map<SoundKey, HTMLAudioElement>();
let ambientAudio: HTMLAudioElement | null = null;

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

function getAmbientAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!ambientAudio) {
    ambientAudio = new Audio(AMBIENT_PATH);
    ambientAudio.loop = true;
    ambientAudio.volume = AMBIENT_VOLUME;
  }
  return ambientAudio;
}

/** Görev Haritası ekranına girildiğinde çağrılır. Tarayıcı autoplay engeline
 * takılırsa sessizce yutulur -- ilk tıklamada (playQuestClick) tekrar
 * denenir, böylece kullanıcı etkileşiminden hemen sonra ambiyans başlar. */
export function startQuestAmbient(): void {
  const audio = getAmbientAudio();
  if (!audio || !audio.paused) return;
  void audio.play().catch(() => {});
}

/** Görev Haritası ekranından çıkıldığında (unmount) çağrılır. */
export function stopQuestAmbient(): void {
  if (!ambientAudio) return;
  ambientAudio.pause();
  ambientAudio.currentTime = 0;
}

export function playQuestClick(): void {
  play('click');
  startQuestAmbient();
}
export function playQuestComplete(): void { play('complete'); }
export function playQuestBadge(): void { play('badge'); }
