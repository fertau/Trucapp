import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Pair } from '../types';

interface PairStore {
    pairs: Pair[];

    // Actions
    getOrCreatePair: (playerIds: [string, string], defaultName?: string) => Pair;
    updatePairName: (pairId: string, name: string) => void;
    recordMatchResult: (pairId: string, isWin: boolean) => void;
    findPairByPlayers: (playerIds: [string, string]) => Pair | undefined;
    toggleFavorite: (pairId: string) => void;
}

export const usePairStore = create<PairStore>()(
    persist(
        (set, get) => ({
            pairs: [],

            findPairByPlayers: ([p1, p2]) => {
                const pairs = get().pairs;
                // Check indifferent of order
                return pairs.find(p =>
                    (p.playerIds.includes(p1) && p.playerIds.includes(p2))
                );
            },

            getOrCreatePair: (playerIds, defaultName) => {
                const existing = get().findPairByPlayers(playerIds);
                if (existing) return existing;

                // Create new
                const newPair: Pair = {
                    id: crypto.randomUUID(),
                    name: defaultName || 'Pareja Sin Nombre',
                    playerIds,
                    matchCount: 0,
                    winCount: 0,
                    lastPlayedAt: Date.now()
                };

                set(state => ({ pairs: [...state.pairs, newPair] }));
                return newPair;
            },

            updatePairName: (id, name) => set(state => ({
                pairs: state.pairs.map(p => p.id === id ? { ...p, name } : p)
            })),

            recordMatchResult: (id, isWin) => set(state => ({
                pairs: state.pairs.map(p => p.id === id ? {
                    ...p,
                    matchCount: p.matchCount + 1,
                    winCount: p.winCount + (isWin ? 1 : 0),
                    lastPlayedAt: Date.now()
                } : p)
            })),

            toggleFavorite: (id) => set(state => ({
                pairs: state.pairs.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)
            }))
        }),
        { name: 'trucapp-pairs' }
    )
);
