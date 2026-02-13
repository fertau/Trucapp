import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { useMemo, useState } from 'react';
import { AvatarBadge } from './AvatarBadge';
import type { MatchState, TeamId } from '../types';
import { getMatchEffectiveDate, getTeamRefKey, getTeamRefLabel } from '../utils/matchIdentity';
import { formatDateDisplay, formatDateTimeDisplay } from '../utils/date';

interface HomeScreenProps {
    onNewMatch: () => void;
    onHistory: () => void;
    onProfile: () => void;
}

export const HomeScreen = ({ onNewMatch, onHistory, onProfile }: HomeScreenProps) => {
    const currentUserId = useAuthStore(state => state.currentUserId);
    const players = useUserStore(state => state.players);
    const matches = useHistoryStore(state => state.matches);
    const [tab, setTab] = useState<'PARTIDO' | 'HISTORIAL'>('PARTIDO');
    const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('trucapp-onboarding-v1'));
    const validFinishedMatches = useMemo(() => (
        matches.filter((m) => m.isFinished && (m.teams.nosotros.score + m.teams.ellos.score > 0))
    ), [matches]);

    const seriesSummary = useMemo(() => {
        const grouped = new Map<string, MatchState[]>();
        matches.forEach((m) => {
            const seriesId = m.series?.id;
            if (!seriesId) return;
            const arr = grouped.get(seriesId) ?? [];
            arr.push(m);
            grouped.set(seriesId, arr);
        });

        const summary = new Map<string, { winsNos: number; winsEll: number; targetWins: number; isFinished: boolean }>();
        grouped.forEach((arr, seriesId) => {
            const winsNos = arr.filter((m) => m.winner === 'nosotros').length;
            const winsEll = arr.filter((m) => m.winner === 'ellos').length;
            const targetWins = arr[0]?.series?.targetWins ?? 2;
            summary.set(seriesId, {
                winsNos,
                winsEll,
                targetWins,
                isFinished: winsNos >= targetWins || winsEll >= targetWins
            });
        });
        return summary;
    }, [matches]);

    const recentItems = useMemo(() => {
        const items: Array<{ key: string; type: 'MATCH' | 'SERIES'; match: MatchState }> = [];
        const seenSeries = new Set<string>();

        for (const match of validFinishedMatches) {
            const seriesId = match.series?.id;
            if (seriesId) {
                if (seenSeries.has(seriesId)) continue;
                seenSeries.add(seriesId);
                items.push({ key: `series-${seriesId}`, type: 'SERIES', match });
            } else {
                items.push({ key: `match-${match.id}`, type: 'MATCH', match });
            }
            if (items.length >= 2) break;
        }
        return items;
    }, [validFinishedMatches]);
    const user = players.find(p => p.id === currentUserId);

    const getTeamIdForUser = (match: MatchState, userId: string): TeamId | null => {
        if (match.teams.nosotros.players.includes(userId)) return 'nosotros';
        if (match.teams.ellos.players.includes(userId)) return 'ellos';
        return null;
    };

    const activeRivalry = useMemo(() => {
        if (!currentUserId) return null;
        const buckets = new Map<string, {
            mode: MatchState['mode'];
            label: string;
            count: number;
            wins: number;
            losses: number;
            lastPlayedAt: number;
            form: Array<'G' | 'P'>;
        }>();

        const mine = validFinishedMatches.filter((m) => getTeamIdForUser(m, currentUserId) !== null);
        const sorted = [...mine].sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a));

        sorted.forEach((m) => {
            const mySide = getTeamIdForUser(m, currentUserId);
            if (!mySide) return;
            const oppSide: TeamId = mySide === 'nosotros' ? 'ellos' : 'nosotros';
            const key = `${m.mode}:${getTeamRefKey(m, mySide)}:${getTeamRefKey(m, oppSide)}`;
            const label = m.mode === '1v1'
                ? `1v1 vs ${m.teams[oppSide].players.map((id) => players.find((p) => p.id === id)?.name ?? id).join(' / ')}`
                : `${m.mode} · ${getTeamRefLabel(m, mySide)} vs ${getTeamRefLabel(m, oppSide)}`;
            const prev = buckets.get(key) ?? {
                mode: m.mode,
                label,
                count: 0,
                wins: 0,
                losses: 0,
                lastPlayedAt: 0,
                form: []
            };
            const result: 'G' | 'P' = m.winner === mySide ? 'G' : 'P';
            const cappedForm = prev.form.length < 10 ? [...prev.form, result] : prev.form;
            buckets.set(key, {
                mode: m.mode,
                label,
                count: prev.count + 1,
                wins: prev.wins + (result === 'G' ? 1 : 0),
                losses: prev.losses + (result === 'P' ? 1 : 0),
                lastPlayedAt: Math.max(prev.lastPlayedAt, getMatchEffectiveDate(m)),
                form: cappedForm
            });
        });

        const ranked = Array.from(buckets.values())
            .filter((x) => x.count >= 3)
            .sort((a, b) => b.count - a.count || b.lastPlayedAt - a.lastPlayedAt);
        return ranked[0] ?? null;
    }, [validFinishedMatches, currentUserId, players]);

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

            <div className="flex-1 overflow-y-auto pb-36 scroll-safe pr-2">
                {tab === 'PARTIDO' && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
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
                                    <div>2. Durante el juego, usá <span className="font-black">+1</span> y abrí atajos solo cuando los necesites.</div>
                                    <div>3. En <span className="font-black">Estadísticas</span>, guardá filtros y seguí tus clásicos.</div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onNewMatch}
                            className="bg-[var(--color-accent)] text-white py-5 rounded-lg font-bold text-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
                        >
                            NUEVO PARTIDO
                        </button>

                        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mt-1 tracking-wider border-b border-[var(--color-border)] pb-2">
                            Últimos partidos
                        </h3>

                        {activeRivalry && (
                            <button
                                onClick={onHistory}
                                className="w-full text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl px-4 py-4 relative overflow-hidden"
                            >
                                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(74,222,128,0.14),transparent_44%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.04),transparent_40%)]" />
                                <div className="relative">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">Rivalidad activa</div>
                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/75">
                                        {activeRivalry.mode}
                                    </span>
                                </div>
                                <div className="text-[32px] font-black leading-none mt-2 tabular-nums">
                                    {activeRivalry.count} <span className="text-[15px] font-bold text-white/65">PJ</span>
                                </div>
                                <div className="text-sm font-black leading-tight mt-1">{activeRivalry.label.replace(`${activeRivalry.mode} · `, '')}</div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-black mt-3 text-center">Ultimos 10</div>
                                <div className="mt-2 grid grid-cols-10 gap-2 w-full">
                                    {Array.from({ length: 10 }).map((_, idx) => {
                                        const item = activeRivalry.form[idx];
                                        const cls = item === 'G'
                                            ? 'bg-[var(--color-nosotros)] border-[var(--color-nosotros)]/90 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                                            : item === 'P'
                                                ? 'bg-[var(--color-danger)] border-[var(--color-danger)]/90 shadow-[0_0_10px_rgba(255,69,58,0.35)]'
                                                : 'bg-white/5 border-white/15';
                                        return (
                                            <span
                                                key={`home-form-slot-${idx}`}
                                                className={`w-full aspect-square rounded-full border ${cls}`}
                                                title={item ? `Partido ${idx + 1}: ${item}` : `Partido ${idx + 1}: sin dato`}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="w-full h-px bg-white/10 my-3" />
                                <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                                    <div className="h-3 w-full flex">
                                        <div
                                            className="h-full bg-[var(--color-nosotros)]"
                                            style={{ width: `${activeRivalry.count ? (activeRivalry.wins / activeRivalry.count) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="h-full bg-[var(--color-danger)]"
                                            style={{ width: `${activeRivalry.count ? (activeRivalry.losses / activeRivalry.count) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-between text-[11px] font-black">
                                        <span className="text-[var(--color-nosotros)]">
                                            G {activeRivalry.wins} ({activeRivalry.count ? Math.round((activeRivalry.wins / activeRivalry.count) * 100) : 0}%)
                                        </span>
                                        <span className="text-[var(--color-danger)]">
                                            P {activeRivalry.losses} ({activeRivalry.count ? Math.round((activeRivalry.losses / activeRivalry.count) * 100) : 0}%)
                                        </span>
                                    </div>
                                </div>
                                </div>
                            </button>
                        )}

                        <div className="flex flex-col gap-2">
                            {recentItems.length === 0 && <p className="text-[var(--color-text-muted)]">No hay partidos recientes.</p>}

                            {recentItems.map((item) => {
                                const m = item.match;
                                const getPlayerNames = (playerIds: string[]) => {
                                    return playerIds.map(id => players.find(p => p.id === id)?.name || '?').join(', ');
                                };
                                const dateText = formatDateDisplay(getMatchEffectiveDate(m));
                                const location = (m.metadata?.location || '').trim() || 'Sin sede';
                                const seriesInfo = m.series?.id ? seriesSummary.get(m.series.id) : null;
                                const boText = m.series ? `BO${(m.series.targetWins * 2) - 1}` : '';

                                return (
                                    <div key={item.key} className="bg-[var(--color-surface)] px-4 py-3 rounded-[1.25rem] border border-[var(--color-border)] shadow-sm">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-white/45">{dateText}</div>
                                                <div className="text-[11px] text-white/55 truncate">{location}</div>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide bg-white/8 border border-white/10 text-white/70">
                                                    {m.mode}
                                                </span>
                                                {item.type === 'SERIES' && seriesInfo && (
                                                    <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-[var(--color-accent)]">
                                                        Serie {boText}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {item.type === 'SERIES' && seriesInfo ? (
                                            <>
                                                <div className="text-base font-black leading-tight">
                                                    {m.teams.nosotros.name} {seriesInfo.winsNos} - {seriesInfo.winsEll} {m.teams.ellos.name}
                                                </div>
                                                <div className="text-[10px] font-black uppercase tracking-widest mt-1 text-white/45">
                                                    {seriesInfo.isFinished ? 'Serie cerrada' : 'Serie en curso'}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                        <span className={`text-sm font-black uppercase truncate ${m.winner === 'nosotros' ? 'text-[var(--color-nosotros)]' : 'text-white/65'}`}>
                                                            {m.teams.nosotros.name}
                                                        </span>
                                                        {m.mode !== '1v1' && (
                                                            <span className="text-[10px] font-medium text-white/40 truncate">
                                                                {getPlayerNames(m.teams.nosotros.players)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-xl font-black ml-2 ${m.winner === 'nosotros' ? 'text-[var(--color-nosotros)]' : 'text-white/45'}`}>
                                                        {m.teams.nosotros.score}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                                        <span className={`text-sm font-black uppercase truncate ${m.winner === 'ellos' ? 'text-[var(--color-ellos)]' : 'text-white/65'}`}>
                                                            {m.teams.ellos.name}
                                                        </span>
                                                        {m.mode !== '1v1' && (
                                                            <span className="text-[10px] font-medium text-white/40 truncate">
                                                                {getPlayerNames(m.teams.ellos.players)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-xl font-black ml-2 ${m.winner === 'ellos' ? 'text-[var(--color-ellos)]' : 'text-white/45'}`}>
                                                        {m.teams.ellos.score}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mt-2 tracking-wider border-b border-[var(--color-border)] pb-2">
                            Novedades
                        </h3>
                        <div className="flex flex-col gap-2">
                            {validFinishedMatches.slice(0, 3).map((m) => {
                                const wasEdited = Boolean(m.editedFlags?.resultEdited);
                                return (
                                    <div key={`news-${m.id}`} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-2.5">
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
                                className={`min-h-11 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${tab === item.id
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
        </div>
    );
};
