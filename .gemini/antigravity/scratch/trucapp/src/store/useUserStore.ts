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
    addFriend: (currentUserId: string, friendId: string) => Promise<void>;
    removeFriend: (currentUserId: string, friendId: string) => Promise<void>;
    updateVisibility: (playerId: string, visibility: 'PUBLIC' | 'PRIVATE') => Promise<void>;
    updateNickname: (playerId: string, nickname: string) => Promise<void>;
    isUsernameUnique: (name: string) => boolean;
    clearAllUsers: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set, get) => ({
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
                const newPlayer: Player = {
                    id,
                    name,
                    pin,
                    visibility: 'PUBLIC',
                    friends: []
                };

                // Optimistic local update
                set((state) => ({ players: [...state.players, newPlayer] }));

                try {
                    await setDoc(doc(db, 'players', id), {
                        name,
                        pin,
                        visibility: 'PUBLIC',
                        friends: []
                    });
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

            addFriend: async (currentUserId, friendId) => {
                set((state) => ({
                    players: state.players.map(p => {
                        if (p.id === currentUserId && !p.friends.includes(friendId)) {
                            return { ...p, friends: [...p.friends, friendId] };
                        }
                        return p;
                    })
                }));

                const user = get().players.find(p => p.id === currentUserId);
                if (user) {
                    await setDoc(doc(db, 'players', currentUserId), { friends: user.friends }, { merge: true });
                }
            },

            removeFriend: async (currentUserId, friendId) => {
                set((state) => ({
                    players: state.players.map(p => {
                        if (p.id === currentUserId) {
                            return { ...p, friends: p.friends.filter(fId => fId !== friendId) };
                        }
                        return p;
                    })
                }));

                const user = get().players.find(p => p.id === currentUserId);
                if (user) {
                    await setDoc(doc(db, 'players', currentUserId), { friends: user.friends }, { merge: true });
                }
            },

            updateVisibility: async (id, visibility) => {
                set((state) => ({
                    players: state.players.map(p => p.id === id ? { ...p, visibility } : p)
                }));
                await setDoc(doc(db, 'players', id), { visibility }, { merge: true });
            },

            updateNickname: async (id, nickname) => {
                set((state) => ({
                    players: state.players.map(p => p.id === id ? { ...p, nickname } : p)
                }));
                await setDoc(doc(db, 'players', id), { nickname }, { merge: true });
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
