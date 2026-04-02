import { describe, it, expect } from 'vitest';
import {
    getRivalryProfile,
    getAllRivalries,
    getPostMatchRivalryDelta,
    getGroupLeaderboard,
} from '../rivalryService';
import type { MatchState, Player } from '../../types';

// ─── Test data helpers ───────────────────────────────────────

const players: Player[] = [
    { id: 'fer', name: 'Fernando', nickname: 'Fer' },
    { id: 'nico', name: 'Nicolás', nickname: 'Nico' },
    { id: 'mati', name: 'Matías', nickname: 'Mati' },
    { id: 'juli', name: 'Julián', nickname: 'Juli' },
] as Player[];

let matchCounter = 0;

function makeMatch(overrides: Partial<MatchState> & {
    nosPlayers?: string[];
    ellPlayers?: string[];
    nosScore?: number;
    ellScore?: number;
    matchWinner?: 'nosotros' | 'ellos';
    matchMode?: MatchState['mode'];
    matchDate?: number;
    seriesId?: string;
} = {}): MatchState {
    matchCounter++;
    const id = overrides.id ?? `match-${matchCounter}`;
    const nosPlayers = overrides.nosPlayers ?? ['fer', 'nico'];
    const ellPlayers = overrides.ellPlayers ?? ['mati', 'juli'];
    const nosScore = overrides.nosScore ?? 15;
    const ellScore = overrides.ellScore ?? 10;
    const winner = overrides.matchWinner ?? (nosScore > ellScore ? 'nosotros' : 'ellos');
    const mode = overrides.matchMode ?? '2v2';
    const date = overrides.matchDate ?? (1700000000000 + matchCounter * 100000);

    return {
        id,
        mode,
        startDate: date,
        targetScore: 15,
        isFinished: true,
        winner,
        teams: {
            nosotros: { id: 'nosotros', name: 'Nosotros', score: nosScore, players: nosPlayers },
            ellos: { id: 'ellos', name: 'Ellos', score: ellScore, players: ellPlayers },
        },
        history: [],
        metadata: { date },
        ...(overrides.seriesId ? { series: { id: overrides.seriesId, targetWins: 2 } } : {}),
    } as MatchState;
}

// ─── getRivalryProfile ──────────────────────────────────────

describe('getRivalryProfile', () => {
    it('returns null when no matches exist', () => {
        const result = getRivalryProfile('fer', [], players);
        expect(result).toBeNull();
    });

    it('returns null when fewer than 3 matches (for top rivalry)', () => {
        const matches = [
            makeMatch({ nosScore: 15, ellScore: 10 }),
            makeMatch({ nosScore: 15, ellScore: 8 }),
        ];
        const result = getRivalryProfile('fer', matches, players);
        expect(result).toBeNull();
    });

    it('returns rivalry profile for 3+ matches', () => {
        const matches = [
            makeMatch({ nosScore: 15, ellScore: 10 }),
            makeMatch({ nosScore: 15, ellScore: 8 }),
            makeMatch({ nosScore: 12, ellScore: 15, matchWinner: 'ellos' }),
        ];
        const result = getRivalryProfile('fer', matches, players);
        expect(result).not.toBeNull();
        expect(result!.matchCount).toBe(3);
        expect(result!.matchWins).toBe(2);
        expect(result!.matchLosses).toBe(1);
        expect(result!.mode).toBe('2v2');
    });

    it('returns specific rivalry by key', () => {
        const matches = [
            makeMatch({ nosScore: 15, ellScore: 10 }),
        ];
        // Get profile for specific key (even with < 3 matches)
        const allRivalries = getAllRivalries('fer', matches, players);
        expect(allRivalries.length).toBeGreaterThan(0);
        const key = allRivalries[0].key;
        const result = getRivalryProfile('fer', matches, players, key);
        expect(result).not.toBeNull();
        expect(result!.matchCount).toBe(1);
    });
});

// ─── getAllRivalries ─────────────────────────────────────────

describe('getAllRivalries', () => {
    it('returns empty array when no matches', () => {
        expect(getAllRivalries('fer', [], players)).toEqual([]);
    });

    it('groups matches by same players', () => {
        const matches = [
            makeMatch({ nosPlayers: ['fer', 'nico'], ellPlayers: ['mati', 'juli'] }),
            makeMatch({ nosPlayers: ['fer', 'nico'], ellPlayers: ['mati', 'juli'] }),
        ];
        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries.length).toBe(1);
        expect(rivalries[0].matchCount).toBe(2);
    });

    it('separates different opponent groups', () => {
        const matches = [
            makeMatch({ nosPlayers: ['fer'], ellPlayers: ['mati'], matchMode: '1v1' }),
            makeMatch({ nosPlayers: ['fer'], ellPlayers: ['nico'], matchMode: '1v1' }),
        ];
        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries.length).toBe(2);
    });

    it('sorts by last played date descending', () => {
        const matches = [
            makeMatch({ nosPlayers: ['fer'], ellPlayers: ['mati'], matchMode: '1v1', matchDate: 1000 }),
            makeMatch({ nosPlayers: ['fer'], ellPlayers: ['nico'], matchMode: '1v1', matchDate: 2000 }),
        ];
        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries[0].lastPlayedAt).toBe(2000);
    });

    it('excludes unfinished matches', () => {
        const matches = [
            { ...makeMatch(), isFinished: false } as MatchState,
        ];
        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries.length).toBe(0);
    });

    it('excludes matches where user is not a player', () => {
        const matches = [
            makeMatch({ nosPlayers: ['mati'], ellPlayers: ['juli'] }),
        ];
        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries.length).toBe(0);
    });
});

// ─── getPostMatchRivalryDelta ───────────────────────────────

describe('getPostMatchRivalryDelta', () => {
    it('returns null for non-existent match ID', () => {
        const result = getPostMatchRivalryDelta('fake-id', 'fer', [], players);
        expect(result).toBeNull();
    });

    it('detects first meeting', () => {
        const match = makeMatch({ id: 'first-meeting' });
        const result = getPostMatchRivalryDelta('first-meeting', 'fer', [match], players);
        expect(result).not.toBeNull();
        expect(result!.isFirstMeeting).toBe(true);
        expect(result!.headline).toBe('PRIMER CLASICO');
    });

    it('computes before/after correctly', () => {
        const match1 = makeMatch({ id: 'm1', nosScore: 15, ellScore: 10, matchDate: 1000 });
        const match2 = makeMatch({ id: 'm2', nosScore: 15, ellScore: 8, matchDate: 2000 });
        const allMatches = [match1, match2];

        const result = getPostMatchRivalryDelta('m2', 'fer', allMatches, players);
        expect(result).not.toBeNull();
        expect(result!.isFirstMeeting).toBe(false);
        expect(result!.before.matchWins).toBe(1);
        expect(result!.after.matchWins).toBe(2);
    });

    it('generates series headline when individual matches create series', () => {
        // Each match without seriesId gets its own "single:matchId" series
        // So 2 wins = 2 series wins, triggering series headline
        const match1 = makeMatch({ id: 'v1', nosScore: 15, ellScore: 10, matchDate: 1000 });
        const match2 = makeMatch({ id: 'v2', nosScore: 15, ellScore: 8, matchDate: 2000 });
        const result = getPostMatchRivalryDelta('v2', 'fer', [match1, match2], players);
        expect(result).not.toBeNull();
        expect(result!.headline).toBe('SERIE GANADA: 2-0');
    });

    it('generates series tie headline on first loss', () => {
        const match1 = makeMatch({ id: 'd1', nosScore: 15, ellScore: 10, matchDate: 1000 });
        const match2 = makeMatch({ id: 'd2', nosScore: 8, ellScore: 15, matchWinner: 'ellos', matchDate: 2000 });
        const result = getPostMatchRivalryDelta('d2', 'fer', [match1, match2], players);
        expect(result).not.toBeNull();
        expect(result!.headline).toBe('EMPATE EN SERIES');
    });

    it('returns null when user not in match', () => {
        const match = makeMatch({ id: 'no-user', nosPlayers: ['mati'], ellPlayers: ['juli'] });
        const result = getPostMatchRivalryDelta('no-user', 'fer', [match], players);
        expect(result).toBeNull();
    });
});

// ─── getGroupLeaderboard ────────────────────────────────────

describe('getGroupLeaderboard', () => {
    it('returns empty array for no matches', () => {
        expect(getGroupLeaderboard([])).toEqual([]);
    });

    it('computes win rates correctly', () => {
        const matches = [
            makeMatch({ nosScore: 15, ellScore: 10 }), // fer, nico win
            makeMatch({ nosScore: 15, ellScore: 8 }),   // fer, nico win
            makeMatch({ nosScore: 10, ellScore: 15, matchWinner: 'ellos' }), // mati, juli win
        ];
        const board = getGroupLeaderboard(matches);

        const ferEntry = board.find(e => e.playerId === 'fer');
        expect(ferEntry).toBeDefined();
        expect(ferEntry!.wins).toBe(2);
        expect(ferEntry!.losses).toBe(1);
        expect(ferEntry!.matchesPlayed).toBe(3);
        expect(ferEntry!.winRate).toBeCloseTo(2 / 3);

        const matiEntry = board.find(e => e.playerId === 'mati');
        expect(matiEntry).toBeDefined();
        expect(matiEntry!.wins).toBe(1);
        expect(matiEntry!.losses).toBe(2);
    });

    it('sorts by win rate descending', () => {
        const matches = [
            makeMatch({ nosPlayers: ['fer'], ellPlayers: ['mati'], matchMode: '1v1', nosScore: 15, ellScore: 10 }),
            makeMatch({ nosPlayers: ['fer'], ellPlayers: ['mati'], matchMode: '1v1', nosScore: 15, ellScore: 10 }),
            makeMatch({ nosPlayers: ['fer'], ellPlayers: ['mati'], matchMode: '1v1', nosScore: 10, ellScore: 15, matchWinner: 'ellos' }),
        ];
        const board = getGroupLeaderboard(matches);
        expect(board[0].playerId).toBe('fer');
        expect(board[1].playerId).toBe('mati');
    });

    it('excludes unfinished matches', () => {
        const matches = [
            { ...makeMatch(), isFinished: false } as MatchState,
        ];
        expect(getGroupLeaderboard(matches)).toEqual([]);
    });

    it('excludes matches with 0-0 score', () => {
        const matches = [
            makeMatch({ nosScore: 0, ellScore: 0 }),
        ];
        expect(getGroupLeaderboard(matches)).toEqual([]);
    });
});

// ─── Series tracking ─────────────────────────────────────────

describe('rivalry series tracking', () => {
    it('tracks series wins and losses', () => {
        const matches = [
            makeMatch({ id: 's1', seriesId: 'series-1', nosScore: 15, ellScore: 10, matchDate: 1000 }),
            makeMatch({ id: 's2', seriesId: 'series-1', nosScore: 15, ellScore: 8, matchDate: 2000 }),
            // nosotros wins series-1 (2-0)
            makeMatch({ id: 's3', seriesId: 'series-2', nosScore: 10, ellScore: 15, matchWinner: 'ellos', matchDate: 3000 }),
            makeMatch({ id: 's4', seriesId: 'series-2', nosScore: 8, ellScore: 15, matchWinner: 'ellos', matchDate: 4000 }),
            // ellos wins series-2 (0-2)
        ];

        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries.length).toBe(1);
        const rivalry = rivalries[0];
        expect(rivalry.matchCount).toBe(4);
        expect(rivalry.seriesWins).toBe(1);
        expect(rivalry.seriesLosses).toBe(1);
        expect(rivalry.seriesTotal).toBe(2);
    });

    it('computes series form (recent first)', () => {
        const matches = [
            makeMatch({ id: 'f1', seriesId: 'sx', nosScore: 15, ellScore: 10, matchDate: 1000 }),
            makeMatch({ id: 'f2', seriesId: 'sx', nosScore: 15, ellScore: 8, matchDate: 2000 }),
            makeMatch({ id: 'f3', seriesId: 'sy', nosScore: 10, ellScore: 15, matchWinner: 'ellos', matchDate: 3000 }),
            makeMatch({ id: 'f4', seriesId: 'sy', nosScore: 8, ellScore: 15, matchWinner: 'ellos', matchDate: 4000 }),
        ];

        const rivalries = getAllRivalries('fer', matches, players);
        const rivalry = rivalries[0];
        expect(rivalry.seriesForm.length).toBe(2);
        // Most recent series (sy) lost, then older (sx) won
        // seriesForm is sorted by lastAt desc
        expect(rivalry.seriesForm).toContain('G');
        expect(rivalry.seriesForm).toContain('P');
    });
});

// ─── Streak computation ──────────────────────────────────────

describe('rivalry streak', () => {
    it('computes winning streak', () => {
        const matches = [
            makeMatch({ id: 'st1', nosScore: 15, ellScore: 10, matchDate: 1000 }),
            makeMatch({ id: 'st2', nosScore: 15, ellScore: 8, matchDate: 2000 }),
            makeMatch({ id: 'st3', nosScore: 15, ellScore: 5, matchDate: 3000 }),
        ];
        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries[0].streak.type).toBe('W');
        expect(rivalries[0].streak.count).toBe(3);
    });

    it('computes losing streak', () => {
        const matches = [
            makeMatch({ id: 'ls1', nosScore: 10, ellScore: 15, matchWinner: 'ellos', matchDate: 1000 }),
            makeMatch({ id: 'ls2', nosScore: 8, ellScore: 15, matchWinner: 'ellos', matchDate: 2000 }),
        ];
        const rivalries = getAllRivalries('fer', matches, players);
        expect(rivalries[0].streak.type).toBe('L');
        expect(rivalries[0].streak.count).toBe(2);
    });
});
