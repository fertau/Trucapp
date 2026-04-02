import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useMemo, useState } from 'react';
import { AvatarBadge } from './AvatarBadge';
import type { MatchState } from '../types';
import { getMatchEffectiveDate } from '../utils/matchIdentity';
import { formatDateTimeDisplay } from '../utils/date';
import { getActiveRivalry, getRivalryProfile, getGroupLeaderboard } from '../services/rivalryService';
import { RivalryCard } from './RivalryCard';

interface HomeScreenProps {
    onNewMatch: () => void;
    onQuickScore: () => void;
    onHistory: () => void;
    onProfile: () => void;
}

export const HomeScreen = ({ onNewMatch, onQuickScore, onHistory, onProfile }: HomeScreenProps) => {
    const currentUserId = useAuthStore(state => state.currentUserId);
    const players = useUserStore(state => state.players);
    const matches = useHistoryStore(state => state.matches);
    const isHistoryLoading = useHistoryStore(state => state.isLoading);
    const [tab, setTab] = useState<'PARTIDO' | 'HISTORIAL'>('PARTIDO');
    const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('trucapp-onboarding-v1'));
    const [showRivalryCard, setShowRivalryCard] = useState(false);
    const showHomeSkeleton = isHistoryLoading && matches.length === 0;
    const visibleMatches = useMemo(() => {
        if (!currentUserId) return [] as MatchState[];
        return matches.filter((m) =>
            m.teams.nosotros.players.includes(currentUserId) ||
            m.teams.ellos.players.includes(currentUserId)
        );
    }, [matches, currentUserId]);

    const validFinishedMatches = useMemo(() => (
        visibleMatches.filter((m) => m.isFinished && (m.teams.nosotros.score + m.teams.ellos.score > 0))
    ), [visibleMatches]);

    const user = players.find(p => p.id === currentUserId);

    const activeRivalry = useMemo(() => {
        if (!currentUserId) return null;
        return getActiveRivalry(currentUserId, matches, players);
    }, [matches, currentUserId, players]);

    const leaderboard = useMemo(() => {
        return getGroupLeaderboard(validFinishedMatches);
    }, [validFinishedMatches]);

    const fullRivalryProfile = useMemo(() => {
        if (!activeRivalry || !currentUserId) return null;
        return getRivalryProfile(currentUserId, matches, players, activeRivalry.key);
    }, [activeRivalry, currentUserId, matches, players]);

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-5" style={{ paddingTop: 'max(20px, env(safe-area-inset-top))' }}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black tracking-tighter">TRUCAPP</h1>
                <div className="flex items-center gap-2" onClick={onProfile}>
                    <div className="cursor-pointer active:scale-95 transition-all">
                        <AvatarBadge avatar={user?.avatar} name={user?.nickname || user?.name} size={34} />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-36 scroll-safe custom-scrollbar pr-2">
                {tab === 'PARTIDO' && (
                    <div className="flex flex-col gap-4 tab-content-enter">
                        {showHomeSkeleton && (
                            <div className="flex flex-col gap-3">
                                <div className="h-14 skeleton-block rounded-2xl" />
                                <div className="h-56 skeleton-block rounded-3xl" />
                                <div className="h-36 skeleton-block rounded-3xl" />
                                <div className="h-24 skeleton-block rounded-2xl" />
                            </div>
                        )}

                        {!showHomeSkeleton && (
                            <>
                        {showOnboarding && (
                            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Guía rápida</div>
                                    <button
                                        onClick={() => {
                                            localStorage.setItem('trucapp-onboarding-v1', 'seen');
                                            setShowOnboarding(false);
                                        }}
                                        className="text-[10px] font-black uppercase tracking-wider text-white/60"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                                <div className="text-[11px] text-white/70 space-y-1">
                                    <div>1. Tocá <span className="font-black">Nuevo Partido</span> para arrancar.</div>
                                    <div>2. Durante el juego, usá los <span className="font-black">atajos</span> para sumar puntos rápido.</div>
                                    <div>3. En <span className="font-black">Estadísticas</span>, guardá filtros y seguí tus clásicos.</div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onNewMatch}
                            className="bg-[var(--color-accent)] text-white py-5 rounded-lg font-bold text-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all card-smooth"
                        >
                            NUEVO PARTIDO
                        </button>
                        <button
                            onClick={onQuickScore}
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] text-white py-3 rounded-lg font-black text-sm uppercase tracking-widest active:scale-[0.98] transition-all card-smooth"
                        >
                            ANOTADOR DIRECTO
                        </button>

                        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mt-1 tracking-wider border-b border-[var(--color-border)] pb-2">
                            Últimos partidos
                        </h3>

                        {activeRivalry && (
                            <button
                                onClick={() => setShowRivalryCard(true)}
                                className="w-full text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl px-4 py-4 relative overflow-hidden card-smooth"
                            >
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(74,222,128,0.14),transparent_44%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.04),transparent_40%)]" />
                                <div className="relative">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Rivalidad activa</div>
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/75">
                                        {activeRivalry.mode}
                                    </span>
                                </div>
                                <div className="text-sm font-black leading-tight mt-2">{activeRivalry.label.replace(`${activeRivalry.mode} · `, '')}</div>
                                <div className="text-[22px] font-black leading-none mt-1 tabular-nums">
                                    {activeRivalry.seriesTotal} <span className="text-[14px] text-white/65">series</span> <span className="text-[13px] text-white/50">({activeRivalry.matchCount} PJ)</span>
                                </div>
                                <div className="w-full h-px bg-white/10 my-3" />
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-black mb-2">Series ganadas</div>
                                <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden mb-2">
                                    <div className="h-3 w-full flex">
                                        <div
                                            className="h-full bg-[var(--color-nosotros)]"
                                            style={{ width: `${activeRivalry.seriesTotal ? (activeRivalry.seriesWins / activeRivalry.seriesTotal) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="h-full bg-[var(--color-danger)]"
                                            style={{ width: `${activeRivalry.seriesTotal ? (activeRivalry.seriesLosses / activeRivalry.seriesTotal) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-between text-[11px] font-black">
                                        <span className="text-[var(--color-nosotros)]">{activeRivalry.seriesWins}</span>
                                        <span className="text-[var(--color-danger)]">{activeRivalry.seriesLosses}</span>
                                    </div>
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-black text-center">Forma de series</div>
                                <div className="mt-2 grid grid-cols-10 gap-2 w-full mb-3">
                                    {Array.from({ length: 10 }).map((_, idx) => {
                                        const item = activeRivalry.seriesForm[idx];
                                        const cls = item === 'G'
                                            ? 'bg-[var(--color-nosotros)] border-[var(--color-nosotros)]/90 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                                            : item === 'P'
                                                ? 'bg-[var(--color-danger)] border-[var(--color-danger)]/90 shadow-[0_0_10px_rgba(255,69,58,0.35)]'
                                                : 'bg-white/5 border-white/15';
                                        return (
                                            <span
                                                key={`home-series-form-slot-${idx}`}
                                                className={`w-full aspect-square rounded-full border ${cls}`}
                                                title={item ? `Serie ${idx + 1}: ${item}` : `Serie ${idx + 1}: sin dato`}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-black mb-2">Partidos jugados</div>
                                <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                                    <div className="h-3 w-full flex">
                                        <div
                                            className="h-full bg-[var(--color-nosotros)]"
                                            style={{ width: `${activeRivalry.matchCount ? (activeRivalry.matchWins / activeRivalry.matchCount) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="h-full bg-[var(--color-danger)]"
                                            style={{ width: `${activeRivalry.matchCount ? (activeRivalry.matchLosses / activeRivalry.matchCount) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-between text-[11px] font-black">
                                        <span className="text-[var(--color-nosotros)]">
                                            G {activeRivalry.matchWins} ({activeRivalry.matchCount ? Math.round((activeRivalry.matchWins / activeRivalry.matchCount) * 100) : 0}%)
                                        </span>
                                        <span className="text-[var(--color-danger)]">
                                            P {activeRivalry.matchLosses} ({activeRivalry.matchCount ? Math.round((activeRivalry.matchLosses / activeRivalry.matchCount) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>
                                </div>
                            </button>
                        )}

                        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mt-2 tracking-wider border-b border-[var(--color-border)] pb-2">
                            Novedades
                        </h3>
                        <div className="flex flex-col gap-2">
                            {validFinishedMatches.slice(0, 3).map((m) => {
                                const wasEdited = Boolean(m.editedFlags?.resultEdited);
                                return (
                                    <div key={`news-${m.id}`} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5 card-smooth">
                                        {wasEdited && (
                                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-black">
                                                Resultado editado
                                            </div>
                                        )}
                                        <div className="text-sm font-black mt-1">
                                            {m.teams.nosotros.name} {m.teams.nosotros.score} - {m.teams.ellos.score} {m.teams.ellos.name}
                                        </div>
                                        <div className="text-[11px] text-white/45 mt-1">
                                            {formatDateTimeDisplay(getMatchEffectiveDate(m))}
                                        </div>
                                    </div>
                                );
                            })}
                            {validFinishedMatches.length === 0 && <p className="text-[var(--color-text-muted)]">Sin novedades todavía.</p>}
                        </div>

                        {leaderboard.length >= 2 && (
                            <>
                                <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mt-2 tracking-wider border-b border-[var(--color-border)] pb-2">
                                    Tabla de posiciones
                                </h3>
                                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden card-smooth">
                                    {leaderboard.slice(0, 6).map((entry, idx) => {
                                        const player = players.find(p => p.id === entry.playerId);
                                        const name = player?.nickname || player?.name || entry.playerId.slice(0, 8);
                                        const isCurrentUser = entry.playerId === currentUserId;
                                        return (
                                            <div
                                                key={entry.playerId}
                                                className={`flex items-center px-4 py-2.5 gap-3 ${idx > 0 ? 'border-t border-[var(--color-border)]' : ''} ${isCurrentUser ? 'bg-[var(--color-accent)]/5' : ''}`}
                                            >
                                                <span className="text-[11px] font-black text-white/40 w-5 text-center">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <span className={`text-sm font-bold truncate block ${isCurrentUser ? 'text-[var(--color-accent)]' : ''}`}>{name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-sm font-black tabular-nums">{Math.round(entry.winRate * 100)}%</span>
                                                    <span className="text-[10px] text-white/40 ml-1">({entry.wins}G {entry.losses}P)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                            </>
                        )}
                    </div>
                )}

                {tab === 'HISTORIAL' && <div className="hidden" />}
            </div>

            <nav
                className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-[0_-12px_30px_rgba(0,0,0,0.45)]"
                style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
            >
                <div className="max-w-md mx-auto px-4 pt-3">
                    <div className="grid grid-cols-2 gap-2 bg-black/20 border border-white/10 rounded-2xl p-1.5">
                        {([
                            { id: 'PARTIDO', label: 'Partido' },
                            { id: 'HISTORIAL', label: 'Estadísticas' },
                        ] as const).map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setTab(item.id);
                                    if (item.id === 'HISTORIAL') onHistory();
                                }}
                                className={`min-h-11 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all card-smooth ${tab === item.id
                                    ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]'
                                    : 'bg-white/5 text-white/55 border-white/10'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>
            {showRivalryCard && fullRivalryProfile && (
                <RivalryCard
                    rivalry={fullRivalryProfile}
                    players={players}
                    onClose={() => setShowRivalryCard(false)}
                />
            )}
        </div>
    );
};
