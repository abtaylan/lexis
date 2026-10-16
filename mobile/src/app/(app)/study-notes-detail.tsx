// src/app/(app)/study-notes-detail.tsx — "Çalışma Notlarım" gün detayı (16
// Ekim 2026 kullanıcı isteği -- mobil karşılığı). Web'deki
// app/(app)/study-notes/[date]/page.tsx ile aynı davranış: Gemini/NotebookLM
// için o günün konusuna göre hazırlanmış talimat metinlerini gösterir
// ("...'yi Aç" butonu ilgili siteyi tarayıcıda açar + metni ortaya çıkarır),
// kullanıcı o metni kopyalayıp ilgili uygulamada/sitede yapıştırır, oradan
// aldığı özeti (ve/veya ekran görüntüsünü) de buraya geri yapıştırıp/
// yükleyip kaydeder. league-detail.tsx ile AYNI desen: bu projede expo-router
// dinamik [date].tsx segmenti kullanılmıyor, düz rota dosyası +
// useLocalSearchParams (bkz. router.push({ pathname: '/(app)/study-notes-detail', params: { date } })).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Copy, Check, ExternalLink, Save, Trash2, PenLine, ImagePlus, X } from 'lucide-react-native';
import { studyNotesApi, type PickedImage } from '@/api/studyNotes';
import type { StudyDayDetail, StudyNote, StudyNoteSource } from '@/api/types';
import { getErrorMessage } from '@/utils/errors';
import { buildGeminiPrompt, buildNotebookLMPrompt } from '@/lib/studyNotesPrompts';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';

function formatDateTr(dateIso: string): string {
  return new Date(dateIso + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });
}

const EXTERNAL_SOURCES: { key: 'gemini' | 'notebooklm'; label: string; url: string; accent: string; accentSoft: string }[] = [
  { key: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app', accent: '#1A73E8', accentSoft: '#E8F0FE' },
  { key: 'notebooklm', label: 'NotebookLM', url: 'https://notebooklm.google.com/', accent: '#8E24AA', accentSoft: '#F3E5F7' },
];

async function pickImages(): Promise<PickedImage[] | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    Alert.alert('İzin gerekli', 'Görsel seçebilmek için galeri erişim izni vermelisin.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName || `gorsel_${i + 1}.jpg`,
    type: a.mimeType || 'image/jpeg',
  }));
}

// Gemini/NotebookLM/manuel notların hepsinde kullanılan ortak görsel yükleme
// + küçük resim galerisi alanı. Web'in aksine burada "üzerine gelince çıkan
// çarpı" yok (dokunmatik ekranda hover kavramı yok) — silme ikonu her zaman
// görünür, küçük bir rozet olarak.
function ImagesField({
  images,
  onPick,
  onDelete,
  uploading,
}: {
  images: string[];
  onPick: () => void;
  onDelete: (url: string) => void;
  uploading: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={{ marginTop: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted, flex: 1 }}>
          Görseller (infografik, zihin haritası, ekran görüntüsü vb.):
        </Text>
        <Pressable
          onPress={onPick}
          disabled={uploading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            borderRadius: radius.md,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: c.border,
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? <ActivityIndicator size="small" color={c.textMuted} /> : <ImagePlus color={c.textMuted} size={14} />}
          <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted }}>
            {uploading ? 'Yükleniyor...' : 'Görsel Ekle'}
          </Text>
        </Pressable>
      </View>

      {images.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {images.map((url) => (
            <View key={url} style={{ width: 76, height: 76 }}>
              <Image
                source={{ uri: url }}
                style={{ width: 76, height: 76, borderRadius: radius.md, borderWidth: 1, borderColor: c.border }}
              />
              <Pressable
                onPress={() =>
                  Alert.alert('Görseli sil', '', [
                    { text: 'Vazgeç', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: () => onDelete(url) },
                  ])
                }
                disabled={uploading}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: c.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X color="#FFFFFF" size={12} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function SourcePanel({
  label,
  url,
  accent,
  accentSoft,
  promptText,
  existingNote,
  onSave,
  onDelete,
  saving,
  onPickImages,
  onDeleteImage,
  uploadingImages,
}: {
  label: string;
  url: string;
  accent: string;
  accentSoft: string;
  promptText: string;
  existingNote?: StudyNote;
  onSave: (content: string) => void;
  onDelete: () => void;
  saving: boolean;
  onPickImages: () => void;
  onDeleteImage: (url: string) => void;
  uploadingImages: boolean;
}) {
  const c = useThemeColors();
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState(existingNote?.content || '');

  useEffect(() => {
    setContent(existingNote?.content || '');
  }, [existingNote?.content]);

  async function openAndReveal() {
    setShowPrompt(true);
    try {
      await Linking.openURL(url);
    } catch {
      // Açılamazsa sessizce geç -- kullanıcı yine de promptu görüp manuel açabilir.
    }
  }

  async function copyPrompt() {
    try {
      await Clipboard.setStringAsync(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Panoya erişilemezse sessizce geç.
    }
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap', marginBottom: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>{label}</Text>
          {existingNote && (
            <View style={{ backgroundColor: accentSoft, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: accent }}>Kaydedildi</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={openAndReveal}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: accent, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{label}&apos;yi Aç</Text>
          <ExternalLink color="#FFFFFF" size={13} />
        </Pressable>
      </View>

      {showPrompt && (
        <View style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted, flex: 1 }}>
              Bu metni kopyalayıp {label}&apos;de yapıştır:
            </Text>
            <Pressable onPress={copyPrompt} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {copied ? <Check color="#0F6E56" size={14} /> : <Copy color={c.textMuted} size={14} />}
              <Text style={{ fontSize: 12, fontWeight: '600', color: copied ? '#0F6E56' : c.textMuted }}>
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </Text>
            </Pressable>
          </View>
          <TextField
            value={promptText}
            editable={false}
            multiline
            numberOfLines={6}
            style={{ fontSize: 11, fontFamily: 'monospace', backgroundColor: c.background }}
          />
        </View>
      )}

      <Text style={{ fontSize: 12, fontWeight: '600', color: c.textMuted, marginBottom: 6 }}>
        {label}&apos;den aldığın özeti buraya yapıştır:
      </Text>
      <TextField
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={5}
        placeholder={`${label}'den kopyaladığın özeti buraya yapıştır...`}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: -spacing.sm }}>
        <Pressable
          onPress={() => onSave(content)}
          disabled={saving || !content.trim()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: accent,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm,
            paddingVertical: 7,
            opacity: saving || !content.trim() ? 0.5 : 1,
          }}
        >
          <Save color="#FFFFFF" size={13} />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Kaydet</Text>
        </Pressable>
        {existingNote && (
          <Pressable
            onPress={() =>
              Alert.alert('Notu sil', '', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: onDelete },
              ])
            }
            disabled={saving}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 7 }}
          >
            <Trash2 color={c.danger} size={13} />
            <Text style={{ color: c.danger, fontSize: 12, fontWeight: '700' }}>Sil</Text>
          </Pressable>
        )}
      </View>

      <ImagesField
        images={existingNote?.image_urls || []}
        onPick={onPickImages}
        onDelete={onDeleteImage}
        uploading={uploadingImages}
      />
    </Card>
  );
}

function ManualNoteBox({
  existingNote,
  onSave,
  onDelete,
  saving,
  onPickImages,
  onDeleteImage,
  uploadingImages,
}: {
  existingNote?: StudyNote;
  onSave: (content: string) => void;
  onDelete: () => void;
  saving: boolean;
  onPickImages: () => void;
  onDeleteImage: (url: string) => void;
  uploadingImages: boolean;
}) {
  const c = useThemeColors();
  const [content, setContent] = useState(existingNote?.content || '');

  useEffect(() => {
    setContent(existingNote?.content || '');
  }, [existingNote?.content]);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm }}>
        <PenLine color={c.textMuted} size={15} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>Kendi Notların</Text>
      </View>
      <TextField
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={5}
        placeholder="Bugün çalıştığın konuyla ilgili kendi notlarını yaz..."
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: -spacing.sm }}>
        <Pressable
          onPress={() => onSave(content)}
          disabled={saving || !content.trim()}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: c.text,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm,
            paddingVertical: 7,
            opacity: saving || !content.trim() ? 0.5 : 1,
          }}
        >
          <Save color={c.background} size={13} />
          <Text style={{ color: c.background, fontSize: 12, fontWeight: '700' }}>Kaydet</Text>
        </Pressable>
        {existingNote && (
          <Pressable
            onPress={() =>
              Alert.alert('Notu sil', '', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: onDelete },
              ])
            }
            disabled={saving}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 7 }}
          >
            <Trash2 color={c.danger} size={13} />
            <Text style={{ color: c.danger, fontSize: 12, fontWeight: '700' }}>Sil</Text>
          </Pressable>
        )}
      </View>

      <ImagesField
        images={existingNote?.image_urls || []}
        onPick={onPickImages}
        onDelete={onDeleteImage}
        uploading={uploadingImages}
      />
    </Card>
  );
}

export default function StudyNoteDetailScreen() {
  const { date: dateParam } = useLocalSearchParams<{ date: string }>();
  const date = typeof dateParam === 'string' ? dateParam : '';
  const c = useThemeColors();

  const [detail, setDetail] = useState<StudyDayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingSource, setSavingSource] = useState<StudyNoteSource | null>(null);
  const [uploadingSource, setUploadingSource] = useState<StudyNoteSource | null>(null);

  useEffect(() => {
    if (!date) return;
    studyNotesApi
      .getDay(date)
      .then(setDetail)
      .catch((e) => setError(getErrorMessage(e, 'Gün bilgisi yüklenemedi.')))
      .finally(() => setLoading(false));
  }, [date]);

  async function handleSave(source: StudyNoteSource, content: string) {
    if (!content.trim()) return;
    setSavingSource(source);
    setError('');
    try {
      const saved = await studyNotesApi.saveNote(date, source, content, detail?.topic_title ?? undefined);
      setDetail((prev) => {
        if (!prev) return prev;
        const notes = prev.notes.filter((n) => n.source !== source);
        return { ...prev, notes: [...notes, saved] };
      });
    } catch (e) {
      setError(getErrorMessage(e, 'Not kaydedilemedi.'));
    } finally {
      setSavingSource(null);
    }
  }

  async function handleDelete(source: StudyNoteSource) {
    setSavingSource(source);
    setError('');
    try {
      await studyNotesApi.deleteNote(date, source);
      setDetail((prev) => (prev ? { ...prev, notes: prev.notes.filter((n) => n.source !== source) } : prev));
    } catch (e) {
      setError(getErrorMessage(e, 'Not silinemedi.'));
    } finally {
      setSavingSource(null);
    }
  }

  async function handlePickImages(source: StudyNoteSource) {
    const images = await pickImages();
    if (!images || images.length === 0) return;
    setUploadingSource(source);
    setError('');
    try {
      const saved = await studyNotesApi.uploadImages(date, source, images);
      setDetail((prev) => {
        if (!prev) return prev;
        const notes = prev.notes.filter((n) => n.source !== source);
        return { ...prev, notes: [...notes, saved] };
      });
    } catch (e) {
      setError(getErrorMessage(e, 'Görsel yüklenemedi.'));
    } finally {
      setUploadingSource(null);
    }
  }

  async function handleDeleteImage(source: StudyNoteSource, imageUrl: string) {
    setUploadingSource(source);
    setError('');
    try {
      await studyNotesApi.deleteImage(date, source, imageUrl);
      setDetail((prev) => {
        if (!prev) return prev;
        const notes = prev.notes.map((n) =>
          n.source === source ? { ...n, image_urls: n.image_urls.filter((u) => u !== imageUrl) } : n
        );
        return { ...prev, notes };
      });
    } catch (e) {
      setError(getErrorMessage(e, 'Görsel silinemedi.'));
    } finally {
      setUploadingSource(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <ScreenNavBar />
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!detail) {
    return (
      <ScreenContainer>
        <ScreenNavBar />
        <Text style={{ color: c.danger, fontSize: 13 }}>{error || 'Gün bulunamadı.'}</Text>
      </ScreenContainer>
    );
  }

  const { topic_title: topicTitle, activities } = detail;
  const noteBySource = Object.fromEntries(detail.notes.map((n) => [n.source, n])) as Partial<Record<StudyNoteSource, StudyNote>>;

  return (
    <ScreenContainer>
      <ScreenNavBar />

      <Pressable onPress={() => router.push('/(app)/study-notes')} style={{ marginBottom: spacing.sm }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.textMuted }}>← Çalışma Notlarım</Text>
      </Pressable>
      <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{formatDateTr(date)}</Text>
      <Text style={{ fontSize: 13, color: c.textSecondary, marginTop: 2 }}>
        {topicTitle || activities[0] || 'Genel Çalışma Programı'}
      </Text>
      {activities.length > 1 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs }}>
          {activities.map((a) => (
            <View key={a} style={{ backgroundColor: c.background, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, color: c.textMuted }}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      {!!error && <Text style={{ color: c.danger, fontSize: 12, marginTop: spacing.sm }}>{error}</Text>}

      <View style={{ marginTop: spacing.lg }}>
        {EXTERNAL_SOURCES.map((s) => (
          <SourcePanel
            key={s.key}
            label={s.label}
            url={s.url}
            accent={s.accent}
            accentSoft={s.accentSoft}
            promptText={s.key === 'gemini' ? buildGeminiPrompt(date, topicTitle, activities) : buildNotebookLMPrompt(date, topicTitle, activities)}
            existingNote={noteBySource[s.key]}
            onSave={(content) => handleSave(s.key, content)}
            onDelete={() => handleDelete(s.key)}
            saving={savingSource === s.key}
            onPickImages={() => handlePickImages(s.key)}
            onDeleteImage={(url) => handleDeleteImage(s.key, url)}
            uploadingImages={uploadingSource === s.key}
          />
        ))}

        <ManualNoteBox
          existingNote={noteBySource.manual}
          onSave={(content) => handleSave('manual', content)}
          onDelete={() => handleDelete('manual')}
          saving={savingSource === 'manual'}
          onPickImages={() => handlePickImages('manual')}
          onDeleteImage={(url) => handleDeleteImage('manual', url)}
          uploadingImages={uploadingSource === 'manual'}
        />
      </View>
    </ScreenContainer>
  );
}
