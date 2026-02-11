import { create } from 'zustand';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { MatchState } from '../types';

interface HistoryStore {
    matches: MatchState[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchMatches: () => Promise<void>;
    addMatch: (match: MatchState) => Promise<void>;
    clearAllMatches: () => Promise<void>;
    clearHistory: () => void; // Deprecated: use clearAllMatches
}

export const useHistoryStore = create<HistoryStore>((set) => ({
    matches: [],
    isLoading: false,
    error: null,

    fetchMatches: async () => {
        set({ isLoading: true, error: null });
        try {
            // Helper to delay if db is not ready? No, db is init synchronously.
            const matchesRef = collection(db, 'matches');
            const q = query(matchesRef, orderBy('startDate', 'desc'), limit(50));

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

            set({ matches: loadedMatches, isLoading: false });
        } catch (err: unknown) {
            console.error("Error fetching matches:", err);
            set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
        }
    },

    addMatch: async (match) => {
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

    clearAllMatches: async () => {
        set({ isLoading: true });
        try {
            const querySnapshot = await getDocs(collection(db, 'matches'));
            const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'matches', d.id)));
            await Promise.all(deletePromises);
            set({ matches: [], isLoading: false });
        } catch (err) {
            console.error("Error clearing matches:", err);
            set({ isLoading: false });
        }
    },

    clearHistory: () => set({ matches: [] })
}));
