import { create } from 'zustand';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc, setDoc, startAfter } from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { MatchState } from '../types';
import { useAuthStore } from './useAuthStore';
import { canUserDeleteMatch, canUserEditMatch, validateMatchResultConsistency } from '../utils/matchValidation';
import { getMatchEffectiveDate, withNormalizedMatchIdentity } from '../utils/matchIdentity';

const PAGE_SIZE = 50;

interface HistoryStore {
    matches: MatchState[];
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    lastVisible: QueryDocumentSnapshot<DocumentData> | null;

    // Actions
    fetchMatches: () => Promise<void>;
    loadMoreMatches: () => Promise<void>;
    addMatch: (match: MatchState) => Promise<void>;
    updateMatch: (match: MatchState, actorUserId?: string | null) => Promise<void>;
    deleteMatch: (matchId: string, actorUserId?: string | null, actorIsAdmin?: boolean) => Promise<void>;
    deleteSeries: (seriesId: string, actorUserId?: string | null, actorIsAdmin?: boolean) => Promise<void>;
    clearAllMatches: () => Promise<void>;
    clearHistory: () => void; // Deprecated: use clearAllMatches
}

export const useHistoryStore = create<HistoryStore>((set) => ({
    matches: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    error: null,
    lastVisible: null,

    fetchMatches: async () => {
        set({ isLoading: true, error: null });
        try {
            const matchesRef = collection(db, 'matches');
            const q = query(matchesRef, orderBy('startDate', 'desc'), limit(PAGE_SIZE));

            const querySnapshot = await getDocs(q);
            const loadedMatches: MatchState[] = [];
            const seen = new Set<string>();

            querySnapshot.forEach((d) => {
                const data = d.data() as MatchState;
                if (data.isDeleted) return;
                const matchId = data.id || d.id;
                if (!matchId || seen.has(matchId)) return;
                seen.add(matchId);
                const normalized = withNormalizedMatchIdentity({ ...data, id: matchId });
                loadedMatches.push(normalized);

                const needsDateRepair = data.metadata?.customDate && data.metadata?.date !== normalized.metadata?.date;
                const needsTeamRefsRepair = !data.teamRefs;
                if (needsDateRepair || needsTeamRefsRepair) {
                    void setDoc(doc(db, 'matches', matchId), normalized, { merge: true }).catch((err) => {
                        console.error('Error repairing legacy match fields:', err);
                    });
                }
            });

            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
            set({
                matches: loadedMatches.sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a)),
                isLoading: false,
                lastVisible,
                hasMore: querySnapshot.docs.length === PAGE_SIZE
            });
        } catch (err: unknown) {
            console.error("Error fetching matches:", err);
            set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
        }
    },

    loadMoreMatches: async () => {
        const { isLoading, isLoadingMore, hasMore, lastVisible } = useHistoryStore.getState();
        if (isLoading || isLoadingMore || !hasMore || !lastVisible) return;

        set({ isLoadingMore: true, error: null });
        try {
            const matchesRef = collection(db, 'matches');
            const q = query(
                matchesRef,
                orderBy('startDate', 'desc'),
                startAfter(lastVisible),
                limit(PAGE_SIZE)
            );

            const querySnapshot = await getDocs(q);
            const loadedMatches: MatchState[] = [];

            querySnapshot.forEach((d) => {
                const data = d.data() as MatchState;
                if (data.isDeleted) return;
                const matchId = data.id || d.id;
                if (!matchId) return;
                const normalized = withNormalizedMatchIdentity({ ...data, id: matchId });
                loadedMatches.push(normalized);

                const needsDateRepair = data.metadata?.customDate && data.metadata?.date !== normalized.metadata?.date;
                const needsTeamRefsRepair = !data.teamRefs;
                if (needsDateRepair || needsTeamRefsRepair) {
                    void setDoc(doc(db, 'matches', matchId), normalized, { merge: true }).catch((err) => {
                        console.error('Error repairing legacy match fields:', err);
                    });
                }
            });

            const nextLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] ?? lastVisible;
            set((state) => {
                const seen = new Set(state.matches.map((m) => m.id));
                const merged = [...state.matches];
                loadedMatches.forEach((m) => {
                    if (!seen.has(m.id)) merged.push(m);
                });
                return {
                    matches: merged.sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a)),
                    isLoadingMore: false,
                    lastVisible: nextLastVisible,
                    hasMore: querySnapshot.docs.length === PAGE_SIZE
                };
            });
        } catch (err: unknown) {
            console.error("Error loading more matches:", err);
            set({ error: err instanceof Error ? err.message : 'Unknown error', isLoadingMore: false });
        }
    },

    addMatch: async (match) => {
        const consistency = validateMatchResultConsistency(match);
        if (!consistency.valid) {
            const reason = consistency.reason ?? 'Resultado invalido.';
            set({ error: reason });
            throw new Error(reason);
        }

        const currentUserId = useAuthStore.getState().currentUserId;
        const now = Date.now();
        const normalizedMatch = withNormalizedMatchIdentity({
            ...match,
            createdByUserId: match.createdByUserId ?? currentUserId ?? null,
            createdAt: match.createdAt ?? now,
            updatedAt: now,
            isDeleted: false,
            deletedAt: null,
            deletedByUserId: null
        });

        // Optimistic upsert
        set((state) => {
            const exists = state.matches.some((m) => m.id === normalizedMatch.id);
            if (exists) {
                return {
                    matches: state.matches
                        .map((m) => (m.id === normalizedMatch.id ? normalizedMatch : m))
                        .sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a))
                };
            }
            return { matches: [normalizedMatch, ...state.matches].sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a)) };
        });

        try {
            await setDoc(doc(db, 'matches', normalizedMatch.id), normalizedMatch, { merge: true });
        } catch (err: unknown) {
            console.error("Error saving match to cloud:", err);
            // Rollback or show error?
            // For now, just log.
        }
    },

    updateMatch: async (match, actorUserId = null) => {
        const consistency = validateMatchResultConsistency(match);
        if (!consistency.valid) {
            const reason = consistency.reason ?? 'Resultado invalido.';
            set({ error: reason });
            throw new Error(reason);
        }
        if (match.isDeleted) {
            set({ error: 'No se puede editar un partido eliminado.' });
            throw new Error('No se puede editar un partido eliminado.');
        }
        if (!canUserEditMatch(match, actorUserId)) {
            set({ error: 'No autorizado para editar este partido.' });
            throw new Error('No autorizado para editar este partido.');
        }

        const normalizedMatch = withNormalizedMatchIdentity({
            ...match,
            updatedAt: Date.now(),
            isDeleted: false
        });
        set((state) => ({
            matches: state.matches
                .map((m) => (m.id === normalizedMatch.id ? normalizedMatch : m))
                .sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a))
        }));

        try {
            await setDoc(doc(db, 'matches', normalizedMatch.id), normalizedMatch, { merge: true });
        } catch (err: unknown) {
            console.error("Error updating match in cloud:", err);
        }
    },

    deleteMatch: async (matchId, actorUserId = null, actorIsAdmin = false) => {
        const current = useHistoryStore.getState().matches.find((m) => m.id === matchId);
        if (!current) return;
        if (!canUserDeleteMatch(current, actorUserId, actorIsAdmin)) {
            set({ error: 'No autorizado para borrar este partido.' });
            throw new Error('No autorizado para borrar este partido.');
        }
        const deletedAt = Date.now();
        const tombstone: Partial<MatchState> = {
            isDeleted: true,
            deletedAt,
            deletedByUserId: actorUserId ?? null,
            updatedAt: deletedAt
        };

        set((state) => ({
            matches: state.matches.filter((m) => m.id !== matchId)
        }));
        try {
            await setDoc(doc(db, 'matches', matchId), tombstone, { merge: true });
        } catch (err: unknown) {
            console.error('Error deleting match:', err);
            set({ error: err instanceof Error ? err.message : 'Error deleting match' });
        }
    },

    deleteSeries: async (seriesId, actorUserId = null, actorIsAdmin = false) => {
        const current = useHistoryStore.getState().matches;
        const targets = current.filter((m) => m.series?.id === seriesId);
        if (targets.length === 0) return;
        const unauthorized = targets.find((m) => !canUserDeleteMatch(m, actorUserId, actorIsAdmin));
        if (unauthorized) {
            set({ error: 'No autorizado para borrar esta serie.' });
            throw new Error('No autorizado para borrar esta serie.');
        }

        const targetIds = new Set(targets.map((m) => m.id));
        const deletedAt = Date.now();
        set((state) => ({
            matches: state.matches.filter((m) => !targetIds.has(m.id))
        }));

        try {
            await Promise.all(
                targets.map((m) => setDoc(doc(db, 'matches', m.id), {
                    isDeleted: true,
                    deletedAt,
                    deletedByUserId: actorUserId ?? null,
                    updatedAt: deletedAt
                } as Partial<MatchState>, { merge: true }))
            );
        } catch (err: unknown) {
            console.error('Error deleting series:', err);
            set({ error: err instanceof Error ? err.message : 'Error deleting series' });
        }
    },

    clearAllMatches: async () => {
        set({ isLoading: true });
        try {
            const querySnapshot = await getDocs(collection(db, 'matches'));
            const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'matches', d.id)));
            await Promise.all(deletePromises);
            set({ matches: [], isLoading: false, isLoadingMore: false, hasMore: false, lastVisible: null });
        } catch (err) {
            console.error("Error clearing matches:", err);
            set({ isLoading: false });
        }
    },

    clearHistory: () => set({ matches: [], lastVisible: null, hasMore: false, isLoadingMore: false })
}));
