import type { MatchState, TeamId, MatchTeamRef } from '../types';

const normalizeIds = (ids: string[]): string[] => ids.filter(Boolean).slice().sort();

export const getMatchEffectiveDate = (match: MatchState): number => {
    const metaDate = match.metadata?.date;
    if (typeof metaDate === 'number' && Number.isFinite(metaDate)) return metaDate;
    const customDate = match.metadata?.customDate;
    if (typeof customDate === 'number' && Number.isFinite(customDate)) return customDate;
    return match.startDate;
};

export const buildTeamRef = (match: MatchState, team: TeamId): MatchTeamRef => {
    const players = normalizeIds(match.teams[team].players ?? []);
    const pairId = match.pairs?.[team] ?? null;
    const key = pairId ? `pair:${pairId}` : `team:${players.join('|')}`;
    const label = match.teams[team].name || players.join(' + ') || 'Equipo';
    return {
        key,
        label,
        playerIds: players,
        pairId
    };
};

export const withNormalizedMatchIdentity = (match: MatchState): MatchState => {
    const normalizedDate = getMatchEffectiveDate(match);
    return {
        ...match,
        metadata: {
            ...(match.metadata ?? {}),
            date: normalizedDate
        },
        teamRefs: {
            nosotros: buildTeamRef(match, 'nosotros'),
            ellos: buildTeamRef(match, 'ellos')
        }
    };
};

export const getTeamRefKey = (match: MatchState, team: TeamId): string =>
    match.teamRefs?.[team]?.key ?? buildTeamRef(match, team).key;

export const getTeamRefLabel = (match: MatchState, team: TeamId): string =>
    match.teamRefs?.[team]?.label ?? match.teams[team].name;
