import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Search, Volume2, X, Plus, ChevronLeft, ChevronRight, Check, Tag } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { useLocale } from '@/i18n';
import { wordsApi, dictionaryApi } from '@/api/words';
import type { Word } from '@/api/types';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

// game.tsx / flashcards.tsx::SPEECH_LANG_MAP ile BİREBİR aynı (kasıtlı küçük
// tekrar — bkz. flashcards.tsx dosya başındaki aynı yorum).
const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-US',
  tr: 'tr-TR',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  ja: 'ja-JP',
  ar: 'ar-SA',
  ru: 'ru-RU',
};

// ── Kelimeler sayfası yeniden tasarımı (27 Eylül 2026, kullanıcı isteği:
// "Kelimeler sayfasının iç dizaynı biraz daha değiştir, yeni tasarımlar
// bekliyorum senden") ──
//
// Tasarım, bu proje için daha önce onaylanmış bir Cowork Design canvas'ındaki
// WordList.dc.html / WordList_Dark.dc.html taslaklarına dayanıyor (bkz.
// DashboardHeader.tsx'teki aynı canvas referansı — https://claude.ai/
// artifact/9WdZvZiwYtdsXLzb9kd2hj), ama birebir kopya değil, iki bilinçli
// uyarlama yapıldı:
//   1. Taslakta bir "Geri" oku vardı — ScreenNavBar.tsx'e bakılırsa (24
//      Eylül 2026 kullanıcı isteği: "mobilde bu ikonlar hiçbir bölümde
//      olmasın") bu UYGULAMANIN HİÇBİR EKRANINDA görünür bir geri butonu
//      YOK — Kelimeler zaten bir alt-sekme kökü, geri oku eklemek bu
//      kararla çelişirdi, o yüzden hiç eklenmedi.
//   2. Taslaktaki üçüncü filtre "Zor" idi ama backend'de/veri modelinde
//      böyle bir alan/durum yok (Word.status sadece learning/learned/
//      archived) — sahte bir sayı uydurmak yerine üçüncü filtreyi gerçekten
//      var olan "Öğrenildi" (learned) durumuna çevirdik.
//
// Kalan tek yeni-veri ihtiyacı: her satırdaki dairesel ilerleme halkası.
// Backend'de kelime bazlı bir "ustalık %"si hiç tutulmuyor, ama SM-2 tekrar
// algoritmasının zaten yazdığı `ease_factor` (kelime ne kadar kolaylaştı —
// bkz. Word tipi, review_word endpoint'i) tam olarak bunun için var: yanlış
// cevaplandıkça düşer (taban ~1.3), doğru cevaplandıkça yükselir. Bunu
// 0-1 aralığına normalize edip halkanın doluluğu + rengi (kırmızı/turuncu/
// yeşil) olarak kullanıyoruz — status 'learned' ise halka her zaman tam ve
// yeşil + tik işareti (taslaktaki desenle aynı mantık).
const EASE_FLOOR = 1.3;
const EASE_CEILING = 2.6;

function easeProgress(ease: number | undefined): number {
  if (ease == null) return 0;
  return Math.max(0, Math.min(1, (ease - EASE_FLOOR) / (EASE_CEILING - EASE_FLOOR)));
}

type StatusFilter = 'all' | 'learning' | 'learned';

// Sayfalama (27 Eylül 2026, kullanıcı isteği: "liste çok uzun olabiliyor, 10
// kelimeden sonra 2. sayfaya geçsin, 20'den fazlaysa 3 sayfa olsun"): backend
// zaten `page`/`page_size` destekliyor ve tam `total` sayısı döndürüyor
// (words.ts::PaginatedWords.pages = ceil(total/page_size)) -- yani standart
// bir sayfa boyutu (10) seçip mevcut `total`/`pages` alanlarını kullanmak
// TAM OLARAK istenen davranışı veriyor: 11-20 kelime -> 2 sayfa, 21-30 -> 3
// sayfa, vs. -- ayrı bir eşik mantığı yazmaya gerek yok.
const WORDS_PAGE_SIZE = 10;

// Sayfa numarası şeridini kısa tutmak için (çok sayfa olduğunda 1 2 3 4 5 6 7
// 8 9 10'u art arda dizmek yerine): ilk, son ve aktif sayfanın komşularını
// gösterip aradakileri "…" ile kısaltıyoruz -- App Store/klasik pagination
// deseni.
function buildPageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  const nums = Array.from(set)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const result: (number | '…')[] = [];
  let prev = 0;
  for (const n of nums) {
    if (prev && n - prev > 1) result.push('…');
    result.push(n);
    prev = n;
  }
  return result;
}

export default function WordsScreen() {
  const { t } = useLocale();
  const c = useThemeColors();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  // Arama kutusuna her tuş vuruşunda anında sorgu tetiklemek, ağ isteğini
  // ve bununla birlikte FlatList'in "refreshing" durumunu her karakterde
  // yeniden tetikliyordu. Bu, özellikle iOS'ta RefreshControl'ün klavyeyi
  // kapatmasına ve yazılan metnin "kaybolmuş" gibi görünmesine yol açıyordu.
  // Aramayı 350ms'lik bir yazma duraklamasından sonra çalıştırarak hem bu
  // titremeyi/klavye kapanmasını önlüyor hem de gereksiz istekleri azaltıyoruz.
  // Kutuya yazılan metin (`search`) her zaman anında ekranda görünür; sorgu
  // yalnızca `debouncedSearch` değiştiğinde çalışır.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Arama veya filtre değiştiğinde, önceki sonuç kümesinde geçerli olan bir
  // sayfa numarasında kalakalmayı önlemek için (ör. "Öğrenildi" filtresinde
  // 3. sayfadayken "Tümü"ne geçince 3. sayfa boş görünebilirdi) her zaman 1.
  // sayfaya dönüyoruz.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['words', debouncedSearch, statusFilter, page],
    queryFn: () =>
      wordsApi.getAll({
        search: debouncedSearch || undefined,
        per_page: WORDS_PAGE_SIZE,
        page,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });
  const totalPages = data?.pages ?? 1;

  // Filtre çiplerindeki sayılar (Tümü/Öğreniliyor/Öğrenildi) aktif arama/
  // filtreden BAĞIMSIZ, her zaman tüm kelime hazinesinin genel dökümü —
  // taslaktaki "Tümü · 248" gibi sabit bir özet sayı niyetiyle. Üç ayrı
  // per_page:1 isteği (gövde neredeyse boş, sadece `total` için) — ağır bir
  // maliyet değil. `['words','counts']` anahtarı bilinçli: mevcut
  // create/delete akışları zaten `invalidateQueries({queryKey:['words']})`
  // çağırıyor, React Query'nin ön-ek eşleşmesi sayesinde bu da otomatik
  // tazeleniyor, ayrı bir invalidate eklemeye gerek kalmadı.
  const { data: counts } = useQuery({
    queryKey: ['words', 'counts'],
    queryFn: async () => {
      const [all, learning, learned] = await Promise.all([
        wordsApi.getAll({ per_page: 1 }),
        wordsApi.getAll({ per_page: 1, status: 'learning' }),
        wordsApi.getAll({ per_page: 1, status: 'learned' }),
      ]);
      return { all: all.total, learning: learning.total, learned: learned.total };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wordsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] }),
  });

  const speakWord = useCallback(
    (text: string) => {
      if (!text) return;
      const langCode = SPEECH_LANG_MAP[user?.learning_lang ?? ''];
      try {
        Speech.stop();
        Speech.speak(text, { language: langCode });
      } catch {
        /* sessiz — telaffuz ikincil bir özellik, hata kelime listesini bozmasın */
      }
    },
    [user?.learning_lang]
  );

  // FlatList'e her tuş vuruşunda YENİ bir inline renderItem/onDelete
  // fonksiyonu geçmek, `search` state'i değiştikçe (yani yazarken) listedeki
  // TÜM satırların gereksiz yere yeniden render edilmesine yol açıyordu.
  // Kelime listesi büyüdükçe bu, özellikle daha zayıf cihazlarda yazarken
  // gözle görülür bir gecikmeye/asılı kalmaya sebep oluyor, kullanıcıya
  // "yazdığım harfler görünmüyor" gibi geliyordu. renderItem'ı useCallback
  // ile sabitleyip WordRow'u React.memo yaparak arama kutusuna yazmanın
  // liste satırlarını tekrar tekrar çizmesini engelliyoruz.
  const renderItem = useCallback(
    ({ item }: { item: Word }) => (
      <WordRow word={item} onDelete={() => deleteMutation.mutate(item.id)} onSpeak={() => speakWord(item.word)} />
    ),
    [deleteMutation, speakWord]
  );

  return (
    <ScreenContainer scroll={false} padded={false}>
      {/* Üst panel artık düz bir arka plan değil, DashboardHeader.tsx'teki
          aynı primary→accent gradyanı kullanan bir "hero" panel (kullanıcı
          geri bildirimi, 27 Eylül 2026: "ek gelen pek bir şey olmamış" —
          önceki sürümde sadece ince gölgeler vardı, marka rengiyle
          bütünleşen belirgin bir görsel katman yoktu). Yapı (başlık solda +
          ekle sağda, altında arama, altında filtre çipleri) AYNEN korundu —
          kullanıcı açıkça "mevcut düzeni koru, sadece görseli zenginleştir"
          dedi; sadece bu üç bloğun arka planı ve buna göre renk kontrastı
          değişti. */}
      <LinearGradient colors={[c.primary, c.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroPanel}>
        <View style={styles.topBar}>
          <Text style={styles.title}>{t('words')}</Text>
          <Pressable
            onPress={() => setModalOpen(true)}
            hitSlop={8}
            style={styles.addBtn}
            accessibilityLabel={t('addWordBtn')}
          >
            <Plus color={c.primary} size={19} strokeWidth={2.7} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: c.surface }]}>
            <Search color={c.textMuted} size={16} />
            <TextField
              placeholder={t('searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              // ★ ASIL HATA BURADAYDI (3 Eylül 2026'da bulundu, bkz. eski kod):
              // `flex: 1` = flexBasis 0, yüksekliği "auto" olan bir kapsayıcıda
              // içerik yüksekliğini 0'a çöktürüyordu (yazı görünmüyordu). Aynı
              // hataya tekrar düşmemek için burada da flex'siz, tam genişlikte
              // ve şeffaf arka planlı (dış kutu zaten arka planı veriyor) bir
              // stil kullanıyoruz.
              style={{
                marginBottom: 0,
                paddingVertical: spacing.sm + 2,
                paddingHorizontal: 0,
                fontSize: 14,
                color: c.text,
                backgroundColor: 'transparent',
                borderWidth: 0,
                flex: 1,
              }}
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          <FilterChip
            label={`${t('allFilterLabel')} · ${counts?.all ?? '—'}`}
            active={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
            c={c}
          />
          <FilterChip
            label={`${t('statusLearning')} · ${counts?.learning ?? '—'}`}
            active={statusFilter === 'learning'}
            onPress={() => setStatusFilter('learning')}
            c={c}
          />
          <FilterChip
            label={`${t('statusLearned')} · ${counts?.learned ?? '—'}`}
            active={statusFilter === 'learned'}
            onPress={() => setStatusFilter('learned')}
            c={c}
          />
        </View>
      </LinearGradient>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={!isLoading ? <EmptyState title={t('noWordsFound')} subtitle={t('noWordsFoundSub')} /> : null}
        renderItem={renderItem}
      />

      <PaginationBar page={page} totalPages={totalPages} onChange={setPage} c={c} />

      <AddWordModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          qc.invalidateQueries({ queryKey: ['words'] });
        }}
        learningLang={user?.learning_lang}
        nativeLang={user?.native_lang}
      />
    </ScreenContainer>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  c,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  // Çipler artık gradyanlı hero panelinin üstünde oturuyor -- eski
  // surface/border renkleri koyu zemin üzerinde görünmez olurdu. Aktif çip
  // beyaz zemin + marka rengi yazı ile "seçili" hissini net veriyor; pasif
  // çipler yarı saydam beyaz bir cam (glassmorphism) yüzey.
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: '#FFFFFF', shadowColor: '#000000' }
          : { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1 },
      ]}
    >
      <Text style={{ color: active ? c.primary : '#FFFFFF', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

// Sayfalama şeridi — sadece FlatList'in altında, birden fazla sayfa varken
// görünür (tek sayfalık listelerde gereksiz boşluk/karmaşa yaratmasın diye
// totalPages<=1 iken tamamen render edilmiyor). Çok sayfa olduğunda tüm
// numaraları art arda dizmek yerine ilk/son + aktif sayfanın komşularını
// gösterip aradakileri "…" ile kısaltıyoruz (bkz. buildPageList).
function PaginationBar({
  page,
  totalPages,
  onChange,
  c,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  if (totalPages <= 1) return null;
  const items = buildPageList(page, totalPages);

  return (
    <View style={[styles.pagerWrap, { borderTopColor: c.border }]}>
      <Pressable
        onPress={() => onChange(page - 1)}
        disabled={page <= 1}
        hitSlop={6}
        style={[styles.pagerArrow, { opacity: page <= 1 ? 0.3 : 1 }]}
      >
        <ChevronLeft color={c.textSecondary} size={18} />
      </Pressable>

      <View style={styles.pagerNums}>
        {items.map((it, i) =>
          it === '…' ? (
            <Text key={`e-${i}`} style={{ color: c.textMuted, fontSize: 12, paddingHorizontal: 2 }}>
              …
            </Text>
          ) : (
            <Pressable
              key={it}
              onPress={() => onChange(it)}
              style={[
                styles.pagerNum,
                { backgroundColor: it === page ? c.primary : 'transparent' },
                it === page && { shadowColor: c.primary },
              ]}
            >
              <Text style={{ color: it === page ? '#FFFFFF' : c.textSecondary, fontSize: 12, fontWeight: '700' }}>{it}</Text>
            </Pressable>
          )
        )}
      </View>

      <Pressable
        onPress={() => onChange(page + 1)}
        disabled={page >= totalPages}
        hitSlop={6}
        style={[styles.pagerArrow, { opacity: page >= totalPages ? 0.3 : 1 }]}
      >
        <ChevronRight color={c.textSecondary} size={18} />
      </Pressable>
    </View>
  );
}

const RING_SIZE = 34;
const RING_R = 14;
const RING_STROKE = 4;
const RING_CIRC = 2 * Math.PI * RING_R;

const WordRow = React.memo(function WordRow({
  word,
  onDelete,
  onSpeak,
}: {
  word: Word;
  onDelete: () => void;
  onSpeak: () => void;
}) {
  const c = useThemeColors();
  const { t } = useLocale();
  const isLearned = word.status === 'learned';
  const progress = isLearned ? 1 : easeProgress(word.ease_factor);
  const ringColor = isLearned || progress >= 0.6 ? c.success : progress >= 0.3 ? c.warning : c.danger;
  const ringTrack = isLearned || progress >= 0.6 ? c.successSoft : progress >= 0.3 ? c.warningSoft : c.dangerSoft;
  const dashOffset = RING_CIRC * (1 - progress);
  const statusLabel =
    word.status === 'learned' ? t('statusLearned') : word.status === 'archived' ? t('statusArchived') : t('statusLearning');
  // Rozet artık durum bazlı renkli (önceki tasarımda tek düz gri idi) --
  // öğrenildi/öğreniliyor/arşiv durumları arasındaki farkı bir bakışta ayırt
  // etmek için aynı success/primarySoft/border token'larını kullanıyoruz.
  const badgeBg = word.status === 'learned' ? c.successSoft : word.status === 'archived' ? c.border : c.primarySoft;
  const badgeFg = word.status === 'learned' ? c.success : word.status === 'archived' ? c.textSecondary : c.primary;

  return (
    <Card style={[styles.wordCard, { shadowColor: '#000000', overflow: 'hidden' }]}>
      {/* Sol kenardaki renkli şerit -- ustalık halkasının rengini kart
          düzeyinde de tekrarlayıp listeyi tararken (halkanın küçük detayına
          bakmadan) durumu bir bakışta ayırt etmeyi kolaylaştırıyor. */}
      <View style={[styles.wordCardAccent, { backgroundColor: ringColor }]} />
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} stroke={ringTrack} strokeWidth={RING_STROKE} fill="none" />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke={ringColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
            strokeDashoffset={dashOffset}
            rotation={-90}
            originX={RING_SIZE / 2}
            originY={RING_SIZE / 2}
          />
        </Svg>
        {isLearned && (
          <View style={styles.ringCheck}>
            <Text style={{ color: ringColor, fontSize: 12, fontWeight: '800' }}>✓</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={{ color: c.text, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
          {word.word}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 11.5, fontWeight: '500', marginTop: 1 }} numberOfLines={1}>
          {word.meaning_native || word.meaning}
        </Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
        <Text style={{ color: badgeFg, fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
          {statusLabel}
        </Text>
      </View>

      <Pressable onPress={onSpeak} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.background }]}>
        <Volume2 color={c.textSecondary} size={14} />
      </Pressable>
      <Pressable onPress={onDelete} hitSlop={8} style={[styles.iconBtn, { backgroundColor: c.dangerSoft, marginLeft: 6 }]}>
        <X color={c.danger} size={14} />
      </Pressable>
    </Card>
  );
});

function AddWordModal({
  visible,
  onClose,
  onCreated,
  learningLang,
  nativeLang,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
  learningLang?: string;
  nativeLang?: string;
}) {
  const { t } = useLocale();
  const c = useThemeColors();
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  // Sözlük aramasından gelen kelime türü (noun/verb/adj vb.) — ★ 10 Eylül 2026
  // bug fix: bu state hiç yoktu, handleLookup sonucu hiçbir yerde tutulmuyor
  // ve wordsApi.create çağrısına word_type/word_type_native hiç gönderilmiyordu
  // (web tarafında bu alan doğru gönderiliyordu). Sonuç: mobilden eklenen
  // TÜM kelimelerde word_type veritabanında NULL kalıyordu — bu da hem
  // "Kelime Türü" filtresini/istatistiğini hem de V2 madde #6'daki
  // "zayıf kelime türleri" özelliğini işlevsiz bırakıyordu.
  const [wordType, setWordType] = useState('');
  const [wordTypeNative, setWordTypeNative] = useState('');
  const [error, setError] = useState('');
  const [looking, setLooking] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');

  // Modal kapatılıp (İptal/dışarı tıklama ile) tekrar "+" ile açıldığında
  // eski arama sonucu (Anlam/Örnek cümle/hata) hâlâ state'te duruyordu —
  // çünkü modal hiç unmount olmuyor, sadece `visible` prop'u değişiyor.
  // Sonuç: kullanıcı yeni bir kelime yazsa bile "Anlam" alanında BİR ÖNCEKİ
  // aramadan kalma alakasız bir değer (ör. daha önce başka bir kelime için
  // gelen bir çeviri) görünmeye devam ediyordu — sözlükten hatalı/garip bir
  // sonuç geldiği izlenimi veriyordu. Modal her açıldığında tüm alanları
  // sıfırlıyoruz ki her "Yeni Kelime Ekle" oturumu temiz başlasın.
  useEffect(() => {
    if (visible) {
      setWord('');
      setMeaning('');
      setExample('');
      setWordType('');
      setWordTypeNative('');
      setError('');
      setLookupMsg('');
    }
  }, [visible]);

  const createMutation = useMutation({
    mutationFn: () =>
      wordsApi.create({
        word: word.trim(),
        meaning: meaning.trim() || word.trim(),
        meaning_native: meaning.trim() || undefined,
        example: example.trim() || undefined,
        word_type: wordType.trim() || undefined,
        word_type_native: wordTypeNative.trim() || undefined,
        list_type: 'active',
      }),
    onSuccess: () => {
      setWord('');
      setMeaning('');
      setExample('');
      setWordType('');
      setWordTypeNative('');
      onCreated();
    },
    onError: (e) => setError(getErrorMessage(e, t('saveFailed'))),
  });

  const handleLookup = async () => {
    if (!word.trim()) return;
    setLooking(true);
    setLookupMsg('');
    try {
      const res = await dictionaryApi.lookup(word.trim(), learningLang, nativeLang);
      if (res.meanings.length > 0) {
        setMeaning(res.meanings[0].meaning_native || res.meanings[0].meaning_target);
        if (res.meanings[0].examples?.length) setExample(res.meanings[0].examples[0]);
        setWordType(res.meanings[0].word_type || '');
        setWordTypeNative(res.meanings[0].word_type_native || '');
      } else {
        // Web'deki eşdeğeri: sonuç boşsa görünür bir uyarı göster,
        // kullanıcı butonun bozuk olmadığını anlasın ve elle girebilsin.
        setLookupMsg(res.error || t('lookupNoMeaning'));
      }
    } catch (e: any) {
      // ★ ASIL HATA BURADAYDI (3 Eylül 2026'da bulundu):
      // Backend (backend/app/api/routes/dictionary.py) anlam bulamadığında
      // 200 + boş liste DEĞİL, **HTTP 404** döndürüyor. axios 404'ü istisna
      // sayıp doğrudan buraya atlıyor — yani yukarıdaki `res.meanings.length`
      // kontrolü ve backend'in kendi açıklayıcı mesajı ("Anlam bulunamadı,
      // elle girebilirsin.") HİÇBİR ZAMAN ekrana gelemiyordu. Kullanıcıya
      // hep genel bir hata görünüyordu ve bu yüzden "iOS'ta Cambridge
      // kelimeyi bulamıyor" sanıldı. Oysa canlı API testi gösterdi ki:
      //   learning_lang=en → "try" 10 anlam, "bus" 4 anlam (source: cambridge)
      //   learning_lang=de → 404
      // Yani sorun sözlükte değil, o an AKTİF ÖĞRENME DİLİNDE: cihazda
      // Almanca aktifken İngilizce kelime aranınca doğal olarak sonuç yok.
      // Artık 404'ü "bulunamadı" olarak, gerçek ağ/zaman aşımı hatalarını
      // ise ayrı ayrı gösteriyoruz.
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      const isTimeout = e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message ?? '');
      if (status === 404) {
        setLookupMsg(typeof detail === 'string' && detail ? detail : t('lookupNoMeaning'));
      } else if (isTimeout) {
        setLookupMsg('Sözlük sunucusu zamanında yanıt vermedi. Tekrar dene veya elle gir.');
      } else if (status) {
        setLookupMsg(`Sözlük servisi hata verdi (${status}). Tekrar dene veya elle gir.`);
      } else {
        setLookupMsg('Bağlantı hatası: sözlüğe ulaşılamadı. Tekrar dene veya elle gir.');
      }
    } finally {
      setLooking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Kullanıcı geri bildirimi: klavye açılınca (özellikle "Kelime" alanına
          dokununca) modal kartı hem iOS hem Android'de neredeyse tamamen
          klavyenin arkasında kalıyor, üstteki "Kelime" alanı görünmez oluyordu.
          Sebep: modalCard'ın sabit bir yüksekliği/limiti yoktu ve içeriği
          kaydırılamıyordu — klavye açılınca kalan alan içeriğe yetmiyordu.
          Şimdi: modalCard'a bir üst sınır (maxHeight) koyup alanları bir
          ScrollView içine aldık, Android için de behavior="height" ekledik
          (Android'de "padding" davranışı beklendiği gibi çalışmıyordu) —
          böylece klavye açıkken de tüm alanlara kaydırarak ulaşılabiliyor. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={{ flex: 1 }}
      >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
          {/* Üst sürükleme çubuğu + kapatma butonu + ortalanmış başlık
              (kullanıcı isteği, 27 Eylül 2026: "yeni kelime ekle bölümü de
              tasarlanmalı" -- eski sürüm düz bir başlık + altında dikey
              sıralanmış alanlardı; artık bir iOS/Android "sheet" hissi
              veren bir üst şerit, kapatma X'i ve arama alanını doğrudan bir
              "ara" butonuyla birleştiren tek satırlık bir arayüz var). Bu X
              bir EKRAN geri butonu değil, bu modal'a özel bir kapatma
              affordance'ı -- ScreenNavBar.tsx'teki "hiçbir ekranda görünür
              geri oku olmasın" kararı sekmeler arası gezinme için, modal
              kapatma ile ilgisi yok. */}
          <View style={styles.modalHandle} />
          <View style={styles.modalTopRow}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{t('addWordModalTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={[styles.modalCloseBtn, { backgroundColor: c.background }]}>
              <X color={c.textSecondary} size={16} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {learningLang ? (
              <View style={[styles.langPill, { backgroundColor: c.primarySoft }]}>
                <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>
                  {learningLang.toUpperCase()} → {(nativeLang ?? 'tr').toUpperCase()}
                </Text>
              </View>
            ) : null}

            {/* Kelime alanı + arama artık tek bir satırda birleşik: TextField
                sola, dairesel "ara" butonu sağa. Önceki sürümde "Ara" tam
                genişlikte, alanın ALTINDA ayrı bir buton olarak duruyordu --
                sözlük araması ile veri girişini görsel olarak iki ayrı adım
                gibi gösteriyordu. */}
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{t('wordRequiredLabel')}</Text>
            <View style={styles.lookupRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={word}
                  onChangeText={(v) => {
                    setWord(v);
                    if (lookupMsg) setLookupMsg('');
                  }}
                  autoCapitalize="none"
                  // iOS'ta sistem otomatik düzeltmesi/imla önerisi, kullanıcı yazmayı
                  // bitirmeden (boşluk/noktalama ile) kelimeyi sessizce farklı bir
                  // kelimeyle değiştirebiliyordu (Android'de bu davranış yok). Sonuç:
                  // sözlükte aranan kelime kullanıcının yazdığından farklı oluyor,
                  // eşleşme bulunamıyor, kayıt sırasında "anlam" alanı (bulunamayan
                  // çeviri yerine düşen) kelimenin kendisiyle doluyor ve "örnek cümle"
                  // boş kalıyordu. Otomatik düzeltmeyi kapatarak arananla kaydedilenin
                  // her zaman kullanıcının yazdığı kelime olmasını garantiliyoruz.
                  autoCorrect={false}
                  spellCheck={false}
                  style={{ marginBottom: 0 }}
                />
              </View>
              <Pressable
                onPress={handleLookup}
                disabled={looking || !word.trim()}
                style={[
                  styles.lookupBtn,
                  { backgroundColor: c.primary, opacity: !word.trim() ? 0.4 : 1, shadowColor: c.primary },
                ]}
                accessibilityLabel={t('searchBtn')}
              >
                {looking ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Search color="#FFFFFF" size={18} />}
              </Pressable>
            </View>

            {/* Sözlükten kelime türü (isim/fiil vb.) tespit edildiyse küçük
                bir etiket olarak gösteriyoruz -- kullanıcı neyin otomatik
                dolduğunu görsün diye (önceki sürümde bu bilgi state'te
                tutulup sessizce kaydediliyordu, ekranda hiç görünmüyordu). */}
            {wordTypeNative ? (
              <View style={styles.wordTypeTag}>
                <Tag color={c.textSecondary} size={11} />
                <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '600', marginLeft: 4 }}>{wordTypeNative}</Text>
              </View>
            ) : null}

            {lookupMsg ? (
              <View style={[styles.lookupMsgBox, { backgroundColor: c.warningSoft }]}>
                <Text style={{ color: c.warning, fontSize: 12 }}>{lookupMsg}</Text>
              </View>
            ) : null}

            <View style={{ height: spacing.md }} />
            <TextField label={t('meaningRequiredLabel')} value={meaning} onChangeText={setMeaning} />
            <TextField label={t('exampleLabel')} value={example} onChangeText={setExample} multiline />

            {error ? <Text style={{ color: c.danger, fontSize: 12, marginBottom: spacing.sm }}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable onPress={onClose} hitSlop={8} style={styles.cancelLink}>
                <Text style={{ color: c.textSecondary, fontSize: 15, fontWeight: '600' }}>{t('cancelBtn')}</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('saveBtn')}
                  icon={<Check color="#FFFFFF" size={17} />}
                  onPress={() => {
                    if (!word.trim() || !meaning.trim()) {
                      setError(t('meaningRequired'));
                      return;
                    }
                    setError('');
                    createMutation.mutate();
                  }}
                  loading={createMutation.isPending}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  // Başlık + arama + filtre çiplerini saran gradyanlı "hero" panel (bkz.
  // DashboardHeader.tsx'teki aynı primary→accent gradyanı) -- altındaki
  // beyaz listeyle net bir kontrast oluşturması için alt köşeleri
  // yuvarlatıldı.
  heroPanel: {
    paddingTop: spacing.md,
    borderBottomLeftRadius: radius.xl + 4,
    borderBottomRightRadius: radius.xl + 4,
  },
  title: { fontSize: 21, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  // Ekle butonu artık gradyan üstünde beyaz bir zemin üzerinde marka rengi
  // ikonla duruyor (renk tersine çevrildi) -- koyu bir zeminde önceki düz
  // mavi buton neredeyse görünmüyordu.
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  filterRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 24 },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm + 4,
    paddingLeft: spacing.sm + 8,
    borderWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 2,
  },
  wordCardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCheck: { position: 'absolute' },
  statusBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginLeft: spacing.xs,
    maxWidth: 78,
  },
  iconBtn: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs },
  // Sayfalama şeridi
  pagerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pagerArrow: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  pagerNums: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  pagerNum: {
    minWidth: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxHeight: '90%',
  },
  // iOS/Android "sheet" hissi veren üst sürükleme çubuğu -- gerçek bir
  // sürükle-kapat davranışı yok (o ayrı bir jest kütüphanesi gerektirir),
  // sadece bunun bir alt sayfa olduğunu görsel olarak imliyor.
  modalHandle: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: 'rgba(120,120,128,0.28)', alignSelf: 'center', marginBottom: spacing.sm },
  modalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalCloseBtn: { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  langPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, marginBottom: spacing.md },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  lookupRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  lookupBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  wordTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  lookupMsgBox: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 8, marginTop: spacing.xs },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  cancelLink: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
});
