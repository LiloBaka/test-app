import type { Match, MatchStatus, Score } from '../types/matches';

export type MatchFilter = 'all' | 'scheduled' | 'finished';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export function filterMatches(matches: Match[], filter: MatchFilter): Match[] {
  // Статус берётся из API: дата сама по себе не означает завершение матча.
  return matches.filter((match) => filter === 'all' || match.status === filter);
}

export function formatScore(score: Score | null): string {
  return score === null ? '—' : `${score.home}:${score.away}`;
}

export function formatMatchDate(startsAt: string | null): string {
  if (startsAt === null) return 'Дата уточняется';
  const date = new Date(startsAt);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : 'Дата уточняется';
}

export function getMatchStatus(status: MatchStatus, minute?: number | null) {
  switch (status) {
    case 'scheduled':
      return { label: 'Предстоящий', color: '#1d4ed8', backgroundColor: '#eff6ff' };
    case 'finished':
      return { label: 'Завершён', color: '#475569', backgroundColor: '#f1f5f9' };
    case 'live':
      return {
        label: `Идёт матч${minute != null ? ` · ${minute}′` : ''}`,
        color: '#047857',
        backgroundColor: '#ecfdf5',
      };
    case 'postponed':
      return { label: 'Перенесён', color: '#92400e', backgroundColor: '#fffbeb' };
    default:
      return { label: 'Статус уточняется', color: '#475569', backgroundColor: '#f1f5f9' };
  }
}
