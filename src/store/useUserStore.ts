import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { collection, getDocs, deleteDoc, doc, setDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { Player, FriendRequest, FriendRequestStatus } from '../types';

interface UserStore {
    players: Player[];
    friendRequests: FriendRequest[];
    isLoading: boolean;
    fetchPlayers: () => Promise<void>;
    subscribeToFriendRequests: (userId: string) => () => void;
    addPlayer: (name: string, pinHash: string) => Promise<Player>;
    updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
    removePlayer: (id: string) => Promise<void>;
    sendFriendRequest: (fromUserId: string, toUserId: string) => Promise<void>;
    respondToFriendRequest: (requestId: string, status: FriendRequestStatus) => Promise<void>;
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
            friendRequests: [],
            isLoading: false,

            fetchPlayers: async () => {
                set({ isLoading: true });
                try {
                    const querySnapshot = await getDocs(collection(db, 'players'));
                    const loadedPlayers: Player[] = [];
                    querySnapshot.forEach((d) => {
                        const data = d.data();
                        const p = { id: d.id, ...data } as Player;
                        // Normalization: move legacy pin to pinHash if necessary
                        if (p.pin && !p.pinHash) {
                            p.pinHash = p.pin;
                        }
                        loadedPlayers.push(p);
                    });
                    set({ players: loadedPlayers, isLoading: false });
                } catch (err) {
                    console.error("Error fetching players:", err);
                    set({ isLoading: false });
                }
            },

            subscribeToFriendRequests: (userId: string) => {
                const q = query(
                    collection(db, 'friendRequests'),
                    where('toUserId', '==', userId),
                    where('status', '==', 'pending')
                );

                return onSnapshot(q, (snapshot) => {
                    const requests: FriendRequest[] = [];
                    snapshot.forEach((doc) => {
                        requests.push({ id: doc.id, ...doc.data() } as FriendRequest);
                    });
                    set({ friendRequests: requests });
                });
            },

            addPlayer: async (name, pinHash) => {
                const id = crypto.randomUUID();
                const now = Date.now();
                const newPlayer: Player = {
                    id,
                    name,
                    pinHash,
                    visibility: 'PUBLIC',
                    friends: [],
                    createdAt: now,
                    updatedAt: now,
                    lastActiveAt: now
                };

                // Optimistic local update
                set((state) => ({ players: [...state.players, newPlayer] }));

                try {
                    await setDoc(doc(db, 'players', id), {
                        name,
                        pinHash,
                        visibility: 'PUBLIC',
                        friends: [],
                        createdAt: now,
                        updatedAt: now,
                        lastActiveAt: now
                    });
                } catch (err) {
                    console.error("Error saving player to Firestore:", err);
                }
                return newPlayer;
            },

            updatePlayer: async (id, updates) => {
                const now = Date.now();
                set((state) => ({
                    players: state.players.map(p => p.id === id ? { ...p, ...updates, updatedAt: now } : p)
                }));
                try {
                    await setDoc(doc(db, 'players', id), { ...updates, updatedAt: now }, { merge: true });
                } catch (err) {
                    console.error("Error updating player in Firestore:", err);
                }
            },

            removePlayer: async (id) => {
                set((state) => ({ players: state.players.filter(p => p.id !== id) }));
                try {
                    await deleteDoc(doc(db, 'players', id));
                } catch (err) {
                    console.error("Error deleting player from Firestore:", err);
                }
            },

            sendFriendRequest: async (fromUserId, toUserId) => {
                const id = `${fromUserId}_${toUserId}`;
                const now = Date.now();
                const request: Omit<FriendRequest, 'id'> = {
                    fromUserId,
                    toUserId,
                    status: 'pending',
                    createdAt: now,
                    updatedAt: now
                };

                try {
                    await setDoc(doc(db, 'friendRequests', id), request);
                } catch (err) {
                    console.error("Error sending friend request:", err);
                }
            },

            respondToFriendRequest: async (requestId, status) => {
                const now = Date.now();
                try {
                    const requestRef = doc(db, 'friendRequests', requestId);
                    await setDoc(requestRef, { status, updatedAt: now }, { merge: true });

                    if (status === 'accepted') {
                        const [fromId, toId] = requestId.split('_');

                        // Update both players
                        const players = get().players;
                        const fromPlayer = players.find(p => p.id === fromId);
                        const toPlayer = players.find(p => p.id === toId);

                        if (fromPlayer && toPlayer) {
                            const newFromFriends = Array.from(new Set([...fromPlayer.friends, toId]));
                            const newToFriends = Array.from(new Set([...toPlayer.friends, fromId]));

                            await setDoc(doc(db, 'players', fromId), { friends: newFromFriends, updatedAt: now }, { merge: true });
                            await setDoc(doc(db, 'players', toId), { friends: newToFriends, updatedAt: now }, { merge: true });

                            // Update local state is handled by the regular fetch or we could do it here
                            set(state => ({
                                players: state.players.map(p => {
                                    if (p.id === fromId) return { ...p, friends: newFromFriends };
                                    if (p.id === toId) return { ...p, friends: newToFriends };
                                    return p;
                                })
                            }));
                        }
                    }
                } catch (err) {
                    console.error("Error responding to friend request:", err);
                }
            },

            removeFriend: async (currentUserId, friendId) => {
                const now = Date.now();
                set((state) => ({
                    players: state.players.map(p => {
                        if (p.id === currentUserId) {
                            return { ...p, friends: p.friends.filter(fId => fId !== friendId), updatedAt: now };
                        }
                        if (p.id === friendId) {
                            return { ...p, friends: p.friends.filter(fId => fId !== currentUserId), updatedAt: now };
                        }
                        return p;
                    })
                }));

                try {
                    const players = get().players;
                    const u1 = players.find(p => p.id === currentUserId);
                    const u2 = players.find(p => p.id === friendId);
                    if (u1) await setDoc(doc(db, 'players', currentUserId), { friends: u1.friends, updatedAt: now }, { merge: true });
                    if (u2) await setDoc(doc(db, 'players', friendId), { friends: u2.friends, updatedAt: now }, { merge: true });
                } catch (err) {
                    console.error("Error removing friend:", err);
                }
            },

            updateVisibility: async (id, visibility) => {
                const now = Date.now();
                set((state) => ({
                    players: state.players.map(p => p.id === id ? { ...p, visibility, updatedAt: now } : p)
                }));
                await setDoc(doc(db, 'players', id), { visibility, updatedAt: now }, { merge: true });
            },

            updateNickname: async (id, nickname) => {
                const now = Date.now();
                set((state) => ({
                    players: state.players.map(p => p.id === id ? { ...p, nickname, updatedAt: now } : p)
                }));
                await setDoc(doc(db, 'players', id), { nickname, updatedAt: now }, { merge: true });
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
