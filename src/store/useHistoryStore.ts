import { create } from 'zustand';
import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
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

            querySnapshot.forEach((doc: any) => {
                const data = doc.data() as MatchState;
                // Ensure ID ensures unicity? 
                // We might want to store the Firestore Doc ID if we edit.
                // For now, just loading for display is enough.
                loadedMatches.push(data);
            });

            set({ matches: loadedMatches, isLoading: false });
        } catch (err: any) {
            console.error("Error fetching matches:", err);
            set({ error: err.message, isLoading: false });
        }
    },

    addMatch: async (match) => {
        // Optimistic update
        set((state) => ({ matches: [match, ...state.matches] }));

        try {
            const matchesRef = collection(db, 'matches');
            await addDoc(matchesRef, match);
        } catch (err: any) {
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
