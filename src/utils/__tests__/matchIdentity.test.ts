import { describe, it, expect } from 'vitest';
import { getMatchEffectiveDate, getTeamIdForUser, getTeamRefLabel, buildTeamRef } from '../matchIdentity';
import type { MatchState } from '../../types';

function makeMatch(overrides: Partial<MatchState> = {}): MatchState {
    return {
        id: 'match-1',
        mode: '2v2',
        startDate: 1700000000000,
        targetScore: 15,
        isFinished: true,
        winner: 'nosotros',
        teams: {
            nosotros: { name: 'Los Pibes', score: 15, players: ['user-1', 'user-2'] },
            ellos: { name: 'Los Otros', score: 12, players: ['user-3', 'user-4'] },
        },
        history: [],
        ...overrides,
    } as MatchState;
}

describe('getTeamIdForUser', () => {
    const match = makeMatch();

    it('returns nosotros when user is on nosotros team', () => {
        expect(getTeamIdForUser(match, 'user-1')).toBe('nosotros');
        expect(getTeamIdForUser(match, 'user-2')).toBe('nosotros');
    });

    it('returns ellos when user is on ellos team', () => {
        expect(getTeamIdForUser(match, 'user-3')).toBe('ellos');
        expect(getTeamIdForUser(match, 'user-4')).toBe('ellos');
    });

    it('returns null when user is not in the match', () => {
        expect(getTeamIdForUser(match, 'user-999')).toBeNull();
    });

    it('returns null for empty string userId', () => {
        expect(getTeamIdForUser(match, '')).toBeNull();
    });
});

describe('getMatchEffectiveDate', () => {
    it('returns metadata.date when available', () => {
        const match = makeMatch({ metadata: { date: 1700099999000 } });
        expect(getMatchEffectiveDate(match)).toBe(1700099999000);
    });

    it('returns metadata.customDate when date is not set', () => {
        const match = makeMatch({ metadata: { customDate: 1700088888000 } });
        expect(getMatchEffectiveDate(match)).toBe(1700088888000);
    });

    it('returns startDate when no metadata dates', () => {
        const match = makeMatch();
        expect(getMatchEffectiveDate(match)).toBe(1700000000000);
    });

    it('prefers metadata.date over customDate', () => {
        const match = makeMatch({
            metadata: { date: 1700099999000, customDate: 1700088888000 },
        });
        expect(getMatchEffectiveDate(match)).toBe(1700099999000);
    });

    it('falls back to startDate when metadata is undefined', () => {
        const match = makeMatch();
        delete (match as any).metadata;
        expect(getMatchEffectiveDate(match)).toBe(1700000000000);
    });
});

describe('getTeamRefLabel', () => {
    it('returns team name', () => {
        const match = makeMatch();
        expect(getTeamRefLabel(match, 'nosotros')).toBe('Los Pibes');
        expect(getTeamRefLabel(match, 'ellos')).toBe('Los Otros');
    });

    it('uses teamRefs label when available', () => {
        const match = makeMatch({
            teamRefs: {
                nosotros: { key: 'k', label: 'Custom Label', playerIds: [], pairId: null },
                ellos: { key: 'k2', label: 'Other Label', playerIds: [], pairId: null },
            },
        });
        expect(getTeamRefLabel(match, 'nosotros')).toBe('Custom Label');
    });
});

describe('buildTeamRef', () => {
    it('builds team ref with sorted player IDs', () => {
        const match = makeMatch({
            teams: {
                nosotros: { id: 'nosotros', name: 'Team A', score: 15, players: ['z-user', 'a-user'] },
                ellos: { id: 'ellos', name: 'Team B', score: 10, players: ['m-user'] },
            },
        });
        const ref = buildTeamRef(match, 'nosotros');
        expect(ref.playerIds).toEqual(['a-user', 'z-user']);
        expect(ref.key).toBe('team:a-user|z-user');
        expect(ref.label).toBe('Team A');
    });

    it('uses pair ID when available', () => {
        const match = makeMatch({ pairs: { nosotros: 'pair-abc', ellos: null } });
        const ref = buildTeamRef(match, 'nosotros');
        expect(ref.key).toBe('pair:pair-abc');
        expect(ref.pairId).toBe('pair-abc');
    });
});
