import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Player } from '../types';

interface UserStore {
    players: Player[];
    isLoading: boolean;
    fetchPlayers: () => Promise<void>;
    addPlayer: (name: string, pin: string) => Promise<Player>;
    removePlayer: (id: string) => Promise<void>;
    updatePlayerStats: (id: string, won: boolean) => void;
    isUsernameUnique: (name: string) => boolean;
    clearAllUsers: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            players: [],
            isLoading: false,

            fetchPlayers: async () => {
                set({ isLoading: true });
                try {
                    const querySnapshot = await getDocs(collection(db, 'players'));
                    const loadedPlayers: Player[] = [];
                    querySnapshot.forEach((d) => {
                        loadedPlayers.push({ id: d.id, ...d.data() } as Player);
                    });
                    set({ players: loadedPlayers, isLoading: false });
                } catch (err) {
                    console.error("Error fetching players:", err);
                    set({ isLoading: false });
                }
            },

            addPlayer: async (name, pin) => {
                const id = crypto.randomUUID();
                const newPlayer: Player = { id, name, pin };

                // Optimistic local update
                set((state) => ({ players: [...state.players, newPlayer] }));

                try {
                    // We use the generated UUID as Firestore doc ID for consistency
                    await setDoc(doc(db, 'players', id), { name, pin });
                } catch (err) {
                    console.error("Error saving player to Firestore:", err);
                }
                return newPlayer;
            },

            removePlayer: async (id) => {
                set((state) => ({ players: state.players.filter(p => p.id !== id) }));
                try {
                    await deleteDoc(doc(db, 'players', id));
                } catch (err) {
                    console.error("Error deleting player from Firestore:", err);
                }
            },

            updatePlayerStats: (id, won) => {
                console.log('Update stats for:', id, won);
            },

            isUsernameUnique: (name: string): boolean => {
                const { players } = useUserStore.getState();
                return !players.some((p: Player) => p.name.toLowerCase() === name.toLowerCase());
            },

            clearAllUsers: async () => {
                set({ isLoading: true });
                try {
                    const querySnapshot = await getDocs(collection(db, 'players'));
                    const deletePromises = querySnapshot.docs.map(d => deleteDoc(doc(db, 'players', d.id)));
                    await Promise.all(deletePromises);
                    set({ players: [], isLoading: false });
                } catch (err) {
                    console.error("Error clearing users:", err);
                    set({ isLoading: false });
                }
            }
        }),
        {
            name: 'trucapp-users',
        }
    )
);
