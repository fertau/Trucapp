import { create } from 'zustand';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc, setDoc, startAfter } from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { MatchState } from '../types';
import { canUserEditMatch, validateMatchResultConsistency } from '../utils/matchValidation';

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
                const matchId = data.id || d.id;
                if (!matchId || seen.has(matchId)) return;
                seen.add(matchId);
                loadedMatches.push({ ...data, id: matchId });
            });

            const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] ?? null;
            set({
                matches: loadedMatches,
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
                const matchId = data.id || d.id;
                if (!matchId) return;
                loadedMatches.push({ ...data, id: matchId });
            });

            const nextLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] ?? lastVisible;
            set((state) => {
                const seen = new Set(state.matches.map((m) => m.id));
                const merged = [...state.matches];
                loadedMatches.forEach((m) => {
                    if (!seen.has(m.id)) merged.push(m);
                });
                return {
                    matches: merged,
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

        // Optimistic upsert
        set((state) => {
            const exists = state.matches.some((m) => m.id === match.id);
            if (exists) {
                return { matches: state.matches.map((m) => (m.id === match.id ? match : m)) };
            }
            return { matches: [match, ...state.matches] };
        });

        try {
            await setDoc(doc(db, 'matches', match.id), match, { merge: true });
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
        if (!canUserEditMatch(match, actorUserId)) {
            set({ error: 'No autorizado para editar este partido.' });
            throw new Error('No autorizado para editar este partido.');
        }

        set((state) => ({
            matches: state.matches.map((m) => (m.id === match.id ? match : m))
        }));

        try {
            await setDoc(doc(db, 'matches', match.id), match, { merge: true });
        } catch (err: unknown) {
            console.error("Error updating match in cloud:", err);
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
