import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['words', search],
    queryFn: () => wordsApi.getAll({ search: search || undefined, per_page: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wordsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['words'] }),
  });

  return (
    <ScreenContainer scroll={false} padded={false}>
      <View style={styles.header}>
        <TextField
          placeholder={t('searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 0, flex: 1 }}
        />
      </View>

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.listContent}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListEmptyComponent={!isLoading ? <EmptyState title={t('noWordsFound')} subtitle={t('noWordsFoundSub')} /> : null}
        renderItem={({ item }) => (
          <WordRow
            word={item}
            onDelete={() => deleteMutation.mutate(item.id)}
            statusLabel={
              item.status === 'learned' ? t('statusLearned') : item.status === 'archived' ? t('statusArchived') : t('statusLearning')
            }
          />
        )}
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

function WordRow({ word, onDelete, statusLabel }: { word: Word; onDelete: () => void; statusLabel: string }) {
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
}

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
    try {
      const res = await dictionaryApi.lookup(word.trim(), learningLang, nativeLang);
      if (res.meanings.length > 0) {
        setMeaning(res.meanings[0].meaning_native || res.meanings[0].meaning_target);
        if (res.meanings[0].examples?.length) setExample(res.meanings[0].examples[0]);
      }
    } catch {
      /* sessiz — kullanıcı elle girebilir */
    } finally {
      setLooking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>{t('addWordModalTitle')}</Text>

          <TextField label={t('wordRequiredLabel')} value={word} onChangeText={setWord} autoCapitalize="none" />
          <Button title={t('searchBtn')} variant="secondary" onPress={handleLookup} loading={looking} fullWidth={false} />

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
        </View>
      </View>
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
  modalCard: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
