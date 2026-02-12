import type { MatchState, TeamId, MatchMode } from '../types';
import { getMatchEffectiveDate, getTeamRefKey } from '../utils/matchIdentity';

export interface BaseStats {
    matchesPlayed: number;
    wins: number;
    losses: number;
    pointsFor: number;
    pointsAgainst: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
    recentForm: ('W' | 'L')[];
}

export interface PlayerStats extends BaseStats {
    playerId: string;
}

export interface GroupStats extends BaseStats {
    groupId: string; // sorted player IDs joined by '-'
    playerIds: string[];
    name: string;
}

export interface HeadToHeadStats {
    totalMatches: number;
    sideAWins: number; // sideA is the first player/group in the comparison
    sideBWins: number;
    recentMatches: MatchState[];
}

const toPlayerId = (player: unknown): string => {
    if (typeof player === 'string') return player;
    if (player && typeof player === 'object' && 'id' in player) {
        const value = (player as { id?: unknown }).id;
        return typeof value === 'string' ? value : '';
    }
    return '';
};

export const calculatePlayerStats = (playerId: string, matches: MatchState[], mode?: MatchMode): PlayerStats => {
    const relevantMatches = matches.filter(m => {
        const hasMode = mode ? m.mode === mode : true;
        const hasPlayer = m.teams.nosotros.players.some(p => toPlayerId(p) === playerId) ||
            m.teams.ellos.players.some(p => toPlayerId(p) === playerId);
        return hasMode && hasPlayer;
    });

    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    const recentForm: ('W' | 'L')[] = [];

    // Assuming matches are sorted by date desc, we reverse to calculate streaks
    const sortedMatches = [...relevantMatches].sort((a, b) => getMatchEffectiveDate(a) - getMatchEffectiveDate(b));

    sortedMatches.forEach(m => {
        const teamId = m.teams.nosotros.players.some(p => toPlayerId(p) === playerId) ? 'nosotros' : 'ellos';
        const opponentId: TeamId = teamId === 'nosotros' ? 'ellos' : 'nosotros';

        const isWin = m.winner === teamId;
        const pFor = m.teams[teamId].score;
        const pAgainst = m.teams[opponentId].score;

        pointsFor += pFor;
        pointsAgainst += pAgainst;

        if (isWin) {
            wins++;
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
            recentForm.push('W');
        } else {
            losses++;
            currentStreak = 0;
            recentForm.push('L');
        }
    });

    return {
        playerId,
        matchesPlayed: relevantMatches.length,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        winRate: relevantMatches.length > 0 ? (wins / relevantMatches.length) * 100 : 0,
        currentStreak,
        bestStreak,
        recentForm: recentForm.slice(-5).reverse(), // Last 5, most recent first
    };
};

export const getGroupId = (playerIds: string[]) => {
    return [...playerIds].sort().join('-');
};

export const calculateGroupStats = (playerIds: string[], matches: MatchState[], mode?: MatchMode): GroupStats => {
    const groupId = getGroupId(playerIds);
    const relevantMatches = matches.filter(m => {
        const hasMode = mode ? m.mode === mode : true;
        const nosIds = m.teams.nosotros.players.map(toPlayerId);
        const ellIds = m.teams.ellos.players.map(toPlayerId);
        const hasGroup = getGroupId(nosIds) === groupId || getGroupId(ellIds) === groupId;
        return hasMode && hasGroup;
    });

    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    const recentForm: ('W' | 'L')[] = [];

    const sortedMatches = [...relevantMatches].sort((a, b) => getMatchEffectiveDate(a) - getMatchEffectiveDate(b));

    sortedMatches.forEach(m => {
        const nosIds = m.teams.nosotros.players.map(toPlayerId);
        const teamId: TeamId = getGroupId(nosIds) === groupId ? 'nosotros' : 'ellos';
        const opponentId: TeamId = teamId === 'nosotros' ? 'ellos' : 'nosotros';

        const isWin = m.winner === teamId;
        pointsFor += m.teams[teamId].score;
        pointsAgainst += m.teams[opponentId].score;

        if (isWin) {
            wins++;
            currentStreak++;
            bestStreak = Math.max(bestStreak, currentStreak);
            recentForm.push('W');
        } else {
            losses++;
            currentStreak = 0;
            recentForm.push('L');
        }
    });

    return {
        groupId,
        playerIds,
        name: '', // Should be filled by lookups if needed
        matchesPlayed: relevantMatches.length,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
        winRate: relevantMatches.length > 0 ? (wins / relevantMatches.length) * 100 : 0,
        currentStreak,
        bestStreak,
        recentForm: recentForm.slice(-5).reverse(),
    };
};

export const calculateHeadToHead = (sideAIds: string[], sideBIds: string[], matches: MatchState[]): HeadToHeadStats => {
    const idA = `team:${getGroupId(sideAIds).replace(/-/g, '|')}`;
    const idB = `team:${getGroupId(sideBIds).replace(/-/g, '|')}`;
    const teamGroupKey = (m: MatchState, team: TeamId) => `team:${getGroupId(m.teams[team].players.map(toPlayerId)).replace(/-/g, '|')}`;

    const h2hMatches = matches.filter(m => {
        const nosKey = getTeamRefKey(m, 'nosotros');
        const ellKey = getTeamRefKey(m, 'ellos');
        const nosGroup = teamGroupKey(m, 'nosotros');
        const ellGroup = teamGroupKey(m, 'ellos');
        return (
            (nosKey === idA && ellKey === idB) ||
            (nosKey === idB && ellKey === idA) ||
            (nosGroup === idA && ellGroup === idB) ||
            (nosGroup === idB && ellGroup === idA)
        );
    });

    let sideAWins = 0;
    let sideBWins = 0;

    h2hMatches.forEach(m => {
        const nosKey = getTeamRefKey(m, 'nosotros');
        const ellKey = getTeamRefKey(m, 'ellos');
        const nosGroup = teamGroupKey(m, 'nosotros');
        const ellGroup = teamGroupKey(m, 'ellos');
        const teamAId: TeamId | null =
            nosKey === idA || nosGroup === idA ? 'nosotros' : (ellKey === idA || ellGroup === idA ? 'ellos' : null);
        const teamBId: TeamId | null =
            nosKey === idB || nosGroup === idB ? 'nosotros' : (ellKey === idB || ellGroup === idB ? 'ellos' : null);

        if (teamAId && teamBId) {
            if (m.winner === teamAId) sideAWins++;
            else if (m.winner === teamBId) sideBWins++;
        }
    });

    return {
        totalMatches: h2hMatches.length,
        sideAWins,
        sideBWins,
        recentMatches: [...h2hMatches]
            .sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a))
            .slice(0, 5) // Most recent first
    };
};
