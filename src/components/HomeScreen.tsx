import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useState } from 'react';

interface HomeScreenProps {
    onNewMatch: () => void;
    onHistory: () => void;
    onUpdates: () => void;
    onProfile: () => void;
}

export const HomeScreen = ({ onNewMatch, onHistory, onUpdates, onProfile }: HomeScreenProps) => {
    const currentUserId = useAuthStore(state => state.currentUserId);
    const players = useUserStore(state => state.players);
    const matches = useHistoryStore(state => state.matches);
    const [tab, setTab] = useState<'PARTIDO' | 'HISTORIAL' | 'PERFIL'>('PARTIDO');

    // Recent matches (last 2)
    const recentMatches = matches.slice(0, 2);
    const user = players.find(p => p.id === currentUserId);

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-6" style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-black tracking-tighter">TRUCAPP</h1>
                <div className="flex items-center gap-2" onClick={onProfile}>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-xs font-bold border border-[var(--color-border)] cursor-pointer active:scale-95 transition-all">
                        {user?.avatar || user?.name?.substring(0, 2).toUpperCase()}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-28">
                {tab === 'PARTIDO' && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
                        <button
                            onClick={onNewMatch}
                            className="bg-[var(--color-accent)] text-white py-5 rounded-lg font-bold text-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
                            style={{ fontFamily: "'Sora', sans-serif" }}
                        >
                            NUEVO PARTIDO
                        </button>

                        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mt-2 tracking-wider border-b border-[var(--color-border)] pb-2">
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
                )}

                {tab === 'HISTORIAL' && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
                        <button
                            onClick={onHistory}
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] py-5 rounded-lg font-black text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] tracking-[0.2em] text-sm"
                        >
                            HISTORIALES
                        </button>
                        <button
                            onClick={onUpdates}
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] py-4 rounded-lg font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                        >
                            NOVEDADES
                        </button>
                    </div>
                )}

                {tab === 'PERFIL' && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                            <div className="text-xs text-white/40 uppercase tracking-widest font-black mb-3">Cuenta</div>
                            <div className="text-lg font-black">{user?.nickname || user?.name || 'Jugador'}</div>
                            <div className="text-sm text-white/50 mt-1">Gestioná perfil, social y seguridad.</div>
                        </div>
                        <button
                            onClick={onProfile}
                            className="bg-[var(--color-accent)] text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest"
                        >
                            Abrir Perfil
                        </button>
                    </div>
                )}
            </div>

            <div
                className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg)]/95 backdrop-blur border-t border-[var(--color-border)] px-4 py-3"
                style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
                <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
                    {([
                        { id: 'PARTIDO', label: 'Partido' },
                        { id: 'HISTORIAL', label: 'Historial' },
                        { id: 'PERFIL', label: 'Perfil' }
                    ] as const).map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id)}
                            className={`min-h-11 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${tab === item.id
                                ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]'
                                : 'bg-white/5 text-white/50 border-white/10'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
