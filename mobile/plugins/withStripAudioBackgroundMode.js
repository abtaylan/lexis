// mobile/plugins/withStripAudioBackgroundMode.js
//
// ACIL DUZELTME (21 Eylul 2026): Apple App Review reddi (Guideline 2.5.4 -
// Performance - Software Requirements, Submission ID
// 89dbbe64-7263-4529-a7a8-54b6b96ed52d, build 1.0.2 (15), 19 Eylul 2026):
//   "The app declares support for audio in the UIBackgroundModes key in the
//   Info.plist but we are unable to locate any features that require
//   persistent audio."
//
// Lexis sadece kisa telaffuz sesleri calan bir kelime ogrenme uygulamasi --
// arka planda muzik/ses akisi gibi surekli calan bir ozelligi YOK. app.json
// zaten expo-audio plugin'ini `enableBackgroundPlayback: false` ile
// yapilandiriyor ve paketin kendi withAudio.ts kaynagina gore
// (enableBackgroundRecording || enableBackgroundPlayback) false oldugunda
// UIBackgroundModes'a 'audio' EKLENMEMESI gerekiyor -- ama reddedilen build
// (#15) ile sonrasindaki (#16, #17, #18) build'ler AYNI (dogru) app.json
// config'ini kullanmis olmasina ragmen sorun devam ediyor gibi gorunuyor;
// muhtemel sebep EAS Build'in fingerprint/prebuild onbelleginin, bu config
// duzeltmesinden ONCEKI (audio:true varsayilan) bir native prebuild ciktisini
// hala kullaniyor olmasi.
//
// Bu plugin, expo-audio (veya ileride baska bir paketin) UIBackgroundModes'a
// ne eklediginden BAGIMSIZ olarak, plugin zincirinin EN SONUNDA calisip
// 'audio' degerini Info.plist'ten KESIN sekilde siler. Bu hem olasi onbellek
// sorununu bypass eder (app.json'a yeni bir plugin dosyasi eklemek
// fingerprint'i degistirir, yeni bir native prebuild'i zorunlu kilar) hem de
// gelecekte baska bir plugin/paket ayni hatayi tekrarlarsa otomatik olarak
// temizler.
const { withInfoPlist } = require('expo/config-plugins');

const withStripAudioBackgroundMode = (config) => {
  return withInfoPlist(config, (config) => {
    if (Array.isArray(config.modResults.UIBackgroundModes)) {
      config.modResults.UIBackgroundModes = config.modResults.UIBackgroundModes.filter(
        (mode) => mode !== 'audio'
      );
      if (config.modResults.UIBackgroundModes.length === 0) {
        delete config.modResults.UIBackgroundModes;
      }
    }
    return config;
  });
};

module.exports = withStripAudioBackgroundMode;
