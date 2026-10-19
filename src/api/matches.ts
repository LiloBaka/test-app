import { MATCHES_URL } from '../config';
import type { Match, MatchesResponse, Team } from '../types/matches';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isTeam(value: unknown): value is Team {
  return isRecord(value) && isText(value.id) && isText(value.name) && isText(value.city);
}

function isMatch(value: unknown): value is Match {
  if (!isRecord(value)) return false;
  return (
    isText(value.id) && isText(value.status) && isTeam(value.home) && isTeam(value.away) &&
    (value.startsAt === null ||
      (isText(value.startsAt) && Number.isFinite(Date.parse(value.startsAt)))) &&
    (value.score === null ||
      (isRecord(value.score) && isNonNegativeInteger(value.score.home) && isNonNegativeInteger(value.score.away))) &&
    (value.minute === undefined || value.minute === null || isNonNegativeInteger(value.minute))
  );
}

export function parseMatchesResponse(value: unknown): MatchesResponse {
  if (
    !isRecord(value) || !isNonNegativeInteger(value.round) ||
    !Array.isArray(value.matches) || !value.matches.every(isMatch)
  ) {
    throw new Error('Сервер вернул данные матчей в неверном формате.');
  }
  const ids = new Set(value.matches.map((match) => match.id));
  if (ids.size !== value.matches.length) {
    throw new Error('Сервер вернул матчи с повторяющимися ID.');
  }
  return { round: value.round, matches: value.matches };
}

export async function fetchMatches(signal: AbortSignal): Promise<MatchesResponse> {
  const response = await fetch(MATCHES_URL, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Не удалось загрузить матчи (HTTP ${response.status}).`);
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Сервер вернул некорректный JSON.');
  }
  return parseMatchesResponse(value);
}
