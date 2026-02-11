import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistoryStore } from '../store/useHistoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import type { MatchMode, MatchState, TeamId } from '../types';

interface HistoryScreenProps {
    onBack: () => void;
    initialTab?: HistoryTab;
}

type HistoryTab = 'SUMMARY' | 'MATCHES' | 'H2H' | 'RANKING';
type FilterMode = 'ALL' | MatchMode;
type Scope = 'MINE' | 'GLOBAL';
type ResultFilter = 'ALL' | 'W' | 'L';
type RankingType = 'PLAYERS' | 'PAIRS';

const MODES: FilterMode[] = ['ALL', '1v1', '2v2', '3v3'];

const getTeamIdForUser = (match: MatchState, userId: string): TeamId | null => {
    if (match.teams.nosotros.players.includes(userId)) return 'nosotros';
    if (match.teams.ellos.players.includes(userId)) return 'ellos';
    return null;
};

const getOppositeTeam = (team: TeamId): TeamId => (team === 'nosotros' ? 'ellos' : 'nosotros');
const getGroupKey = (playerIds: string[]): string => [...playerIds].sort().join('|');

export const HistoryScreen = ({ onBack, initialTab = 'SUMMARY' }: HistoryScreenProps) => {
    const matches = useHistoryStore(state => state.matches);
    const currentUserId = useAuthStore(state => state.currentUserId);
    const players = useUserStore(state => state.players);

    const [tab, setTab] = useState<HistoryTab>(initialTab);
    const [scope, setScope] = useState<Scope>('MINE');
    const [mode, setMode] = useState<FilterMode>('ALL');
    const [result, setResult] = useState<ResultFilter>('ALL');
    const [opponentId, setOpponentId] = useState<string>('ALL');
    const [opponentGroupKey, setOpponentGroupKey] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [rankingType, setRankingType] = useState<RankingType>('PLAYERS');

    useEffect(() => {
        setTab(initialTab);
    }, [initialTab]);

    const getPlayerName = useCallback((id: string): string => {
        const player = players.find((p) => p.id === id);
        return player?.nickname || player?.name || id;
    }, [players]);

    const scopeMatches = useMemo(() => {
        if (!currentUserId || scope === 'GLOBAL') return matches;
        return matches.filter((m) => getTeamIdForUser(m, currentUserId) !== null);
    }, [matches, currentUserId, scope]);

    const modeMatches = useMemo(() => {
        if (mode === 'ALL') return scopeMatches;
        return scopeMatches.filter((m) => m.mode === mode);
    }, [scopeMatches, mode]);

    const availableOpponents = useMemo(() => {
        const ids = new Set<string>();
        modeMatches.forEach((m) => {
            m.teams.nosotros.players.forEach((id) => ids.add(id));
            m.teams.ellos.players.forEach((id) => ids.add(id));
        });
        if (currentUserId) ids.delete(currentUserId);
        return Array.from(ids)
            .map((id) => ({ id, name: getPlayerName(id) }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [modeMatches, currentUserId, getPlayerName]);

    const availableOpponentGroups = useMemo(() => {
        if (!currentUserId) return [];
        const keys = new Map<string, string>();

        modeMatches.forEach((m) => {
            const userTeam = getTeamIdForUser(m, currentUserId);
            if (!userTeam) return;
            const opponentTeam = m.teams[getOppositeTeam(userTeam)];
            const key = getGroupKey(opponentTeam.players);
            if (!keys.has(key)) {
                keys.set(key, opponentTeam.players.map((id) => getPlayerName(id)).join(' + '));
            }
        });

        return Array.from(keys.entries()).map(([id, label]) => ({ id, label }));
    }, [modeMatches, currentUserId, getPlayerName]);

    const filteredMatches = useMemo(() => {
        const text = search.trim().toLowerCase();

        return modeMatches.filter((m) => {
            const userTeam = currentUserId ? getTeamIdForUser(m, currentUserId) : null;

            if (opponentId !== 'ALL') {
                if (scope === 'MINE' && currentUserId) {
                    const selectedInNos = m.teams.nosotros.players.includes(opponentId);
                    const selectedInEll = m.teams.ellos.players.includes(opponentId);
                    if (!selectedInNos && !selectedInEll) return false;
                    if (!userTeam) return false;
                    const sameSide = (userTeam === 'nosotros' && selectedInNos) || (userTeam === 'ellos' && selectedInEll);
                    if (sameSide) return false;
                } else {
                    const hasSelected = m.teams.nosotros.players.includes(opponentId) || m.teams.ellos.players.includes(opponentId);
                    if (!hasSelected) return false;
                }
            }

            if (opponentGroupKey !== 'ALL' && currentUserId) {
                if (!userTeam) return false;
                const opponentTeam = m.teams[getOppositeTeam(userTeam)];
                if (getGroupKey(opponentTeam.players) !== opponentGroupKey) return false;
            }

            if (result !== 'ALL' && currentUserId) {
                if (!userTeam || !m.winner) return false;
                const isWin = m.winner === userTeam;
                if ((result === 'W' && !isWin) || (result === 'L' && isWin)) return false;
            }

            if (text) {
                const names = [...m.teams.nosotros.players, ...m.teams.ellos.players]
                    .map((id) => getPlayerName(id).toLowerCase())
                    .join(' ');
                const haystack = `${m.teams.nosotros.name} ${m.teams.ellos.name} ${m.metadata?.location ?? ''} ${names}`.toLowerCase();
                if (!haystack.includes(text)) return false;
            }

            return true;
        });
    }, [modeMatches, currentUserId, opponentId, opponentGroupKey, result, scope, search, getPlayerName]);

    const myModeMatches = useMemo(() => {
        if (!currentUserId) return [];
        const mine = matches.filter((m) => getTeamIdForUser(m, currentUserId) !== null);
        if (mode === 'ALL') return mine;
        return mine.filter((m) => m.mode === mode);
    }, [matches, currentUserId, mode]);

    const summary = useMemo(() => {
        if (!currentUserId) return { total: 0, wins: 0, losses: 0, winRate: 0, pointsDiff: 0, streak: [] as ('W' | 'L')[] };

        const streak = myModeMatches.slice(0, 8).map((m) => {
            const team = getTeamIdForUser(m, currentUserId);
            if (!team || !m.winner) return 'L';
            return m.winner === team ? 'W' : 'L';
        });

        let wins = 0;
        let pointsDiff = 0;
        myModeMatches.forEach((m) => {
            const team = getTeamIdForUser(m, currentUserId);
            if (!team) return;
            const opponent = getOppositeTeam(team);
            if (m.winner === team) wins++;
            pointsDiff += m.teams[team].score - m.teams[opponent].score;
        });

        const total = myModeMatches.length;
        return {
            total,
            wins,
            losses: total - wins,
            winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
            pointsDiff,
            streak
        };
    }, [myModeMatches, currentUserId]);

    const rankings = useMemo(() => {
        const source = mode === 'ALL' ? scopeMatches : scopeMatches.filter((m) => m.mode === mode);

        if (rankingType === 'PLAYERS') {
            const stats: Record<string, { wins: number; total: number }> = {};
            source.forEach((m) => {
                if (!m.winner) return;
                m.teams.nosotros.players.forEach((id) => {
                    stats[id] = stats[id] ?? { wins: 0, total: 0 };
                    stats[id].total += 1;
                    if (m.winner === 'nosotros') stats[id].wins += 1;
                });
                m.teams.ellos.players.forEach((id) => {
                    stats[id] = stats[id] ?? { wins: 0, total: 0 };
                    stats[id].total += 1;
                    if (m.winner === 'ellos') stats[id].wins += 1;
                });
            });

            return Object.entries(stats)
                .map(([id, s]) => ({
                    id,
                    label: getPlayerName(id),
                    total: s.total,
                    wins: s.wins,
                    winRate: s.total ? Math.round((s.wins / s.total) * 100) : 0
                }))
                .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
        }

        const pairStats: Record<string, { wins: number; total: number; label: string }> = {};
        source.forEach((m) => {
            if (!m.winner) return;
            if (m.pairs?.nosotros) {
                const id = m.pairs.nosotros;
                pairStats[id] = pairStats[id] ?? { wins: 0, total: 0, label: m.teams.nosotros.name };
                pairStats[id].total += 1;
                if (m.winner === 'nosotros') pairStats[id].wins += 1;
            }
            if (m.pairs?.ellos) {
                const id = m.pairs.ellos;
                pairStats[id] = pairStats[id] ?? { wins: 0, total: 0, label: m.teams.ellos.name };
                pairStats[id].total += 1;
                if (m.winner === 'ellos') pairStats[id].wins += 1;
            }
        });

        return Object.entries(pairStats)
            .map(([id, s]) => ({
                id,
                label: s.label,
                total: s.total,
                wins: s.wins,
                winRate: s.total ? Math.round((s.wins / s.total) * 100) : 0
            }))
            .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
    }, [scopeMatches, mode, rankingType, getPlayerName]);

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-[0.3em] bg-white/5 py-2 px-4 rounded-full active:scale-95 transition-all">
                    ← VOLVER
                </button>
                <div className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent)]/20">
                    Historial & Stats
                </div>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                {(['SUMMARY', 'MATCHES', 'H2H', 'RANKING'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${tab === t ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'}`}
                    >
                        {t === 'SUMMARY' ? 'Resumen' : t === 'MATCHES' ? 'Partidos' : t === 'H2H' ? 'Enfrentamientos' : 'Ranking'}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                {(['MINE', 'GLOBAL'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setScope(s)}
                        className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${scope === s ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]' : 'bg-white/5 text-white/50 border-white/10'}`}
                    >
                        {s === 'MINE' ? 'Mis datos' : 'Global'}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                {MODES.map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${mode === m ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar pr-1">
                {tab === 'SUMMARY' && (
                    <div className="flex flex-col gap-4">
                        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6">
                            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-3">Resumen del jugador</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/40">PJ</div><div className="text-2xl font-black">{summary.total}</div></div>
                                <div className="bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/40">Winrate</div><div className="text-2xl font-black">{summary.winRate}%</div></div>
                                <div className="bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/40">PG / PP</div><div className="text-2xl font-black">{summary.wins} / {summary.losses}</div></div>
                                <div className="bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/40">Dif. puntos</div><div className="text-2xl font-black">{summary.pointsDiff >= 0 ? `+${summary.pointsDiff}` : summary.pointsDiff}</div></div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6">
                            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-3">Racha reciente</div>
                            <div className="flex gap-2">
                                {summary.streak.length === 0 && <span className="text-white/30 text-sm">Sin datos</span>}
                                {summary.streak.map((r, i) => (
                                    <span key={`${r}-${i}`} className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${r === 'W' ? 'bg-[var(--color-nosotros)]/20 text-[var(--color-nosotros)]' : 'bg-[var(--color-ellos)]/20 text-[var(--color-ellos)]'}`}>
                                        {r}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'MATCHES' && (
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por jugador, equipo o sede..."
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm outline-none"
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold">
                                <option value="ALL">Todos los rivales</option>
                                {availableOpponents.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>

                            <select value={result} onChange={(e) => setResult(e.target.value as ResultFilter)} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold">
                                <option value="ALL">Todos los resultados</option>
                                <option value="W">Ganados</option>
                                <option value="L">Perdidos</option>
                            </select>
                        </div>

                        {(mode === '2v2' || mode === '3v3') && scope === 'MINE' && (
                            <select value={opponentGroupKey} onChange={(e) => setOpponentGroupKey(e.target.value)} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold">
                                <option value="ALL">Todos los equipos rivales</option>
                                {availableOpponentGroups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                        )}

                        {filteredMatches.length === 0 && <div className="text-center text-white/30 py-8 text-sm">No hay partidos con esos filtros.</div>}
                        {filteredMatches.map((m) => {
                            const userTeam = currentUserId ? getTeamIdForUser(m, currentUserId) : null;
                            const didWin = userTeam && m.winner ? m.winner === userTeam : null;

                            return (
                                <div key={m.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] uppercase text-white/40 font-black tracking-widest">{m.mode}</span>
                                        <span className="text-[10px] uppercase text-white/40 font-black tracking-widest">{new Date(m.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-sm font-black">{m.teams.nosotros.name} {m.teams.nosotros.score} - {m.teams.ellos.score} {m.teams.ellos.name}</div>
                                    <div className="text-[11px] text-white/50 mt-1">
                                        {m.teams.nosotros.players.map(getPlayerName).join(', ')} vs {m.teams.ellos.players.map(getPlayerName).join(', ')}
                                    </div>
                                    {scope === 'MINE' && didWin !== null && (
                                        <div className={`mt-2 text-[10px] font-black uppercase tracking-wider ${didWin ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                            {didWin ? 'Ganaste' : 'Perdiste'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === 'H2H' && (
                    <div className="flex flex-col gap-3">
                        <div className="text-xs text-white/50">Filtrá por rival y modo para ver el cara a cara.</div>
                        <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold">
                            <option value="ALL">Seleccionar rival</option>
                            {availableOpponents.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                        {(mode === '2v2' || mode === '3v3') && scope === 'MINE' && (
                            <select value={opponentGroupKey} onChange={(e) => setOpponentGroupKey(e.target.value)} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold">
                                <option value="ALL">Seleccionar equipo rival</option>
                                {availableOpponentGroups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                        )}
                        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4">
                            <div className="text-xs text-white/40 mb-2 uppercase font-black">Resultados en el filtro actual</div>
                            <div className="text-2xl font-black">{filteredMatches.length} partidos</div>
                            <div className="text-sm text-white/60 mt-2">
                                Ganados: {filteredMatches.filter((m) => {
                                    if (!currentUserId) return false;
                                    const t = getTeamIdForUser(m, currentUserId);
                                    return !!t && m.winner === t;
                                }).length}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'RANKING' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
                            <button onClick={() => setRankingType('PLAYERS')} className={`flex-1 py-2 rounded-lg text-xs font-black ${rankingType === 'PLAYERS' ? 'bg-white text-black' : 'text-white/50'}`}>Jugadores</button>
                            <button onClick={() => setRankingType('PAIRS')} className={`flex-1 py-2 rounded-lg text-xs font-black ${rankingType === 'PAIRS' ? 'bg-white text-black' : 'text-white/50'}`}>Parejas</button>
                        </div>
                        {rankings.length === 0 && <div className="text-center text-white/30 py-8 text-sm">Sin datos para ranking.</div>}
                        {rankings.map((item, index) => (
                            <div key={item.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-white/40">#{index + 1}</div>
                                    <div className="font-black">{item.label}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black">{item.winRate}%</div>
                                    <div className="text-[10px] text-white/40">{item.wins}/{item.total}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
