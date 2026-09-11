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
//
// ÖNEMLİ (11 Eylül 2026, canlı kesinti sonrası): expo-audio native modülü
// şu an App Store'daki YAYINDAKİ build'de (STORE #10, 9 Eylül) DERLENMİŞ
// DEĞİL -- npm paketi sonradan eklendi ve OTA (EAS Update) ile bu paketi
// KULLANAN JS otomatik olarak o eski build'e gönderildi. `import ... from
// 'expo-audio'` STATİK bir import olduğu için modül değerlendirilirken
// (uygulama açılışında, herhangi bir try/catch'e girmeden) "native modül
// bulunamadı" hatası fırlatıyor ve TÜM uygulamanın açılmasını engelliyor.
// Bunu bir daha yaşamamak için expo-audio artık STATİK import EDİLMİYOR --
// require() ile module-scope'ta ama try/catch içinde yükleniyor; native
// modül yoksa (eski/güncellenmemiş build) ses özelliği sessizce devre dışı
// kalıyor, uygulamanın geri kalanı normal çalışmaya devam ediyor. Yeni bir
// native build (expo-audio linkli, bkz. .github/workflows/eas-build-submit.yml
// elle tetikleme) yayınlandığında bu dosyada hiçbir değişiklik gerekmeden
// sesler otomatik olarak etkinleşir.

type AudioPlayerLike = {
  playing: boolean;
  loop: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
};

type ExpoAudioModule = {
  createAudioPlayer: (source: number) => AudioPlayerLike;
};

let expoAudio: ExpoAudioModule | null = null;
try {
  expoAudio = require('expo-audio');
} catch {
  expoAudio = null;
}

type QuestSoundKey = 'click' | 'complete' | 'badge';

const SOURCES: Record<QuestSoundKey, number> = {
  click: require('../../assets/sounds/quest/click.mp3'),
  complete: require('../../assets/sounds/quest/complete.mp3'),
  badge: require('../../assets/sounds/quest/badge.mp3'),
};

const AMBIENT_SOURCE = require('../../assets/sounds/quest/ambient.mp3');
const AMBIENT_VOLUME = 0.18;

const players: Partial<Record<QuestSoundKey, AudioPlayerLike>> = {};
let ambientPlayer: AudioPlayerLike | null = null;

function getPlayer(key: QuestSoundKey): AudioPlayerLike | null {
  if (!expoAudio) return null;
  try {
    let player = players[key];
    if (!player) {
      player = expoAudio.createAudioPlayer(SOURCES[key]);
      players[key] = player;
    }
    return player;
  } catch {
    return null;
  }
}

function play(key: QuestSoundKey) {
  const player = getPlayer(key);
  if (!player) return;
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // ses opsiyonel bir gelistirme -- sessizce yut, akisi bozma
  }
}

function getAmbientPlayer(): AudioPlayerLike | null {
  if (!expoAudio) return null;
  try {
    if (!ambientPlayer) {
      ambientPlayer = expoAudio.createAudioPlayer(AMBIENT_SOURCE);
      ambientPlayer.loop = true;
      ambientPlayer.volume = AMBIENT_VOLUME;
    }
    return ambientPlayer;
  } catch {
    return null;
  }
}

/** Görev Haritası ekranına girildiğinde (mount) çağrılır. */
export function startQuestAmbient(): void {
  const player = getAmbientPlayer();
  if (!player) return;
  try {
    if (!player.playing) player.play();
  } catch {
    // ses opsiyonel bir gelistirme -- sessizce yut
  }
}

/** Görev Haritası ekranından çıkıldığında (unmount) çağrılır. */
export function stopQuestAmbient(): void {
  if (!ambientPlayer) return;
  try {
    ambientPlayer.pause();
    ambientPlayer.seekTo(0);
  } catch {
    // no-op
  }
}

export function playQuestClick(): void { play('click'); }
export function playQuestComplete(): void { play('complete'); }
export function playQuestBadge(): void { play('badge'); }
