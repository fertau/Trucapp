import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { MatchState, TeamId, PointType, GameAction, MatchSeriesInfo, MatchPicaPicaConfig } from '../types';

interface MatchStore extends MatchState {
    // Actions
    addPoints: (team: TeamId, amount: number, type: PointType) => void;
    subtractPoints: (team: TeamId, amount: number) => void;
    undo: () => void;
    resetMatch: (mode?: '1v1' | '2v2' | '3v3') => void;
    setTeamName: (team: TeamId, name: string) => void;
    setPlayers: (team: TeamId, playerIds: string[]) => void;
    setTargetScore: (score: number) => void;

    // V2 Actions
    setMetadata: (location: string, date?: number) => void;
    setPairId: (team: TeamId, pairId: string) => void;
    setSeries: (series: MatchSeriesInfo | null) => void;
    setPicaPica: (config: MatchPicaPicaConfig | null) => void;

    // Cloud Persistence
    isCloudSynced: boolean;
    unsubscribe: (() => void) | null;
    listenToMatch: (matchId: string) => void;
    stopListening: () => void;

    // UX safeguard: allows reverting accidental 30 -> 15 target switch.
    targetSwitchBackup: { nosotros: number; ellos: number } | null;
}

const INITIAL_STATE: Omit<MatchState, 'id' | 'startDate'> = {
    mode: '2v2',
    targetScore: 30,
    teams: {
        nosotros: { id: 'nosotros', name: 'Equipo 1', players: [], score: 0 },
        ellos: { id: 'ellos', name: 'Equipo 2', players: [], score: 0 },
    },
    picaPica: null,
    history: [],
    isFinished: false,
};

const isPicaPicaWindow = (
    config: MatchPicaPicaConfig | null | undefined,
    scoreNos: number,
    scoreEll: number
): boolean => {
    if (!config?.enabled || config.pairings.length === 0) return false;
    const inNos = scoreNos >= config.startAt && scoreNos <= config.endAt;
    const inEll = scoreEll >= config.startAt && scoreEll <= config.endAt;
    return inNos || inEll;
};

const recomputeFromHistory = (
    history: GameAction[],
    targetScore: number
): { teams: MatchState['teams']; isFinished: boolean; winner: TeamId | null } => {
    const nextTeams: MatchState['teams'] = {
        nosotros: { id: 'nosotros', name: 'Equipo 1', players: [], score: 0 },
        ellos: { id: 'ellos', name: 'Equipo 2', players: [], score: 0 }
    };

    let winner: TeamId | null = null;
    for (const action of history) {
        if (action.type !== 'ADD_POINTS') continue;
        const current = nextTeams[action.team].score;
        const raw = current + action.amount;
        const clamped = raw >= targetScore ? targetScore : raw;
        nextTeams[action.team] = { ...nextTeams[action.team], score: clamped };
        if (clamped >= targetScore) winner = action.team;
    }

    return {
        teams: nextTeams,
        isFinished: winner !== null,
        winner
    };
};

// Helper to extract only data from the store for persistence
const getMatchData = (state: MatchStore) => ({
    id: state.id,
    startDate: state.startDate,
    mode: state.mode,
    targetScore: state.targetScore,
    teams: state.teams,
    history: state.history,
    isFinished: state.isFinished,
    winner: state.winner ?? null,
    metadata: state.metadata ?? null,
    pairs: state.pairs ?? null
    ,
    series: state.series ?? null,
    picaPica: state.picaPica ?? null
});

export const useMatchStore = create<MatchStore>()(
    persist(
        (set, get) => ({
            id: crypto.randomUUID(),
            startDate: Date.now(),
            ...INITIAL_STATE,
            targetSwitchBackup: null,
            isCloudSynced: false,
            unsubscribe: null,

            listenToMatch: (matchId) => {
                // Cleanup previous listener if any
                const prevUnsub = get().unsubscribe;
                if (prevUnsub) prevUnsub();

                console.log('Listening to match:', matchId);

                const unsub = onSnapshot(doc(db, 'matches', matchId), (doc) => {
                    if (doc.exists()) {
                        const data = doc.data() as MatchState;
                        const currentState = get();

                        // Basic validation
                        if (!data.teams || !data.teams.nosotros) return;

                        // ONLY update if:
                        // 1. Cloud history is longer (more actions occurred)
                        // 2. Or if we don't have this match loaded locally yet (id mismatch)
                        // 3. Or if cloud history is the same length but content might differ (e.g. sync repair)
                        //    but we prioritize local history length to avoid "jumping back"

                        const isNewer = (data.history?.length || 0) > (currentState.history?.length || 0);
                        const isDifferentMatch = currentState.id !== matchId;

                        if (isNewer || isDifferentMatch) {
                            console.log('Syncing from cloud (data is newer or different match)');
                            set({
                                ...data,
                                isCloudSynced: true,
                            });
                        } else {
                            // IMPORTANT:
                            // Do not overwrite local scores when cloud history is not newer.
                            // This prevents regressions after re-opening PWA with transient stale cloud/team payloads.
                            const namesChanged =
                                data.teams.nosotros.name !== currentState.teams.nosotros.name ||
                                data.teams.ellos.name !== currentState.teams.ellos.name;

                            if (namesChanged) {
                                set({
                                    teams: {
                                        ...currentState.teams,
                                        nosotros: {
                                            ...currentState.teams.nosotros,
                                            name: data.teams.nosotros.name
                                        },
                                        ellos: {
                                            ...currentState.teams.ellos,
                                            name: data.teams.ellos.name
                                        }
                                    },
                                    isCloudSynced: true
                                });
                            }
                        }
                    } else {
                        console.log('Match document does not exist (yet)');
                    }
                }, (error) => {
                    console.error("onSnapshot error:", error);
                });

                set({ unsubscribe: unsub, id: matchId, isCloudSynced: true });
            },

            stopListening: () => {
                const unsub = get().unsubscribe;
                if (unsub) unsub();
                set({ unsubscribe: null, isCloudSynced: false });
            },

            addPoints: (teamId, amount, type) => {
                set((state) => {
                    if (state.isFinished) return state;

                    // Create Action
                    const action: GameAction = {
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'ADD_POINTS',
                        team: teamId,
                        amount,
                        reason: type
                    };

                    const newHistory = [...state.history, action];
                    const currentScore = state.teams[teamId].score;
                    const wasPicaWindow = isPicaPicaWindow(
                        state.picaPica,
                        state.teams.nosotros.score,
                        state.teams.ellos.score
                    );
                    let newScore = currentScore + amount;
                    const isWin = newScore >= state.targetScore;
                    if (isWin) newScore = state.targetScore;

                    const newTeams = {
                        ...state.teams,
                        [teamId]: { ...state.teams[teamId], score: newScore }
                    };

                    const newState = {
                        teams: newTeams,
                        history: newHistory,
                        isFinished: isWin,
                        winner: isWin ? teamId : null,
                        targetSwitchBackup: null,
                        picaPica: state.picaPica
                            ? {
                                ...state.picaPica,
                                currentPairingIndex: wasPicaWindow && state.picaPica.pairings.length > 0
                                    ? (state.picaPica.currentPairingIndex + 1) % state.picaPica.pairings.length
                                    : state.picaPica.currentPairingIndex
                            }
                            : null
                    };

                    // Cloud Write
                    if (state.isCloudSynced) {
                        updateDoc(doc(db, 'matches', state.id), newState).catch(err => console.error("Cloud update failed", err));
                    } else {
                        // First write -> Create doc to start syncing? 
                        // For now we assume listeners are set up explicitly, 
                        // but let's auto-create if we are in "Cloud Mode" intended.
                        // Actually, let's just write if we have an ID.
                        const matchData = getMatchData(state);
                        setDoc(doc(db, 'matches', state.id), {
                            ...matchData,
                            ...newState, // Apply updates
                        }, { merge: true }).catch(err => console.error("Cloud init failed", err));
                    }

                    return newState;
                });
            },

            subtractPoints: (teamId, amount) => {
                set((state) => {
                    if (state.isFinished) return state;
                    if (state.teams[teamId].score < amount) return state;

                    const currentScore = state.teams[teamId].score;
                    const newScore = currentScore - amount;

                    const newTeams = {
                        ...state.teams,
                        [teamId]: { ...state.teams[teamId], score: newScore }
                    };

                    const newState = { teams: newTeams, targetSwitchBackup: null as MatchStore['targetSwitchBackup'] };

                    // Cloud Write
                    if (state.id) {
                        updateDoc(doc(db, 'matches', state.id), newState).catch(() => {
                            // If doc doesn't exist, create it (optimistic)
                            const matchData = getMatchData(state);
                            setDoc(doc(db, 'matches', state.id), { ...matchData, ...newState }, { merge: true });
                        });
                    }

                    return newState;
                });
            },

            undo: () => set((state) => {
                if (state.history.length === 0) return state;

                const newHistory = [...state.history];
                const lastAction = newHistory.pop();

                if (!lastAction || lastAction.type !== 'ADD_POINTS') return { history: newHistory };
                const recomputed = recomputeFromHistory(newHistory, state.targetScore);
                const currentInPicaWindow = isPicaPicaWindow(
                    state.picaPica,
                    state.teams.nosotros.score,
                    state.teams.ellos.score
                );
                const newState = {
                    history: newHistory,
                    teams: {
                        nosotros: {
                            ...state.teams.nosotros,
                            score: recomputed.teams.nosotros.score
                        },
                        ellos: {
                            ...state.teams.ellos,
                            score: recomputed.teams.ellos.score
                        }
                    },
                    isFinished: recomputed.isFinished,
                    winner: recomputed.winner,
                    targetSwitchBackup: null as MatchStore['targetSwitchBackup'],
                    picaPica: state.picaPica
                        ? {
                            ...state.picaPica,
                            currentPairingIndex: currentInPicaWindow && state.picaPica.pairings.length > 0
                                ? (state.picaPica.currentPairingIndex - 1 + state.picaPica.pairings.length) % state.picaPica.pairings.length
                                : state.picaPica.currentPairingIndex
                        }
                        : null
                };

                // Cloud Write
                if (state.id) {
                    updateDoc(doc(db, 'matches', state.id), newState).catch(console.error);
                }

                return newState;
            }),

            resetMatch: (mode = '2v2') => {
                // Stop listening to old match if we are resetting fully?
                // Usually reset means NEW match.
                get().stopListening();

                const newId = crypto.randomUUID();

                set({
                    id: newId,
                    startDate: Date.now(),
                    ...INITIAL_STATE,
                    mode,
                    winner: null, // Ensure reset
                    isFinished: false,
                    targetSwitchBackup: null,
                    isCloudSynced: false // Start local until shared/synced
                });
            },

            setTeamName: (team, name) => set((state) => {
                const newTeams = {
                    ...state.teams,
                    [team]: { ...state.teams[team], name }
                };
                const newState = { teams: newTeams };

                if (state.id) {
                    const matchData = getMatchData(state);
                    setDoc(doc(db, 'matches', state.id), { ...matchData, ...newState }, { merge: true });
                }

                return newState;
            }),

            setPlayers: (team, playerIds) => set((state) => ({
                teams: {
                    ...state.teams,
                    [team]: { ...state.teams[team], players: playerIds }
                }
            })),

            setTargetScore: (score) => set((state) => {
                const nextTarget = score === 15 ? 15 : 30;
                let nextNos = Math.min(state.teams.nosotros.score, nextTarget);
                let nextEll = Math.min(state.teams.ellos.score, nextTarget);
                let nextBackup: MatchStore['targetSwitchBackup'] = state.targetSwitchBackup;

                const isSwitchingTo15 = state.targetScore === 30 && nextTarget === 15;
                const isSwitchingBackTo30 = state.targetScore === 15 && nextTarget === 30;

                if (isSwitchingTo15) {
                    nextBackup = {
                        nosotros: state.teams.nosotros.score,
                        ellos: state.teams.ellos.score
                    };
                }

                if (isSwitchingBackTo30 && nextBackup) {
                    // Restore previous 30-point progress on quick revert.
                    nextNos = Math.min(nextTarget, nextBackup.nosotros);
                    nextEll = Math.min(nextTarget, nextBackup.ellos);
                    nextBackup = null;
                }

                let nextWinner: TeamId | null = null;
                if (nextNos >= nextTarget && nextEll < nextTarget) nextWinner = 'nosotros';
                if (nextEll >= nextTarget && nextNos < nextTarget) nextWinner = 'ellos';
                if (nextNos >= nextTarget && nextEll >= nextTarget) {
                    nextWinner = nextNos >= nextEll ? 'nosotros' : 'ellos';
                }

                const newState = {
                    targetScore: nextTarget,
                    teams: {
                        ...state.teams,
                        nosotros: { ...state.teams.nosotros, score: nextNos },
                        ellos: { ...state.teams.ellos, score: nextEll }
                    },
                    isFinished: nextWinner !== null,
                    winner: nextWinner,
                    targetSwitchBackup: nextBackup
                };

                if (state.id) {
                    const matchData = getMatchData(state);
                    setDoc(doc(db, 'matches', state.id), { ...matchData, ...newState }, { merge: true }).catch(console.error);
                }

                return newState;
            }),

            setMetadata: (location, date) => set({ metadata: { location, date } }),

            setPairId: (team, pairId) => set((state) => ({
                pairs: { ...state.pairs, [team]: pairId }
            })),

            setSeries: (series) => set({ series })
            ,

            setPicaPica: (config) => set({ picaPica: config })
        }),
        {
            name: 'trucapp-match-storage-v1', // unique name
            partialize: (state) => ({
                id: state.id,
                mode: state.mode,
                targetScore: state.targetScore,
                teams: state.teams,
                history: state.history,
                isFinished: state.isFinished,
                winner: state.winner,
                metadata: state.metadata,
                pairs: state.pairs,
                series: state.series,
                picaPica: state.picaPica
            })
        }
    )
);
