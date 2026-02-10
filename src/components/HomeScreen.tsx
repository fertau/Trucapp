import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { useHistoryStore } from '../store/useHistoryStore';

interface HomeScreenProps {
    onNewMatch: () => void;
    onHistory: () => void;
    onLeaderboard: () => void;
    onSocial: () => void;
    onProfile: () => void;
}

export const HomeScreen = ({ onNewMatch, onHistory, onLeaderboard, onSocial, onProfile }: HomeScreenProps) => {
    const currentUserId = useAuthStore(state => state.currentUserId);
    const players = useUserStore(state => state.players);
    const matches = useHistoryStore(state => state.matches);

    // Recent matches (last 2)
    const recentMatches = matches.slice(0, 2);
    const user = players.find(p => p.id === currentUserId);

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black tracking-tighter">TRUCAPP</h1>
                <div className="flex items-center gap-2" onClick={onProfile}>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-xs font-bold border border-[var(--color-border)] cursor-pointer active:scale-95 transition-all">
                        {user?.avatar || user?.name?.substring(0, 2).toUpperCase()}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 mb-8">
                <button
                    onClick={onNewMatch}
                    className="bg-[var(--color-accent)] text-white py-5 rounded-lg font-bold text-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
                    style={{ fontFamily: "'Sora', sans-serif" }}
                >
                    NUEVO PARTIDO
                </button>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={onHistory}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] py-5 rounded-lg font-black text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] tracking-[0.2em] text-sm"
                    >
                        ESTADÍSTICAS
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onLeaderboard}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] py-4 rounded-lg font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                        🏆 RANKING
                    </button>
                    <button
                        onClick={onSocial}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] py-4 rounded-lg font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                        👥 SOCIAL
                    </button>
                </div>
            </div>

            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-4 tracking-wider border-b border-[var(--color-border)] pb-2">
                Últimos partidos
            </h3>

            <div className="flex flex-col gap-2">
                {recentMatches.length === 0 && <p className="text-[var(--color-text-muted)]">No hay partidos recientes.</p>}

                {recentMatches.map(m => {
                    const getPlayerNames = (playerIds: string[]) => {
                        return playerIds.map(id => players.find(p => p.id === id)?.name || '?').join(', ');
                    };

                    return (
                        <div key={m.id} className="flex justify-between items-start bg-[var(--color-surface)] p-4 rounded-[1.5rem] border border-[var(--color-border)] shadow-sm">
                            <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                                {/* Nosotros Team */}
                                <div className="flex justify-between items-start pr-4">
                                    <div className="flex flex-col gap-0.5 flex-1">
                                        <span className={`text-sm font-black uppercase truncate ${m.winner === 'nosotros' ? 'text-[var(--color-nosotros)]' : 'text-white/60'}`}>
                                            {m.teams.nosotros.name}
                                        </span>
                                        <span className="text-[10px] font-medium text-white/40 truncate">
                                            {getPlayerNames(m.teams.nosotros.players)}
                                        </span>
                                    </div>
                                    <span className={`text-lg font-black ml-2 ${m.winner === 'nosotros' ? 'text-[var(--color-nosotros)]' : 'text-white/40'}`}>
                                        {m.teams.nosotros.score}
                                    </span>
                                </div>

                                {/* Ellos Team */}
                                <div className="flex justify-between items-start pr-4">
                                    <div className="flex flex-col gap-0.5 flex-1">
                                        <span className={`text-sm font-black uppercase truncate ${m.winner === 'ellos' ? 'text-[var(--color-ellos)]' : 'text-white/60'}`}>
                                            {m.teams.ellos.name}
                                        </span>
                                        <span className="text-[10px] font-medium text-white/40 truncate">
                                            {getPlayerNames(m.teams.ellos.players)}
                                        </span>
                                    </div>
                                    <span className={`text-lg font-black ml-2 ${m.winner === 'ellos' ? 'text-[var(--color-ellos)]' : 'text-white/40'}`}>
                                        {m.teams.ellos.score}
                                    </span>
                                </div>
                            </div>
                            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest pl-2 border-l border-white/5">
                                {new Date(m.startDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
