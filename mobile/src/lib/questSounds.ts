// Görev Haritası ses efektleri (10 Eylül 2026) -- CC0/ücretsiz kaynak: Mixkit
// (https://mixkit.co, Mixkit Lisansı -- ticari kullanım serbest, atıf
// gerekmiyor). Dosyalar assets/sounds/quest/ altında, expo-audio ile
// çalınıyor (bkz. package.json -- expo-audio eklendi, MAKİNENDE ÇALIŞTIRMAN
// GEREKİYOR: `npx expo install expo-audio` -- device_bash'ten npm install
// ağ erişimi engellendiği için buradan kurulamadı, web tarafında olduğu
// gibi bu adım kullanıcının kendi terminalinde yapılmalı).
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

type QuestSoundKey = 'click' | 'complete' | 'badge';

const SOURCES: Record<QuestSoundKey, number> = {
  click: require('../../assets/sounds/quest/click.mp3'),
  complete: require('../../assets/sounds/quest/complete.mp3'),
  badge: require('../../assets/sounds/quest/badge.mp3'),
};

const players: Partial<Record<QuestSoundKey, AudioPlayer>> = {};

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

export function playQuestClick(): void { play('click'); }
export function playQuestComplete(): void { play('complete'); }
export function playQuestBadge(): void { play('badge'); }
