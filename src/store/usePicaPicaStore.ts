import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamId } from '../types';

export interface PicaPicaSubMatch {
    id: string;
    playerNosotrosId: string;
    playerEllosId: string;
    isFinished: boolean;
    winner?: TeamId;
    scoreNosotros: number;
    scoreEllos: number;
}

interface PicaPicaState {
    isActive: boolean;
    targetScore: number;
    matches: PicaPicaSubMatch[];
    setup: (matches: PicaPicaSubMatch[], targetScore: number) => void;
    updateMatchResult: (id: string, winner: TeamId, scoreNos: number, scoreEll: number) => void;
    reset: () => void;
}

export const usePicaPicaStore = create<PicaPicaState>()(
    persist(
        (set) => ({
            isActive: false,
            targetScore: 10, // Default 10 per wireframe (p15/30 implies full match, but pica pica usually shorter?) Wireframe says 10 (5-25).
            matches: [],

            setup: (matches, targetScore) => set({
                isActive: true,
                matches,
                targetScore
            }),

            updateMatchResult: (id, winner, scoreNos, scoreEll) => set((state) => ({
                matches: state.matches.map(m =>
                    m.id === id
                        ? { ...m, isFinished: true, winner, scoreNosotros: scoreNos, scoreEllos: scoreEll }
                        : m
                )
            })),

            reset: () => set({ isActive: false, matches: [] })
        }),
        { name: 'trucapp-pica-pica' }
    )
);
