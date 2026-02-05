import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { useHistoryStore } from '../store/useHistoryStore';

interface HomeScreenProps {
    onNewMatch: () => void;
    onHistory: () => void;
    onStats: () => void;
    onLeaderboard: () => void;
    onLogout: () => void;
}

export const HomeScreen = ({ onNewMatch, onHistory, onStats, onLeaderboard, onLogout }: HomeScreenProps) => {
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
                <div className="flex items-center gap-2" onClick={onLogout}>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-xs font-bold border border-[var(--color-border)]">
                        {user?.name?.substring(0, 2).toUpperCase()}
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

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onHistory}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] py-4 rounded-lg font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                        HISTORIAL
                    </button>
                    <button
                        onClick={onStats}
                        className="bg-[var(--color-surface)] border border-[var(--color-border)] py-4 rounded-lg font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                        ESTADÍSTICAS
                    </button>
                </div>

                <button
                    onClick={onLeaderboard}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] py-4 rounded-lg font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                >
                    🏆 RANKING GLOBAL
                </button>
            </div>

            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-4 tracking-wider border-b border-[var(--color-border)] pb-2">
                Últimos partidos
            </h3>

            <div className="flex flex-col gap-2">
                {recentMatches.length === 0 && <p className="text-[var(--color-text-muted)]">No hay partidos recientes.</p>}

                {recentMatches.map(m => (
                    <div key={m.id} className="flex justify-between items-center bg-[var(--color-surface)] p-3 rounded border border-[var(--color-border)] opacity-80">
                        <div className="text-sm font-medium">
                            <span className="text-[var(--color-nosotros)]">Nosotros {m.teams.nosotros.score}</span>
                            <span className="mx-2 text-[var(--color-text-muted)]">—</span>
                            <span className="text-[var(--color-ellos)]">Ellos {m.teams.ellos.score}</span>
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                            {new Date(m.startDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
