import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export default function WordsScreen() {
  const { t } = useLocale();
  const c = useThemeColors();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['words', debouncedSearch],
    queryFn: () => wordsApi.getAll({ search: debouncedSearch || undefined, per_page: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wordsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] }),
  });

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
      <WordRow
        word={item}
        onDelete={() => deleteMutation.mutate(item.id)}
        statusLabel={
          item.status === 'learned' ? t('statusLearned') : item.status === 'archived' ? t('statusArchived') : t('statusLearning')
        }
      />
    ),
    [deleteMutation, t]
  );

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <TextField
          placeholder={t('searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          // Kullanıcı geri bildirimi: kutu çok küçüktü, yazarken yazdığı
          // metni zor görüyordu. Yüksekliği ve yazı boyutunu büyütüyoruz.
          // ★ ASIL HATA BURADAYDI (3 Eylül 2026'da bulundu):
          // Bu stilde `flex: 1` vardı. `flex: 1` = flexBasis 0 demek. Bu
          // TextInput'un kapsayıcısı (TextField.tsx içindeki `inputWrap`
          // View'ı) sabit bir yüksekliğe sahip DEĞİL — yüksekliğini
          // içeriğinden alıyor. Yükseklik "auto" olan bir kapsayıcıda
          // flexBasis 0 olan çocuğun İÇERİK yüksekliği 0'a çöküyor: kutu
          // ekranda normal boyutta görünüyor (çünkü padding + border yerinde
          // duruyor) ama yazının çizileceği alan 0 piksel kalıyor. Sonuç:
          // kullanıcı yazıyor, `search` state'i güncelleniyor, liste doğru
          // filtreleniyor, iOS klavyesi bile yazılanı tahmin ediyor — ama
          // harfler EKRANDA GÖRÜNMÜYOR. Kullanıcının gönderdiği ekran
          // görüntüsündeki mavi seçim bloğu da bunu doğruluyor: metin var,
          // sadece çizilecek yeri yok. Genişlik zaten TextField'ın dış
          // View'ındaki `width: '100%'` ile geliyor, bu yüzden `flex: 1`e
          // hiç gerek yok — kaldırıyoruz. Rengi de garantiye almak için
          // açıkça veriyoruz.
          style={{
            marginBottom: 0,
            paddingVertical: spacing.md + 6,
            fontSize: 17,
            color: c.text,
            backgroundColor: c.surface,
          }}
        />
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={!isLoading ? <EmptyState title={t('noWordsFound')} subtitle={t('noWordsFoundSub')} /> : null}
        renderItem={renderItem}
      />

      <Pressable onPress={() => setModalOpen(true)} style={[styles.fab, { backgroundColor: c.primary }]}>
        <Text style={{ color: '#fff', fontSize: 26, lineHeight: 28 }}>+</Text>
      </Pressable>

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

const WordRow = React.memo(function WordRow({ word, onDelete, statusLabel }: { word: Word; onDelete: () => void; statusLabel: string }) {
  const c = useThemeColors();
  const statusColor = word.status === 'learned' ? c.success : word.status === 'archived' ? c.textMuted : c.primary;
  return (
    <Card style={styles.wordCard}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '700', fontSize: 15 }}>{word.word}</Text>
        <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
          {word.meaning_native || word.meaning}
        </Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
        <Text style={{ color: statusColor, fontSize: 11, fontWeight: '600' }}>{statusLabel}</Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={10} style={{ marginLeft: spacing.sm }}>
        <Text style={{ color: c.danger, fontSize: 16 }}>✕</Text>
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
        list_type: 'active',
      }),
    onSuccess: () => {
      setWord('');
      setMeaning('');
      setExample('');
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
      } else {
        // Web'deki eşdeğeri: sonuç boşsa görünür bir uyarı göster,
        // kullanıcı butonun bozuk olmadığını anlasın ve elle girebilsin.
        setLookupMsg(res.error || t('lookupNoMeaning'));
      }
    } catch (e: any) {
      // ÖNEMLİ AYRIM: buraya düşmek "kelime sözlükte yok" DEMEK DEĞİL —
      // istek hiç tamamlanamadı demek (zaman aşımı / ağ hatası / sunucu
      // hatası). Eskiden burada da "Sözlükte bulunamadı" yazıyordu ve bu
      // yüzden aylarca "iOS'ta Cambridge kelimeyi bulamıyor" sanıldı; oysa
      // canlı API aynı kelimeleri sorunsuz dönüyordu (3 Eylül 2026'da
      // doğrulandı). Artık nedeni ayırt edilebilir şekilde gösteriyoruz ki
      // bir daha karıştırılmasın.
      const isTimeout = e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message ?? '');
      setLookupMsg(
        isTimeout
          ? 'Sözlük sunucusu zamanında yanıt vermedi. Tekrar dene veya elle gir.'
          : 'Bağlantı hatası: sözlüğe ulaşılamadı. Tekrar dene veya elle gir.'
      );
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
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{t('addWordModalTitle')}</Text>

            <TextField
              label={t('wordRequiredLabel')}
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
            />
            <Button title={t('searchBtn')} variant="secondary" onPress={handleLookup} loading={looking} fullWidth={false} />

            {lookupMsg ? (
              <View style={[styles.lookupMsgBox, { backgroundColor: c.warningSoft }]}>
                <Text style={{ color: c.warning, fontSize: 12 }}>{lookupMsg}</Text>
              </View>
            ) : null}

            <View style={{ height: spacing.sm }} />
            <TextField label={t('meaningRequiredLabel')} value={meaning} onChangeText={setMeaning} />
            <TextField label={t('exampleLabel')} value={example} onChangeText={setExample} multiline />

            {error ? <Text style={{ color: c.danger, fontSize: 12, marginBottom: spacing.sm }}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <View style={{ flex: 1 }}>
                <Button title={t('cancelBtn')} variant="ghost" onPress={onClose} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={t('saveBtn')}
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
  header: { flexDirection: 'row', padding: spacing.lg, paddingBottom: spacing.sm },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  wordCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, paddingVertical: spacing.md },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  lookupMsgBox: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 8, marginTop: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
