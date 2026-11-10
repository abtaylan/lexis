// src/app/(app)/image-scan.tsx — "Görsel Tara" (10 Kasım 2026 kullanıcı
// isteği, Behçet): "Lexis de görüntü işleme yapacaz, bir resim çektiğimizde
// içindeki metni çözecek, hem metnin çevirisini yapacak, hem de metindeki
// kelimeleri liste halinde yazacak." PREMIUM özellik — kendi sekmesi yok,
// dashboard'daki "Görsel Tara" kısayolundan açılıyor (Diyalog/Çalışma
// Notlarım ile AYNI desen, bkz. dashboard.tsx + _layout.tsx).
//
// Fotoğraf çekme desteği bu uygulamada İLK kez burada kullanılıyor (bkz.
// app.json::expo-image-picker.cameraPermission) — study-notes-detail.tsx'teki
// galeri-seçim deseniyle AYNI "lazy require" yaklaşımı, kameraya da uygulandı.
//
// Taranan kelimeler ayrı bir tabloya YAZILMIYOR — "Ekle" butonu, mevcut
// wordsApi.create() çağrısını doğrudan kullanıyor (exam-grammar-detail.tsx'teki
// "Günün Okuma Parçası" kelime ekleme deseniyle AYNI).
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Camera, ImageIcon, ScanText, Plus, CheckCircle2, Crown, Languages } from 'lucide-react-native';
import { imageScanApi, type PickedScanImage } from '@/api/imageScan';
import { wordsApi } from '@/api/words';
import type { ImageScanResult, ScannedWord } from '@/api/types';
import { useAuth } from '@/store/auth';
import { getErrorMessage } from '@/utils/errors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

async function pickFromCamera(): Promise<PickedScanImage | null> {
  let ImagePicker: typeof import('expo-image-picker');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- bkz. study-notes-detail.tsx::pickImages
    ImagePicker = require('expo-image-picker');
  } catch {
    Alert.alert('Güncelleme gerekiyor', 'Bu özellik için uygulamayı güncellemen gerekiyor.');
    return null;
  }
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') {
    Alert.alert('İzin gerekli', 'Fotoğraf çekebilmek için kamera erişim izni vermelisin.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.fileName || 'tarama.jpg', type: a.mimeType || 'image/jpeg' };
}

async function pickFromGallery(): Promise<PickedScanImage | null> {
  let ImagePicker: typeof import('expo-image-picker');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ImagePicker = require('expo-image-picker');
  } catch {
    Alert.alert('Güncelleme gerekiyor', 'Bu özellik için uygulamayı güncellemen gerekiyor.');
    return null;
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    Alert.alert('İzin gerekli', 'Görsel seçebilmek için galeri erişim izni vermelisin.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.fileName || 'tarama.jpg', type: a.mimeType || 'image/jpeg' };
}

function WordRow({ item }: { item: ScannedWord }) {
  const c = useThemeColors();
  const [added, setAdded] = useState(false);

  const addWordMutation = useMutation({
    mutationFn: () =>
      wordsApi.create({
        word: item.word,
        meaning: item.meaning,
        word_type: item.word_type || undefined,
        example: item.example || undefined,
        list_type: 'active',
      }),
    onSuccess: () => setAdded(true),
    onError: (err: unknown) => {
      // 409 = kelime zaten ekli -- kullanıcı için bu da bir başarı durumu.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setAdded(true);
      } else {
        Alert.alert('Hata', 'Kelime eklenemedi, tekrar dener misin?');
      }
    },
  });

  return (
    <Card style={{ paddingVertical: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>
            {item.word}
            {item.word_type ? <Text style={{ fontSize: 12, color: c.textMuted }}> ({item.word_type})</Text> : null}
          </Text>
          <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }}>{item.meaning}</Text>
        </View>
        <Pressable
          onPress={() => addWordMutation.mutate()}
          disabled={added || addWordMutation.isPending}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            borderRadius: radius.full,
            backgroundColor: added ? c.successSoft : c.primarySoft,
          }}
        >
          {addWordMutation.isPending ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : added ? (
            <CheckCircle2 color={c.success} size={16} />
          ) : (
            <Plus color={c.primary} size={16} />
          )}
          <Text style={{ fontSize: 12, fontWeight: '700', color: added ? c.success : c.primary }}>
            {added ? 'Eklendi' : 'Ekle'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function ImageScanScreen() {
  const c = useThemeColors();
  const { user } = useAuth();
  const isPremium = !!user?.is_premium;

  const [image, setImage] = useState<PickedScanImage | null>(null);
  const [result, setResult] = useState<ImageScanResult | null>(null);
  const [error, setError] = useState('');

  const scanMutation = useMutation({
    mutationFn: (img: PickedScanImage) => imageScanApi.scan(img),
    onSuccess: (data) => {
      setResult(data);
      setError('');
    },
    onError: (err: unknown) => setError(getErrorMessage(err, 'Görsel taranamadı. Lütfen tekrar dene.')),
  });

  const handlePick = async (source: 'camera' | 'gallery') => {
    const picked = source === 'camera' ? await pickFromCamera() : await pickFromGallery();
    if (!picked) return;
    setImage(picked);
    setResult(null);
    setError('');
  };

  if (!isPremium) {
    return (
      <ScreenContainer>
        <ScreenNavBar />
        <Pressable onPress={() => router.push('/(app)/dashboard')} style={{ marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted }}>← Panele Dön</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, marginBottom: spacing.md }}>Görsel Tara</Text>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: c.warningSoft }}>
          <Crown color={c.warning} size={28} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text, marginTop: spacing.sm, textAlign: 'center' }}>
            Bu özellik premium üyelere özel
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: c.textSecondary,
              marginTop: 4,
              textAlign: 'center',
              paddingHorizontal: spacing.md,
            }}
          >
            Görsel tarama, çeviri ve otomatik kelime çıkarımı için Premium&apos;a geçmen gerekiyor.
          </Text>
          <View style={{ marginTop: spacing.md, width: '80%' }}>
            <Button
              title="Premium'a Geç"
              icon={<Crown color="#FFFFFF" size={18} />}
              onPress={() => router.push('/(app)/premium')}
            />
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenNavBar />
      <Pressable onPress={() => router.push('/(app)/dashboard')} style={{ marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted }}>← Panele Dön</Text>
      </Pressable>
      <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>Görsel Tara</Text>
      <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2, marginBottom: spacing.md }}>
        Bir fotoğraf çek ya da galeriden seç — içindeki metni okuyup çevirelim, kelimeleri de tek dokunuşla kelime
        listene ekleyebilesin diye listeleyelim.
      </Text>

      {!image ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Fotoğraf Çek" icon={<Camera color="#FFFFFF" size={18} />} onPress={() => handlePick('camera')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Galeriden Seç"
              variant="secondary"
              icon={<ImageIcon color={c.primary} size={18} />}
              onPress={() => handlePick('gallery')}
            />
          </View>
        </View>
      ) : (
        <View>
          <Image
            source={{ uri: image.uri }}
            style={{ width: '100%', height: 220, borderRadius: radius.md, backgroundColor: c.border }}
            resizeMode="contain"
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Başka Görsel"
                variant="secondary"
                disabled={scanMutation.isPending}
                onPress={() => {
                  setImage(null);
                  setResult(null);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={scanMutation.isPending ? 'Taranıyor...' : 'Tara'}
                icon={<ScanText color="#FFFFFF" size={18} />}
                loading={scanMutation.isPending}
                onPress={() => scanMutation.mutate(image)}
              />
            </View>
          </View>
        </View>
      )}

      {error ? <Text style={{ fontSize: 13, color: c.danger, marginTop: spacing.sm }}>{error}</Text> : null}

      {result && (
        <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
          {!result.detected_text ? (
            <Card>
              <Text style={{ fontSize: 13, color: c.textSecondary, textAlign: 'center' }}>
                Bu görselde okunabilir bir metin bulamadım — daha net bir fotoğrafla tekrar dener misin?
              </Text>
            </Card>
          ) : (
            <>
              <Card>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: spacing.xs }}>
                  ALGILANAN METİN{result.detected_lang ? ` (${result.detected_lang.toUpperCase()})` : ''}
                </Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.text }}>{result.detected_text}</Text>
              </Card>

              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs }}>
                  <Languages color={c.textMuted} size={13} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted }}>ÇEVİRİ</Text>
                </View>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.text }}>{result.translation}</Text>
              </Card>

              {result.words.length > 0 && (
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary }}>
                    Metindeki Kelimeler ({result.words.length})
                  </Text>
                  {result.words.map((w) => (
                    <WordRow key={w.word} item={w} />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </ScreenContainer>
  );
}
