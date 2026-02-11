import type { Player } from '../types';

export const isSuperAdmin = (user?: Player | null): boolean => {
    if (!user) return false;

    const envId = (import.meta.env.VITE_SUPERADMIN_USER_ID as string | undefined)?.trim();
    if (envId && user.id === envId) return true;

    return user.name.trim().toLowerCase() === 'fer';
};
