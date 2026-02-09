import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './useUserStore';

interface AuthStore {
    rememberedIds: string[];
    currentUserId: string | null;
    login: (id: string, pin?: string) => boolean; // Returns success
    logout: () => void;
    addRememberedAccount: (id: string) => void;
    removeRememberedAccount: (id: string) => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            rememberedIds: [],
            currentUserId: null,

            login: (id, pinInput) => {
                const user = useUserStore.getState().players.find(p => p.id === id);
                if (!user) return false;

                // Simple PIN check (simulated hashing for now)
                // In a real app, we'd hash pinInput and compare with user.pinHash
                const storedPin = user.pinHash || user.pin;
                const isMatch = storedPin === pinInput || storedPin === `hash_${pinInput}`;

                if (!isMatch) {
                    return false;
                }

                set({ currentUserId: id });

                // Auto-remember on login if not already
                const alreadyRemembered = get().rememberedIds.includes(id);
                if (!alreadyRemembered) {
                    set((state) => ({ rememberedIds: [...state.rememberedIds, id] }));
                }

                return true;
            },

            logout: () => set({ currentUserId: null }),

            addRememberedAccount: (id) => {
                if (!get().rememberedIds.includes(id)) {
                    set((state) => ({ rememberedIds: [...state.rememberedIds, id] }));
                }
            },

            removeRememberedAccount: (id) => {
                set((state) => ({ rememberedIds: state.rememberedIds.filter(rid => rid !== id) }));
                if (get().currentUserId === id) {
                    set({ currentUserId: null });
                }
            }
        }),
        {
            name: 'trucapp-auth',
        }
    )
);
