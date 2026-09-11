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
// expo-audio ile çalınıyor (bkz. package.json -- expo-audio eklendi ve
// kullanıcının kendi terminalinde `npx expo install expo-audio` ile
// kuruldu).
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

type QuestSoundKey = 'click' | 'complete' | 'badge';

const SOURCES: Record<QuestSoundKey, number> = {
  click: require('../../assets/sounds/quest/click.mp3'),
  complete: require('../../assets/sounds/quest/complete.mp3'),
  badge: require('../../assets/sounds/quest/badge.mp3'),
};

const AMBIENT_SOURCE = require('../../assets/sounds/quest/ambient.mp3');
const AMBIENT_VOLUME = 0.18;

const players: Partial<Record<QuestSoundKey, AudioPlayer>> = {};
let ambientPlayer: AudioPlayer | null = null;

function getPlayer(key: QuestSoundKey): AudioPlayer | null {
  try {
    let player = players[key];
    if (!player) {
      player = createAudioPlayer(SOURCES[key]);
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

function getAmbientPlayer(): AudioPlayer | null {
  try {
    if (!ambientPlayer) {
      ambientPlayer = createAudioPlayer(AMBIENT_SOURCE);
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
