export type MatchStatus = 'scheduled' | 'finished' | 'live' | 'postponed' | (string & {});

export type Team = {
  id: string;
  name: string;
  city: string;
};

export type Score = {
  home: number;
  away: number;
};

export type Match = {
  id: string;
  startsAt: string | null;
  status: MatchStatus;
  home: Team;
  away: Team;
  score: Score | null;
  minute?: number | null;
};

export type MatchesResponse = {
  round: number;
  matches: Match[];
};
