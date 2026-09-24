// src/components/ui/ScreenNavBar.tsx
// Kullanici istegi (22 Eylul 2026): "hem mobil hem web, her bolumun ve alt
// sayfanin mutlaka bir 'geri don' ve bir 'ana menuye don' butonu olmali."
// Ekranlarin cogunda zaten kendi "Geri" satiri vardi (ArrowLeft + router.back(),
// bkz. report.tsx/rewards.tsx/exam-grammar.tsx deseni) ama HICBIRINDE ana
// menuye donus yoktu; duels/league/custom-leagues/quests/friends/messages/
// stats/premium/quiz/flashcards/duel-room ekranlarinda ise geri donus bile
// yoktu (yalnizca donanim geri tusu/iOS kaydirma jestiyle cikilabiliyordu).
//
// GERI ALINDI (24 Eylul 2026, kullanici geri bildirimi + ekran goruntusu):
// "mobilde bu ikonlar hicbir bolumde olmasin". 28 ekran dosyasinda ~50
// cagri noktasi var (bkz. git grep "ScreenNavBar" mobile/src) -- her birini
// tek tek duzenlemek yerine (ve JSX yapisini bozma riskine girmeden) TEK
// noktadan, bu bilesenin kendisi hicbir sey render etmeyecek sekilde
// degistirildi. Tum cagri yerleri (prop imzasi dahil) aynen kaliyor, sadece
// gorunmuyor -- boylece TypeScript/derleme tarafinda hicbir dosyaya
// dokunmadan sonuc aliniyor. DIKKAT: bu ekranlarin bir kismi (duels/league/
// custom-leagues/quests/friends/messages/stats/premium/quiz/flashcards/
// duel-room) bu bilesenden ONCE hic gorunur "Geri" secenegi sunmuyordu --
// donanim geri tusu (Android) ve kenardan kaydirma jesti (iOS) hala
// calisiyor, ama gorunur bir buton yok. Kullanici bunu istedi, ama ileride
// bu ekranlarda kaybolma sikayeti gelirse ilk bakilacak yer burasi.
import type { ViewStyle } from 'react-native';

interface ScreenNavBarProps {
  // Geri butonuna ozel davranis gerekiyorsa (orn. placement sinavinda
  // router.replace kullanilmasi gibi) override edilebilir.
  onBack?: () => void;
  // Bazi ekranlarda (orn. bir akisin ilk adimi) geri butonu anlamsiz olabilir.
  showBack?: boolean;
  style?: ViewStyle;
}

export function ScreenNavBar(_props: ScreenNavBarProps) {
  return null;
}
