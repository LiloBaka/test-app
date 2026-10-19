import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchMatches } from '../api/matches';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';
import type { Match, MatchStatus, MatchesResponse } from '../types/matches';

type Filter = 'all' | 'scheduled' | 'finished';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'scheduled', label: 'Предстоящие' },
  { value: 'finished', label: 'Завершённые' },
];

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function getStatus(status: MatchStatus) {
  switch (status) {
    case 'scheduled':
      return { label: 'Предстоящий', color: '#1d4ed8', backgroundColor: '#eff6ff' };
    case 'finished':
      return { label: 'Завершён', color: '#475569', backgroundColor: '#f1f5f9' };
    case 'live':
      return { label: 'Идёт матч', color: '#047857', backgroundColor: '#ecfdf5' };
    case 'postponed':
      return { label: 'Перенесён', color: '#92400e', backgroundColor: '#fffbeb' };
    default:
      return { label: 'Статус уточняется', color: '#475569', backgroundColor: '#f1f5f9' };
  }
}

type MatchCardProps = { match: Match; favorite: boolean; onToggle: () => void };

function MatchCard({ match, favorite, onToggle }: MatchCardProps) {
  const status = getStatus(match.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: status.backgroundColor }]}>
          <Text style={[styles.status, { color: status.color }]}>
            {status.label}
            {match.status === 'live' && match.minute != null ? ` · ${match.minute}′` : ''}
          </Text>
        </View>
        <FavoriteButton active={favorite} onPress={onToggle} />
      </View>
      <View style={styles.teams}>
        <View style={styles.team}>
          <Text style={styles.teamName}>{match.home.name}</Text>
          <Text style={styles.city}>{match.home.city}</Text>
        </View>
        <Text style={styles.score}>
          {match.score === null ? '—' : `${match.score.home}:${match.score.away}`}
        </Text>
        <View style={[styles.team, styles.awayTeam]}>
          <Text style={[styles.teamName, styles.alignRight]}>{match.away.name}</Text>
          <Text style={[styles.city, styles.alignRight]}>{match.away.city}</Text>
        </View>
      </View>
      <Text style={styles.date}>
        {match.startsAt === null ? 'Дата уточняется' : dateFormatter.format(new Date(match.startsAt))}
      </Text>
    </View>
  );
}

export function MatchesScreen() {
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const request = useRef<AbortController | null>(null);
  const { favorites, isFavorite, toggle } = useFavorites();

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMatches(controller.signal);
      if (controller.signal.aborted) return;
      setData(result);
      setUpdatedAt(new Date());
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof TypeError
          ? 'Не удалось связаться с сервером. Проверьте подключение к интернету.'
          : cause instanceof Error ? cause.message : 'Не удалось загрузить матчи. Попробуйте ещё раз.',
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => request.current?.abort();
  }, [load]);

  const matches = data?.matches ?? [];
  const visibleMatches = matches.filter((match) => filter === 'all' || match.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>ФУТБОЛ{data ? ` · ТУР ${data.round}` : ''}</Text>
            <Text style={styles.title} accessibilityRole="header">Матчи тура</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
            disabled={loading}
            onPress={() => void load()}
            style={({ pressed }) => [styles.refreshButton, (loading || pressed) && styles.dimmed]}
          >
            <Text style={styles.refreshText}>Обновить</Text>
          </Pressable>
        </View>
        <View style={styles.updateRow}>
          {loading && data !== null ? (
            <View style={styles.updating}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.secondary}>Обновляем…</Text>
            </View>
          ) : null}
          {updatedAt ? <UpdatedAgo since={updatedAt} /> : null}
        </View>
        <View style={styles.filters}>
          {filters.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === item.value }}
              onPress={() => setFilter(item.value)}
              style={({ pressed }) => [styles.filter, filter === item.value && styles.selectedFilter, pressed && styles.dimmed]}
            >
              <Text style={[styles.filterText, filter === item.value && styles.selectedFilterText]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>{error}</Text>
            {data !== null ? <Text style={styles.secondary}>Показаны ранее загруженные данные.</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void load()}
              style={({ pressed }) => [styles.retryButton, pressed && styles.dimmed]}
            >
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          </View>
        ) : null}
        {loading && data === null ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.emptyTitle}>Загружаем матчи…</Text>
          </View>
        ) : data !== null ? (
          <FlatList
            style={styles.list}
            contentContainerStyle={visibleMatches.length === 0 ? styles.emptyList : styles.listContent}
            data={visibleMatches}
            extraData={favorites}
            keyExtractor={(match) => match.id}
            renderItem={({ item }) => (
              <MatchCard match={item} favorite={isFavorite(item.id)} onToggle={() => toggle(item.id)} />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  {matches.length === 0 ? 'Матчей пока нет' : 'Нет матчей по выбранному фильтру'}
                </Text>
                <Text style={styles.emptyDescription}>
                  {matches.length === 0 ? 'Попробуйте обновить список позже.' : 'Выберите другой фильтр, чтобы увидеть остальные матчи.'}
                </Text>
              </View>
            }
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb' },
  content: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 24 },
  heading: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1.5, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  refreshButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe3ee', borderRadius: 12, padding: 12 },
  refreshText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },
  dimmed: { opacity: 0.55 },
  updateRow: { minHeight: 34, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 8 },
  updating: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secondary: { fontSize: 13, color: '#64748b' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8, paddingBottom: 20 },
  filter: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: '#e9eef5' },
  selectedFilter: { backgroundColor: '#1d4ed8' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  selectedFilterText: { color: '#fff' },
  list: { flex: 1 },
  listContent: { paddingBottom: 24, gap: 12 },
  emptyList: { flexGrow: 1 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  status: { fontSize: 12, fontWeight: '600' },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  team: { flex: 1, minWidth: 0 },
  awayTeam: { alignItems: 'flex-end' },
  teamName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  alignRight: { textAlign: 'right' },
  city: { fontSize: 12, color: '#64748b', marginTop: 5 },
  score: { minWidth: 52, textAlign: 'center', fontSize: 26, fontWeight: '800', color: '#0f172a', fontVariant: ['tabular-nums'] },
  date: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', fontSize: 12, color: '#64748b' },
  errorBox: { backgroundColor: '#fff1f2', borderRadius: 12, padding: 16, gap: 10, marginBottom: 16 },
  errorText: { color: '#9f1239', fontSize: 14, lineHeight: 21 },
  retryButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, backgroundColor: '#9f1239' },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#334155', textAlign: 'center' },
  emptyDescription: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
});
