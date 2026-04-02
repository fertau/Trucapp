import type { MatchState, TeamId, Player, HandRecord } from '../types';
import { getMatchEffectiveDate, getTeamIdForUser, getTeamRefLabel } from '../utils/matchIdentity';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RivalryProfile {
    key: string;
    mode: MatchState['mode'];
    label: string;

    // Match-level stats
    matchCount: number;
    matchWins: number;
    matchLosses: number;
    matchWinRate: number;

    // Series-level stats
    seriesWins: number;
    seriesLosses: number;
    seriesTotal: number;
    seriesForm: Array<'G' | 'P'>;

    // Current streak
    streak: { type: 'W' | 'L' | 'none'; count: number };

    // Pica-pica 1v1 records (from handRecords)
    picaPicaH2H: PicaPicaH2HRecord[];

    // Last played timestamp
    lastPlayedAt: number;
}

export interface PicaPicaH2HRecord {
    playerNosotrosId: string;
    playerEllosId: string;
    winsNosotros: number;
    winsEllos: number;
    totalHands: number;
}

export interface RivalryDelta {
    before: { matchWins: number; matchLosses: number; seriesWins: number; seriesLosses: number };
    after: { matchWins: number; matchLosses: number; seriesWins: number; seriesLosses: number };
    isFirstMeeting: boolean;
    headline: string;
}

export interface LeaderboardEntry {
    playerId: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
}

// ─────────────────────────────────────────────────────────────
// Headline templates (trash-talk one-liners from data)
// ─────────────────────────────────────────────────────────────

function generateHeadline(delta: Omit<RivalryDelta, 'headline'>): string {
    if (delta.isFirstMeeting) {
        return 'PRIMER CLASICO';
    }

    const { before, after } = delta;
    const seriesDiff = after.seriesWins - after.seriesLosses;
    const matchDiff = after.matchWins - after.matchLosses;

    // Series milestones
    if (after.seriesWins > before.seriesWins && seriesDiff > 0) {
        if (after.seriesWins === after.seriesLosses + 1) {
            return 'SE PUSO EN VENTAJA';
        }
        if (seriesDiff >= 3) {
            return `DOMINIO TOTAL: ${after.seriesWins}-${after.seriesLosses}`;
        }
        return `SERIE GANADA: ${after.seriesWins}-${after.seriesLosses}`;
    }

    if (after.seriesLosses > before.seriesLosses) {
        if (after.seriesWins === after.seriesLosses) {
            return 'EMPATE EN SERIES';
        }
        return `RECORTARON: ${after.seriesWins}-${after.seriesLosses}`;
    }

    // Match milestones
    if (matchDiff > 0 && after.matchWins > before.matchWins) {
        if (after.matchWins % 10 === 0) {
            return `${after.matchWins} VICTORIAS Y CONTANDO`;
        }
        return `VICTORIA #${after.matchWins}`;
    }

    if (after.matchLosses > before.matchLosses) {
        return `DERROTA #${after.matchLosses}`;
    }

    return `${after.matchWins}-${after.matchLosses} en partidos`;
}

// ─────────────────────────────────────────────────────────────
// Core: rivalry bucketing (extracted from HomeScreen)
// ─────────────────────────────────────────────────────────────

interface RivalryBucket {
    key: string;
    mode: MatchState['mode'];
    label: string;
    count: number;
    wins: number;
    losses: number;
    lastPlayedAt: number;
    matchResults: Array<'G' | 'P'>;
    seriesById: Record<string, { wins: number; losses: number; lastAt: number }>;
    handRecordsByMatch: HandRecord[][];
}

function buildRivalryBuckets(
    matches: MatchState[],
    currentUserId: string,
    players: Player[]
): Map<string, RivalryBucket> {
    const playersKey = (ids: string[]) => [...ids].sort().join('|');
    const buckets = new Map<string, RivalryBucket>();

    const mine = matches
        .filter((m) => m.isFinished && (m.teams.nosotros.score + m.teams.ellos.score > 0))
        .filter((m) => getTeamIdForUser(m, currentUserId) !== null);

    const sorted = [...mine].sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a));

    sorted.forEach((m) => {
        const mySide = getTeamIdForUser(m, currentUserId);
        if (!mySide) return;
        const oppSide: TeamId = mySide === 'nosotros' ? 'ellos' : 'nosotros';
        const myPlayersKey = playersKey(m.teams[mySide].players);
        const oppPlayersKey = playersKey(m.teams[oppSide].players);
        const key = `${m.mode}:${myPlayersKey}:${oppPlayersKey}`;

        const label = m.mode === '1v1'
            ? `1v1 vs ${m.teams[oppSide].players.map((id) => players.find((p) => p.id === id)?.name ?? id).join(' / ')}`
            : `${m.mode} · ${getTeamRefLabel(m, mySide)} vs ${getTeamRefLabel(m, oppSide)}`;

        const prev = buckets.get(key) ?? {
            key,
            mode: m.mode,
            label,
            count: 0,
            wins: 0,
            losses: 0,
            lastPlayedAt: 0,
            matchResults: [],
            seriesById: {},
            handRecordsByMatch: []
        };

        const result: 'G' | 'P' = m.winner === mySide ? 'G' : 'P';
        const seriesId = m.series?.id ?? `single:${m.id}`;
        const previousSeries = prev.seriesById[seriesId] ?? { wins: 0, losses: 0, lastAt: 0 };
        const nextSeries = {
            wins: previousSeries.wins + (result === 'G' ? 1 : 0),
            losses: previousSeries.losses + (result === 'P' ? 1 : 0),
            lastAt: Math.max(previousSeries.lastAt, getMatchEffectiveDate(m))
        };

        buckets.set(key, {
            key,
            mode: m.mode,
            label,
            count: prev.count + 1,
            wins: prev.wins + (result === 'G' ? 1 : 0),
            losses: prev.losses + (result === 'P' ? 1 : 0),
            lastPlayedAt: Math.max(prev.lastPlayedAt, getMatchEffectiveDate(m)),
            matchResults: [...prev.matchResults, result],
            seriesById: { ...prev.seriesById, [seriesId]: nextSeries },
            handRecordsByMatch: m.handRecords?.length
                ? [...prev.handRecordsByMatch, m.handRecords]
                : prev.handRecordsByMatch
        });
    });

    return buckets;
}

function bucketToProfile(bucket: RivalryBucket): RivalryProfile {
    // Compute series stats
    const seriesEntries = Object.values(bucket.seriesById).sort((a, b) => b.lastAt - a.lastAt);
    let seriesWins = 0;
    let seriesLosses = 0;
    const seriesForm: Array<'G' | 'P'> = [];

    seriesEntries.forEach((s) => {
        if (s.wins > s.losses) {
            seriesWins += 1;
            if (seriesForm.length < 10) seriesForm.push('G');
        } else if (s.losses > s.wins) {
            seriesLosses += 1;
            if (seriesForm.length < 10) seriesForm.push('P');
        }
    });

    // Compute streak from match results (most recent first)
    let streak: RivalryProfile['streak'] = { type: 'none', count: 0 };
    if (bucket.matchResults.length > 0) {
        const first = bucket.matchResults[0]; // most recent (array is sorted desc)
        let count = 0;
        for (const r of bucket.matchResults) {
            if (r === first) count++;
            else break;
        }
        streak = { type: first === 'G' ? 'W' : 'L', count };
    }

    // Compute pica-pica H2H from handRecords
    const picaPicaH2H = extractPicaPicaH2H(bucket.handRecordsByMatch);

    const matchWinRate = bucket.count > 0 ? bucket.wins / bucket.count : 0;

    return {
        key: bucket.key,
        mode: bucket.mode,
        label: bucket.label,
        matchCount: bucket.count,
        matchWins: bucket.wins,
        matchLosses: bucket.losses,
        matchWinRate,
        seriesWins,
        seriesLosses,
        seriesTotal: seriesWins + seriesLosses,
        seriesForm,
        streak,
        picaPicaH2H,
        lastPlayedAt: bucket.lastPlayedAt
    };
}

function extractPicaPicaH2H(handRecordsByMatch: HandRecord[][]): PicaPicaH2HRecord[] {
    const h2hMap = new Map<string, PicaPicaH2HRecord>();

    for (const matchHands of handRecordsByMatch) {
        for (const hand of matchHands) {
            if (hand.type !== 'picapica' || !hand.pairings) continue;
            for (const pairing of hand.pairings) {
                const key = `${pairing.playerNosotrosId}:${pairing.playerEllosId}`;
                const prev = h2hMap.get(key) ?? {
                    playerNosotrosId: pairing.playerNosotrosId,
                    playerEllosId: pairing.playerEllosId,
                    winsNosotros: 0,
                    winsEllos: 0,
                    totalHands: 0
                };

                prev.totalHands += 1;
                if (pairing.scoreNosotros > pairing.scoreEllos) {
                    prev.winsNosotros += 1;
                } else if (pairing.scoreEllos > pairing.scoreNosotros) {
                    prev.winsEllos += 1;
                }

                h2hMap.set(key, prev);
            }
        }
    }

    return Array.from(h2hMap.values());
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Get rivalry profile between two groups of players.
 * If playerIds are provided, filters to that specific rivalry.
 * Otherwise returns the top rivalry by series activity.
 */
export function getRivalryProfile(
    currentUserId: string,
    matches: MatchState[],
    players: Player[],
    rivalryKey?: string
): RivalryProfile | null {
    const buckets = buildRivalryBuckets(matches, currentUserId, players);

    if (rivalryKey) {
        const bucket = buckets.get(rivalryKey);
        return bucket ? bucketToProfile(bucket) : null;
    }

    // Return top rivalry (same logic as HomeScreen's activeRivalry)
    const ranked = Array.from(buckets.values())
        .map(bucketToProfile)
        .filter((x) => x.matchCount >= 3)
        .sort((a, b) => {
            const aSeriesLastAt = Object.values(
                buildRivalryBuckets(matches, currentUserId, players).get(a.key)?.seriesById ?? {}
            ).sort((x, y) => y.lastAt - x.lastAt)[0]?.lastAt ?? 0;
            const bSeriesLastAt = Object.values(
                buildRivalryBuckets(matches, currentUserId, players).get(b.key)?.seriesById ?? {}
            ).sort((x, y) => y.lastAt - x.lastAt)[0]?.lastAt ?? 0;
            return bSeriesLastAt - aSeriesLastAt ||
                b.seriesTotal - a.seriesTotal ||
                b.lastPlayedAt - a.lastPlayedAt;
        });

    return ranked[0] ?? null;
}

/**
 * Get all rivalry profiles for a user, sorted by activity.
 */
export function getAllRivalries(
    currentUserId: string,
    matches: MatchState[],
    players: Player[]
): RivalryProfile[] {
    const buckets = buildRivalryBuckets(matches, currentUserId, players);
    return Array.from(buckets.values())
        .map(bucketToProfile)
        .filter((x) => x.matchCount >= 1)
        .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

/**
 * Get the active rivalry (top rivalry with 3+ matches).
 * This replaces the inline useMemo in HomeScreen.
 */
export function getActiveRivalry(
    currentUserId: string,
    matches: MatchState[],
    players: Player[]
): RivalryProfile | null {
    return getRivalryProfile(currentUserId, matches, players);
}

/**
 * Compute what changed after a match (before/after rivalry delta).
 */
export function getPostMatchRivalryDelta(
    matchId: string,
    currentUserId: string,
    allMatches: MatchState[],
    players: Player[]
): RivalryDelta | null {
    const match = allMatches.find((m) => m.id === matchId);
    if (!match) return null;

    const mySide = getTeamIdForUser(match, currentUserId);
    if (!mySide) return null;

    // Build the rivalry key for this match
    const playersKey = (ids: string[]) => [...ids].sort().join('|');
    const oppSide: TeamId = mySide === 'nosotros' ? 'ellos' : 'nosotros';
    const myPlayersKey = playersKey(match.teams[mySide].players);
    const oppPlayersKey = playersKey(match.teams[oppSide].players);
    const key = `${match.mode}:${myPlayersKey}:${oppPlayersKey}`;

    // "After" = all matches including this one
    const afterMatches = allMatches;
    const afterBuckets = buildRivalryBuckets(afterMatches, currentUserId, players);
    const afterBucket = afterBuckets.get(key);
    if (!afterBucket) return null;
    const afterProfile = bucketToProfile(afterBucket);

    // "Before" = all matches excluding this one
    const beforeMatches = allMatches.filter((m) => m.id !== matchId);
    const beforeBuckets = buildRivalryBuckets(beforeMatches, currentUserId, players);
    const beforeBucket = beforeBuckets.get(key);

    const isFirstMeeting = !beforeBucket || beforeBucket.count === 0;

    const before = beforeBucket
        ? (() => {
            const p = bucketToProfile(beforeBucket);
            return { matchWins: p.matchWins, matchLosses: p.matchLosses, seriesWins: p.seriesWins, seriesLosses: p.seriesLosses };
        })()
        : { matchWins: 0, matchLosses: 0, seriesWins: 0, seriesLosses: 0 };

    const after = {
        matchWins: afterProfile.matchWins,
        matchLosses: afterProfile.matchLosses,
        seriesWins: afterProfile.seriesWins,
        seriesLosses: afterProfile.seriesLosses
    };

    const deltaWithoutHeadline = { before, after, isFirstMeeting };

    return {
        ...deltaWithoutHeadline,
        headline: generateHeadline(deltaWithoutHeadline)
    };
}

/**
 * Group leaderboard: win rate per player across all matches.
 */
export function getGroupLeaderboard(
    matches: MatchState[],
    _players?: Player[]
): LeaderboardEntry[] {
    const stats = new Map<string, { played: number; wins: number; losses: number }>();

    const finished = matches.filter(
        (m) => m.isFinished && (m.teams.nosotros.score + m.teams.ellos.score > 0)
    );

    for (const m of finished) {
        const allPlayerIds = [
            ...m.teams.nosotros.players,
            ...m.teams.ellos.players
        ];

        for (const pid of allPlayerIds) {
            const prev = stats.get(pid) ?? { played: 0, wins: 0, losses: 0 };
            const team = getTeamIdForUser(m, pid);
            if (!team) continue;
            const isWin = m.winner === team;
            stats.set(pid, {
                played: prev.played + 1,
                wins: prev.wins + (isWin ? 1 : 0),
                losses: prev.losses + (isWin ? 0 : 1)
            });
        }
    }

    return Array.from(stats.entries())
        .map(([playerId, s]) => ({
            playerId,
            matchesPlayed: s.played,
            wins: s.wins,
            losses: s.losses,
            winRate: s.played > 0 ? s.wins / s.played : 0
        }))
        .sort((a, b) => b.winRate - a.winRate || b.matchesPlayed - a.matchesPlayed);
}
