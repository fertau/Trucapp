import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistoryStore } from '../store/useHistoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import type { MatchEditField, MatchMode, MatchState, TeamId } from '../types';
import { formatDateInputLocal, parseDateInputLocal } from '../utils/date';
import { canUserEditMatch } from '../utils/matchValidation';

interface HistoryScreenProps {
    onBack: () => void;
    initialTab?: HistoryTab;
}

type HistoryTab = 'SUMMARY' | 'MATCHES' | 'H2H' | 'RANKING';
type FilterMode = 'ALL' | MatchMode;
type Scope = 'MINE' | 'GLOBAL';
type ResultFilter = 'ALL' | 'W' | 'L';
type RankingType = 'PLAYERS' | 'PAIRS';
type SummaryWindow = '7D' | '30D' | 'ALL';
type AnalysisWindow = 'ALL' | '30D' | '90D';
type MatchListView = 'SERIES' | 'MATCHES';

const MODES: FilterMode[] = ['ALL', '1v1', '2v2', '3v3'];

const getTeamIdForUser = (match: MatchState, userId: string): TeamId | null => {
    if (match.teams.nosotros.players.includes(userId)) return 'nosotros';
    if (match.teams.ellos.players.includes(userId)) return 'ellos';
    return null;
};

const getOppositeTeam = (team: TeamId): TeamId => (team === 'nosotros' ? 'ellos' : 'nosotros');
const getGroupKey = (playerIds: string[]): string => [...playerIds].sort().join('|');
const isParticipant = (match: MatchState, userId: string | null): boolean => {
    if (!userId) return false;
    return match.teams.nosotros.players.includes(userId) || match.teams.ellos.players.includes(userId);
};

const TAB_META: Record<HistoryTab, { title: string; hint: string }> = {
    SUMMARY: { title: 'Resumen', hint: 'Tus indicadores clave y rendimiento reciente.' },
    MATCHES: { title: 'Partidos', hint: 'Listado de partidos con filtros combinables.' },
    H2H: { title: 'Enfrentamientos', hint: 'Compará resultados contra rivales o equipos.' },
    RANKING: { title: 'Ranking', hint: 'Tabla de posiciones por jugadores o parejas.' }
};

export const HistoryScreen = ({ onBack, initialTab = 'SUMMARY' }: HistoryScreenProps) => {
    const matches = useHistoryStore(state => state.matches);
    const updateMatch = useHistoryStore(state => state.updateMatch);
    const loadMoreMatches = useHistoryStore(state => state.loadMoreMatches);
    const isLoading = useHistoryStore(state => state.isLoading);
    const isLoadingMore = useHistoryStore(state => state.isLoadingMore);
    const hasMore = useHistoryStore(state => state.hasMore);
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
    const [summaryWindow, setSummaryWindow] = useState<SummaryWindow>('30D');
    const [analysisWindow, setAnalysisWindow] = useState<AnalysisWindow>('ALL');
    const [rankingMinMatches, setRankingMinMatches] = useState<number>(3);
    const [matchListView, setMatchListView] = useState<MatchListView>('MATCHES');
    const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
    const [selectedMatch, setSelectedMatch] = useState<MatchState | null>(null);
    const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);

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
        const now = Date.now();
        const sourceByWindow = tab === 'H2H' && analysisWindow !== 'ALL'
            ? scopeMatches.filter((m) => {
                const ts = m.metadata?.date ?? m.startDate;
                const from = analysisWindow === '30D'
                    ? now - (30 * 24 * 60 * 60 * 1000)
                    : now - (90 * 24 * 60 * 60 * 1000);
                return ts >= from && ts <= now;
            })
            : scopeMatches;
        const sourceModeMatches = mode === 'ALL'
            ? sourceByWindow
            : sourceByWindow.filter((m) => m.mode === mode);

        return sourceModeMatches.filter((m) => {
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
    }, [tab, analysisWindow, scopeMatches, mode, scope, currentUserId, opponentId, opponentGroupKey, result, search, getPlayerName]);

    const myModeMatches = useMemo(() => {
        if (!currentUserId) return [];
        const mine = matches.filter((m) => getTeamIdForUser(m, currentUserId) !== null);
        if (mode === 'ALL') return mine;
        return mine.filter((m) => m.mode === mode);
    }, [matches, currentUserId, mode]);

    const summaryMatches = useMemo(() => {
        if (summaryWindow === 'ALL') return myModeMatches;
        const now = Date.now();
        const from = summaryWindow === '7D'
            ? now - (7 * 24 * 60 * 60 * 1000)
            : now - (30 * 24 * 60 * 60 * 1000);
        return myModeMatches.filter((m) => {
            const ts = m.metadata?.date ?? m.startDate;
            return ts >= from && ts <= now;
        });
    }, [myModeMatches, summaryWindow]);

    const summary = useMemo(() => {
        if (!currentUserId) return { total: 0, wins: 0, losses: 0, winRate: 0, pointsDiff: 0, streak: [] as ('W' | 'L')[] };

        const streak = summaryMatches.slice(0, 8).map((m) => {
            const team = getTeamIdForUser(m, currentUserId);
            if (!team || !m.winner) return 'L';
            return m.winner === team ? 'W' : 'L';
        });

        let wins = 0;
        let pointsDiff = 0;
        summaryMatches.forEach((m) => {
            const team = getTeamIdForUser(m, currentUserId);
            if (!team) return;
            const opponent = getOppositeTeam(team);
            if (m.winner === team) wins++;
            pointsDiff += m.teams[team].score - m.teams[opponent].score;
        });

        const total = summaryMatches.length;
        return {
            total,
            wins,
            losses: total - wins,
            winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
            pointsDiff,
            streak
        };
    }, [summaryMatches, currentUserId]);

    const trends = useMemo(() => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const windowDays = summaryWindow === '7D' ? 7 : summaryWindow === '30D' ? 30 : 7;
        const currentFrom = now - (windowDays * dayMs);
        const prevFrom = now - ((windowDays * 2) * dayMs);

        const getBucketStats = (from: number, to: number) => {
            const bucket = myModeMatches.filter((m) => {
                const ts = m.metadata?.date ?? m.startDate;
                return ts >= from && ts < to;
            });
            const wins = bucket.filter((m) => {
                const team = currentUserId ? getTeamIdForUser(m, currentUserId) : null;
                return Boolean(team && m.winner === team);
            }).length;
            const total = bucket.length;
            return { wins, total, winRate: total ? Math.round((wins / total) * 100) : 0 };
        };

        const lastWindow = getBucketStats(currentFrom, now);
        const prevWindow = getBucketStats(prevFrom, currentFrom);
        return {
            lastWindow,
            prevWindow,
            deltaMatches: lastWindow.total - prevWindow.total,
            deltaWinRate: lastWindow.winRate - prevWindow.winRate,
            windowDays
        };
    }, [myModeMatches, currentUserId, summaryWindow]);

    const analysisScopedMatches = useMemo(() => {
        if (analysisWindow === 'ALL') return scopeMatches;
        const now = Date.now();
        const from = analysisWindow === '30D'
            ? now - (30 * 24 * 60 * 60 * 1000)
            : now - (90 * 24 * 60 * 60 * 1000);
        return scopeMatches.filter((m) => {
            const ts = m.metadata?.date ?? m.startDate;
            return ts >= from && ts <= now;
        });
    }, [scopeMatches, analysisWindow]);

    const summaryInsights = useMemo(() => {
        if (!currentUserId) {
            return {
                avgFor: 0,
                avgAgainst: 0,
                topRivals: [] as Array<{ id: string; name: string; matches: number; wins: number }>,
                topLocations: [] as Array<{ name: string; matches: number }>
            };
        }

        let totalFor = 0;
        let totalAgainst = 0;
        const rivalStats: Record<string, { matches: number; wins: number }> = {};
        const locationStats: Record<string, number> = {};

        summaryMatches.forEach((m) => {
            const myTeam = getTeamIdForUser(m, currentUserId);
            if (!myTeam) return;
            const oppTeam = m.teams[getOppositeTeam(myTeam)];

            totalFor += m.teams[myTeam].score;
            totalAgainst += oppTeam.score;

            const didWin = m.winner === myTeam;
            oppTeam.players.forEach((rivalId) => {
                rivalStats[rivalId] = rivalStats[rivalId] ?? { matches: 0, wins: 0 };
                rivalStats[rivalId].matches += 1;
                if (didWin) rivalStats[rivalId].wins += 1;
            });

            const location = (m.metadata?.location ?? '').trim();
            if (location) {
                locationStats[location] = (locationStats[location] ?? 0) + 1;
            }
        });

        const divisor = summaryMatches.length || 1;
        const topRivals = Object.entries(rivalStats)
            .map(([id, s]) => ({ id, name: getPlayerName(id), matches: s.matches, wins: s.wins }))
            .sort((a, b) => b.matches - a.matches || b.wins - a.wins)
            .slice(0, 3);

        const topLocations = Object.entries(locationStats)
            .map(([name, matches]) => ({ name, matches }))
            .sort((a, b) => b.matches - a.matches)
            .slice(0, 3);

        return {
            avgFor: Math.round((totalFor / divisor) * 10) / 10,
            avgAgainst: Math.round((totalAgainst / divisor) * 10) / 10,
            topRivals,
            topLocations
        };
    }, [summaryMatches, currentUserId, getPlayerName]);

    const rankings = useMemo(() => {
        const source = mode === 'ALL' ? analysisScopedMatches : analysisScopedMatches.filter((m) => m.mode === mode);

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
                .filter((x) => x.total >= rankingMinMatches)
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
            .filter((x) => x.total >= rankingMinMatches)
            .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
    }, [analysisScopedMatches, mode, rankingType, getPlayerName, rankingMinMatches]);

    const h2hSummary = useMemo(() => {
        if (!currentUserId) return { total: 0, wins: 0, losses: 0, winRate: 0, diff: 0 };
        let wins = 0;
        let losses = 0;
        let diff = 0;
        filteredMatches.forEach((m) => {
            const myTeam = getTeamIdForUser(m, currentUserId);
            if (!myTeam) return;
            const oppTeam = getOppositeTeam(myTeam);
            if (m.winner === myTeam) wins++;
            else if (m.winner === oppTeam) losses++;
            diff += m.teams[myTeam].score - m.teams[oppTeam].score;
        });
        const total = wins + losses;
        return {
            total,
            wins,
            losses,
            winRate: total ? Math.round((wins / total) * 100) : 0,
            diff
        };
    }, [filteredMatches, currentUserId]);

    const groupedSeries = useMemo(() => {
        const map = new Map<string, MatchState[]>();
        filteredMatches
            .filter((m) => m.series?.id)
            .forEach((m) => {
                const sid = m.series!.id;
                const arr = map.get(sid) ?? [];
                arr.push(m);
                map.set(sid, arr);
            });

        return Array.from(map.entries())
            .map(([seriesId, ms]) => {
                const matches = [...ms].sort((a, b) => a.startDate - b.startDate);
                const first = matches[0];
                const winsNos = matches.filter((m) => m.winner === 'nosotros').length;
                const winsEll = matches.filter((m) => m.winner === 'ellos').length;
                const targetWins = first.series?.targetWins ?? 2;
                return {
                    seriesId,
                    matches,
                    first,
                    winsNos,
                    winsEll,
                    targetWins,
                    isFinished: winsNos >= targetWins || winsEll >= targetWins
                };
            })
            .sort((a, b) => (b.matches[b.matches.length - 1]?.startDate ?? 0) - (a.matches[a.matches.length - 1]?.startDate ?? 0));
    }, [filteredMatches]);

    const locationSuggestions = useMemo(() => (
        Array.from(
            new Set(
                matches
                    .map((m) => m.metadata?.location?.trim())
                    .filter((loc): loc is string => Boolean(loc))
            )
        ).slice(0, 12)
    ), [matches]);

    const getResultEditTooltip = (match: MatchState): string => {
        if (!match.edits || match.edits.length === 0) return '';
        const resultKeys = new Set<MatchEditField['key']>(['winner', 'score_nosotros', 'score_ellos']);
        const resultEdit = [...match.edits]
            .reverse()
            .find((e) => e.fields.some((f) => resultKeys.has(f.key)));

        if (!resultEdit) return '';
        const editor = getPlayerName(resultEdit.byUserId);
        const when = new Date(resultEdit.at).toLocaleString();
        const fields = resultEdit.fields
            .filter((f) => resultKeys.has(f.key))
            .map((f) => {
                const label = f.key === 'winner' ? 'Ganador' : f.key === 'score_nosotros' ? 'Puntos Nosotros' : 'Puntos Ellos';
                return `${label}: ${f.before ?? '-'} -> ${f.after ?? '-'}`;
            })
            .join(' | ');
        return `Editado por ${editor} el ${when}. ${fields}`;
    };

    const activeFilterChips = useMemo(() => {
        const chips: { key: string; label: string; onClear: () => void }[] = [];
        if (scope !== 'MINE') chips.push({ key: 'scope', label: 'Global', onClear: () => setScope('MINE') });
        if (mode !== 'ALL') chips.push({ key: 'mode', label: mode, onClear: () => setMode('ALL') });
        if (result !== 'ALL') chips.push({ key: 'result', label: result === 'W' ? 'Ganados' : 'Perdidos', onClear: () => setResult('ALL') });
        if (opponentId !== 'ALL') chips.push({ key: 'opponent', label: `Rival: ${getPlayerName(opponentId)}`, onClear: () => setOpponentId('ALL') });
        if (opponentGroupKey !== 'ALL') {
            const label = availableOpponentGroups.find((g) => g.id === opponentGroupKey)?.label || 'Equipo rival';
            chips.push({ key: 'opp-group', label: `Equipo: ${label}`, onClear: () => setOpponentGroupKey('ALL') });
        }
        if (search.trim()) chips.push({ key: 'search', label: `Buscar: ${search.trim()}`, onClear: () => setSearch('') });
        return chips;
    }, [scope, mode, result, opponentId, opponentGroupKey, search, getPlayerName, availableOpponentGroups]);

    const canAutoLoadMore = useMemo(() => (
        scope === 'MINE' &&
        mode === 'ALL' &&
        result === 'ALL' &&
        opponentId === 'ALL' &&
        opponentGroupKey === 'ALL' &&
        search.trim() === ''
    ), [scope, mode, result, opponentId, opponentGroupKey, search]);

    useEffect(() => {
        if (tab !== 'MATCHES') return;
        if (!canAutoLoadMore) return;
        const anchor = loadMoreAnchorRef.current;
        if (!anchor) return;

        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (!entry?.isIntersecting) return;
            if (hasMore && !isLoadingMore) {
                void loadMoreMatches();
            }
        }, { rootMargin: '120px' });

        observer.observe(anchor);
        return () => observer.disconnect();
    }, [tab, hasMore, isLoadingMore, loadMoreMatches, canAutoLoadMore]);

    return (
        <div
            className="full-screen bg-[var(--color-bg)] flex flex-col p-5 overflow-hidden"
            style={{ paddingTop: 'max(20px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-[0.3em] bg-white/5 py-2 px-4 rounded-full active:scale-95 transition-all">
                    ← VOLVER
                </button>
                <div className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent)]/20">
                    Estadísticas
                </div>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                {(['SUMMARY', 'MATCHES', 'H2H', 'RANKING'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${tab === t ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'}`}
                    >
                        {TAB_META[t].title}
                    </button>
                ))}
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-black tracking-wide">{TAB_META[tab].title}</div>
                <div className="text-[11px] text-white/55">{TAB_META[tab].hint}</div>
            </div>

            {tab !== 'SUMMARY' && (
                <>
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

                    {activeFilterChips.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                onClick={() => {
                                    setScope('MINE');
                                    setMode('ALL');
                                    setResult('ALL');
                                    setOpponentId('ALL');
                                    setOpponentGroupKey('ALL');
                                    setSearch('');
                                }}
                                className="min-h-11 px-3 py-2 rounded-full text-[10px] font-black bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/40 text-[var(--color-accent)]"
                            >
                                Limpiar todo
                            </button>
                            {activeFilterChips.map((chip) => (
                                <button
                                    key={chip.key}
                                    onClick={chip.onClear}
                                    className="min-h-11 px-3 py-2 rounded-full text-[10px] font-black bg-white/10 border border-white/20 text-white/70"
                                >
                                    {chip.label} ✕
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar pr-1">
                {isLoading && (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-20 rounded-2xl bg-white/5" />
                        <div className="h-20 rounded-2xl bg-white/5" />
                        <div className="h-20 rounded-2xl bg-white/5" />
                    </div>
                )}

                {!isLoading && tab === 'SUMMARY' && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-bottom duration-300">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {(['7D', '30D', 'ALL'] as const).map((w) => (
                                <button
                                    key={w}
                                    onClick={() => setSummaryWindow(w)}
                                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${summaryWindow === w ? 'bg-white text-black border-white' : 'bg-white/5 text-white/45 border-white/10'}`}
                                >
                                    {w === '7D' ? '7 días' : w === '30D' ? '30 días' : 'Todo'}
                                </button>
                            ))}
                        </div>

                        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6">
                            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-3">Resumen del jugador</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/40">PJ</div><div className="text-2xl font-black">{summary.total}</div></div>
                                <div className="bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/40">Efectividad</div><div className="text-2xl font-black">{summary.winRate}%</div></div>
                                <div className="bg-white/5 rounded-2xl p-3"><div className="text-xs text-white/40">G / P</div><div className="text-2xl font-black">{summary.wins} / {summary.losses}</div></div>
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

                        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6">
                            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-3">Tendencia ({trends.windowDays} días)</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-2xl p-3">
                                    <div className="text-xs text-white/40">Partidos</div>
                                    <div className="text-2xl font-black">{trends.lastWindow.total}</div>
                                    <div className={`text-[10px] font-black ${trends.deltaMatches >= 0 ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                        vs periodo previo: {trends.deltaMatches >= 0 ? `+${trends.deltaMatches}` : trends.deltaMatches}
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-3">
                                    <div className="text-xs text-white/40">Efectividad</div>
                                    <div className="text-2xl font-black">{trends.lastWindow.winRate}%</div>
                                    <div className={`text-[10px] font-black ${trends.deltaWinRate >= 0 ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                        vs periodo previo: {trends.deltaWinRate >= 0 ? `+${trends.deltaWinRate}` : trends.deltaWinRate} pts
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-6">
                            <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-black mb-3">Indicadores</div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="bg-white/5 rounded-2xl p-3">
                                    <div className="text-xs text-white/40">Prom. puntos a favor</div>
                                    <div className="text-2xl font-black">{summaryInsights.avgFor}</div>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-3">
                                    <div className="text-xs text-white/40">Prom. puntos en contra</div>
                                    <div className="text-2xl font-black">{summaryInsights.avgAgainst}</div>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-3 mb-3">
                                <div className="text-xs text-white/40 mb-2">Rivales más frecuentes</div>
                                {summaryInsights.topRivals.length === 0 && <div className="text-xs text-white/30">Sin datos</div>}
                                {summaryInsights.topRivals.map((r) => (
                                    <div key={r.id} className="flex items-center justify-between text-xs py-1">
                                        <span>{r.name}</span>
                                        <span className="text-white/55">{r.matches} PJ | {r.wins} G | {r.matches - r.wins} P</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white/5 rounded-2xl p-3">
                                <div className="text-xs text-white/40 mb-2">Sedes más usadas</div>
                                {summaryInsights.topLocations.length === 0 && <div className="text-xs text-white/30">Sin sedes registradas</div>}
                                {summaryInsights.topLocations.map((loc) => (
                                    <div key={loc.name} className="flex items-center justify-between text-xs py-1">
                                        <span className="truncate pr-2">{loc.name}</span>
                                        <span className="text-white/55">{loc.matches} PJ</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && tab === 'MATCHES' && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom duration-300">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por jugador, equipo o sede..."
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm outline-none"
                        />

                        <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
                            <button
                                onClick={() => setMatchListView('SERIES')}
                                className={`flex-1 py-2 rounded-lg text-xs font-black ${matchListView === 'SERIES' ? 'bg-white text-black' : 'text-white/50'}`}
                            >
                                Series
                            </button>
                            <button
                                onClick={() => setMatchListView('MATCHES')}
                                className={`flex-1 py-2 rounded-lg text-xs font-black ${matchListView === 'MATCHES' ? 'bg-white text-black' : 'text-white/50'}`}
                            >
                                Partidos
                            </button>
                        </div>

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

                        {matchListView === 'SERIES' && groupedSeries.length > 0 && (
                            <div className="flex flex-col gap-3">
                                {groupedSeries.map((serie) => {
                                    const sid = serie.seriesId;
                                    const isOpen = openSeriesId === sid;
                                    const first = serie.first;
                                    return (
                                        <div key={sid} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                            <button
                                                onClick={() => setOpenSeriesId((v) => (v === sid ? null : sid))}
                                                className="w-full text-left p-4"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[10px] uppercase text-white/45 font-black tracking-widest">
                                                        Serie BO{(serie.targetWins * 2) - 1}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${serie.isFinished ? 'text-[var(--color-nosotros)]' : 'text-amber-400'}`}>
                                                        {serie.isFinished ? 'Cerrada' : 'En curso'}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-black">
                                                    {first.teams.nosotros.name} {serie.winsNos} - {serie.winsEll} {first.teams.ellos.name}
                                                </div>
                                                <div className="text-[11px] text-white/50 mt-1">
                                                    {serie.matches.length} partidos · última: {new Date(serie.matches[serie.matches.length - 1].startDate).toLocaleDateString()}
                                                </div>
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-white/10 p-3 flex flex-col gap-2 bg-black/10">
                                                    {serie.matches.map((m) => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => setSelectedMatch(m)}
                                                            className="text-left bg-white/5 border border-white/10 rounded-xl p-3"
                                                        >
                                                            <div className="text-[10px] uppercase text-white/40 font-black tracking-widest">
                                                                Partido {m.series?.gameNumber ?? '-'} · {new Date(m.startDate).toLocaleString()}
                                                            </div>
                                                            <div className="text-sm font-black mt-1">
                                                                {m.teams.nosotros.name} {m.teams.nosotros.score} - {m.teams.ellos.score} {m.teams.ellos.name}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {(matchListView === 'MATCHES' || groupedSeries.length === 0) && filteredMatches.map((m) => {
                            const userTeam = currentUserId ? getTeamIdForUser(m, currentUserId) : null;
                            const didWin = userTeam && m.winner ? m.winner === userTeam : null;
                            const showWarning = Boolean(m.editedFlags?.resultEdited);

                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMatch(m)}
                                    className="w-full text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 active:scale-[0.99] transition-transform"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] uppercase text-white/40 font-black tracking-widest">{m.mode}</span>
                                        <div className="flex items-center gap-2">
                                            {showWarning && (
                                                <span
                                                    className="text-[12px] text-amber-400"
                                                    title={getResultEditTooltip(m)}
                                                >
                                                    ⚠
                                                </span>
                                            )}
                                            <span className="text-[10px] uppercase text-white/40 font-black tracking-widest">{new Date(m.startDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm font-black">{m.teams.nosotros.name} {m.teams.nosotros.score} - {m.teams.ellos.score} {m.teams.ellos.name}</div>
                                    {m.mode !== '1v1' && (
                                        <div className="text-[11px] text-white/50 mt-1">
                                            {m.teams.nosotros.players.map(getPlayerName).join(', ')} vs {m.teams.ellos.players.map(getPlayerName).join(', ')}
                                        </div>
                                    )}
                                    {scope === 'MINE' && didWin !== null && (
                                        <div className={`mt-2 text-[10px] font-black uppercase tracking-wider ${didWin ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                            {didWin ? 'Ganaste' : 'Perdiste'}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                        {filteredMatches.length > 0 && hasMore && (
                            <button
                                onClick={() => void loadMoreMatches()}
                                disabled={isLoadingMore}
                                className="w-full mt-2 py-3 rounded-xl border border-white/15 bg-white/5 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                            >
                                {isLoadingMore ? 'Cargando...' : 'Cargar más'}
                            </button>
                        )}
                        <div ref={loadMoreAnchorRef} className="h-1" />
                    </div>
                )}

                {!isLoading && tab === 'H2H' && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom duration-300">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {(['ALL', '30D', '90D'] as const).map((w) => (
                                <button
                                    key={w}
                                    onClick={() => setAnalysisWindow(w)}
                                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${analysisWindow === w ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'}`}
                                >
                                    {w === 'ALL' ? 'Todo' : w}
                                </button>
                            ))}
                        </div>
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
                            <div className="text-2xl font-black">{h2hSummary.total} partidos</div>
                            <div className="text-sm text-white/60 mt-2">
                                G: {h2hSummary.wins} | P: {h2hSummary.losses}
                            </div>
                            <div className="text-sm text-white/60 mt-1">
                                Efectividad: {h2hSummary.winRate}% | Dif: {h2hSummary.diff >= 0 ? `+${h2hSummary.diff}` : h2hSummary.diff}
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && tab === 'RANKING' && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom duration-300">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {(['ALL', '30D', '90D'] as const).map((w) => (
                                <button
                                    key={w}
                                    onClick={() => setAnalysisWindow(w)}
                                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${analysisWindow === w ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'}`}
                                >
                                    {w === 'ALL' ? 'Todo' : w}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {[1, 3, 5].map((min) => (
                                <button
                                    key={min}
                                    onClick={() => setRankingMinMatches(min)}
                                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border ${rankingMinMatches === min ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]' : 'bg-white/5 text-white/50 border-white/10'}`}
                                >
                                    Min {min} PJ
                                </button>
                            ))}
                        </div>
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
                                    <div className="text-[10px] text-white/40">{item.total} PJ | {item.wins} G | {item.total - item.wins} P</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedMatch && (
                <MatchDetailDrawer
                    match={selectedMatch}
                    currentUserId={currentUserId}
                    getPlayerName={getPlayerName}
                    locationSuggestions={locationSuggestions}
                    onClose={() => setSelectedMatch(null)}
                    onSave={async (updated) => {
                        if (!canUserEditMatch(updated, currentUserId)) {
                            alert('No tenés permiso para editar este partido.');
                            return;
                        }
                        try {
                            await updateMatch(updated, currentUserId);
                            setSelectedMatch(updated);
                        } catch (err) {
                            const message = err instanceof Error ? err.message : 'No se pudo guardar la edicion.';
                            alert(message);
                        }
                    }}
                />
            )}
        </div>
    );
};

interface MatchDetailDrawerProps {
    match: MatchState;
    currentUserId: string | null;
    getPlayerName: (id: string) => string;
    locationSuggestions: string[];
    onClose: () => void;
    onSave: (match: MatchState) => Promise<void>;
}

const MatchDetailDrawer = ({ match, currentUserId, getPlayerName, locationSuggestions, onClose, onSave }: MatchDetailDrawerProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [location, setLocation] = useState(match.metadata?.location ?? '');
    const [date, setDate] = useState(() => {
        const ts = match.metadata?.date || match.startDate;
        return formatDateInputLocal(ts);
    });
    const [scoreNos, setScoreNos] = useState(match.teams.nosotros.score);
    const [scoreEll, setScoreEll] = useState(match.teams.ellos.score);
    const [winner, setWinner] = useState<TeamId | null>(match.winner ?? null);

    const canEdit = isParticipant(match, currentUserId);
    const editTitle = useMemo(() => {
        if (!match.edits || match.edits.length === 0) return '';
        const last = match.edits[match.edits.length - 1];
        const fields = last.fields.map((f) => `${f.key}: ${f.before ?? '-'} -> ${f.after ?? '-'}`).join(' | ');
        return `Editado por ${getPlayerName(last.byUserId)} el ${new Date(last.at).toLocaleString()}. ${fields}`;
    }, [match.edits, getPlayerName]);

    const handleShare = async () => {
        const shareText = [
            `Trucapp | ${match.mode}`,
            `${match.teams.nosotros.name} ${scoreNos} - ${scoreEll} ${match.teams.ellos.name}`,
            `Sede: ${location || 'Sin sede'}`,
            `Fecha: ${date}`,
        ].join('\n');
        if (navigator.share) {
            await navigator.share({ text: shareText });
            return;
        }
        await navigator.clipboard.writeText(shareText);
        alert('Resumen copiado al portapapeles');
    };

    const handleSave = async () => {
        if (!currentUserId) return;
        setIsSaving(true);

        const newDate = parseDateInputLocal(date);
        if (newDate === null) {
            alert('Fecha inválida.');
            setIsSaving(false);
            return;
        }
        if (!Number.isFinite(scoreNos) || !Number.isFinite(scoreEll) || scoreNos < 0 || scoreEll < 0) {
            alert('El puntaje debe ser un número mayor o igual a 0.');
            setIsSaving(false);
            return;
        }
        if (!Number.isInteger(scoreNos) || !Number.isInteger(scoreEll)) {
            alert('El puntaje debe ser entero.');
            setIsSaving(false);
            return;
        }
        if (scoreNos === scoreEll && winner !== null) {
            alert('Si hay empate, el ganador debe quedar sin definir.');
            setIsSaving(false);
            return;
        }
        if (scoreNos > scoreEll && winner !== 'nosotros') {
            alert(`Ganador inconsistente: debe ganar ${match.teams.nosotros.name}.`);
            setIsSaving(false);
            return;
        }
        if (scoreEll > scoreNos && winner !== 'ellos') {
            alert(`Ganador inconsistente: debe ganar ${match.teams.ellos.name}.`);
            setIsSaving(false);
            return;
        }
        const fields: MatchEditField[] = [];

        if ((match.metadata?.location ?? '') !== location) {
            fields.push({ key: 'location', before: match.metadata?.location ?? null, after: location || null });
        }
        const prevDate = match.metadata?.date ?? match.startDate;
        if (prevDate !== newDate) {
            fields.push({ key: 'date', before: prevDate, after: newDate });
        }
        if (match.teams.nosotros.score !== scoreNos) {
            fields.push({ key: 'score_nosotros', before: match.teams.nosotros.score, after: scoreNos });
        }
        if (match.teams.ellos.score !== scoreEll) {
            fields.push({ key: 'score_ellos', before: match.teams.ellos.score, after: scoreEll });
        }
        if ((match.winner ?? null) !== (winner ?? null)) {
            fields.push({ key: 'winner', before: match.winner ?? null, after: winner ?? null });
        }

        if (fields.length === 0) {
            setIsEditing(false);
            setIsSaving(false);
            return;
        }

        const resultEdited = fields.some((f) => f.key === 'winner' || f.key === 'score_nosotros' || f.key === 'score_ellos');
        const metadataEdited = fields.some((f) => f.key === 'location' || f.key === 'date');

        const updated: MatchState = {
            ...match,
            teams: {
                nosotros: { ...match.teams.nosotros, score: scoreNos },
                ellos: { ...match.teams.ellos, score: scoreEll },
            },
            winner,
            metadata: {
                ...match.metadata,
                location: location || null,
                date: newDate
            },
            editedFlags: {
                resultEdited: (match.editedFlags?.resultEdited ?? false) || resultEdited,
                metadataEdited: (match.editedFlags?.metadataEdited ?? false) || metadataEdited
            },
            edits: [
                ...(match.edits ?? []),
                {
                    at: Date.now(),
                    byUserId: currentUserId,
                    fields
                }
            ]
        };

        await onSave(updated);
        setIsEditing(false);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end">
            <div
                className="w-full bg-[var(--color-bg)] border-t border-[var(--color-border)] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
                style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
            >
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-black">{match.mode}</div>
                        <div className="text-lg font-black">Detalle del partido</div>
                    </div>
                    <button onClick={onClose} className="text-white/60 font-black text-sm">Cerrar</button>
                </div>

                {match.editedFlags?.resultEdited && (
                    <div className="mb-4 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10">
                        <div className="text-xs font-black text-amber-300 flex items-center gap-2">
                            <span title={editTitle}>⚠ Resultado editado</span>
                        </div>
                    </div>
                )}

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 mb-4">
                    <div className="text-sm font-black mb-1">{match.teams.nosotros.name} {scoreNos} - {scoreEll} {match.teams.ellos.name}</div>
                    {match.mode !== '1v1' && (
                        <div className="text-[11px] text-white/50">
                            {match.teams.nosotros.players.map(getPlayerName).join(', ')} vs {match.teams.ellos.players.map(getPlayerName).join(', ')}
                        </div>
                    )}
                </div>

                {(match.edits?.length ?? 0) > 0 && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 mb-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 font-black mb-3">Historial de ediciones</div>
                        <div className="flex flex-col gap-2">
                            {[...(match.edits ?? [])]
                                .slice(-6)
                                .reverse()
                                .map((edit, idx) => (
                                    <div key={`${edit.at}-${idx}`} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                        <div className="text-[11px] text-white/60 mb-1">
                                            {getPlayerName(edit.byUserId)} · {new Date(edit.at).toLocaleString()}
                                        </div>
                                        <div className="text-[11px] text-white/80">
                                            {edit.fields.map((f) => `${f.key}: ${f.before ?? '-'} -> ${f.after ?? '-'}`).join(' | ')}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-3 mb-4">
                    <div>
                        <label className="text-[10px] uppercase text-white/40 font-black">Sede</label>
                        <input
                            disabled={!isEditing}
                            list="drawer-location-suggestions"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm disabled:opacity-60"
                        />
                        <datalist id="drawer-location-suggestions">
                            {locationSuggestions.map((loc) => <option key={loc} value={loc} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-white/40 font-black">Fecha</label>
                        <input
                            disabled={!isEditing}
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm disabled:opacity-60"
                        />
                    </div>
                </div>

                {isEditing && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                            <label className="text-[10px] uppercase text-white/40 font-black">{match.teams.nosotros.name}</label>
                            <input
                                type="number"
                                value={scoreNos}
                                onChange={(e) => setScoreNos(Number(e.target.value))}
                                className="w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase text-white/40 font-black">{match.teams.ellos.name}</label>
                            <input
                                type="number"
                                value={scoreEll}
                                onChange={(e) => setScoreEll(Number(e.target.value))}
                                className="w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] uppercase text-white/40 font-black">Ganador</label>
                            <select
                                value={winner ?? ''}
                                onChange={(e) => setWinner((e.target.value || null) as TeamId | null)}
                                className="w-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm"
                            >
                                <option value="">Sin definir</option>
                                <option value="nosotros">{match.teams.nosotros.name}</option>
                                <option value="ellos">{match.teams.ellos.name}</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button onClick={handleShare} className="flex-1 bg-white/10 border border-white/15 rounded-xl py-3 text-sm font-black">
                        Compartir
                    </button>
                    {canEdit && !isEditing && (
                        <button onClick={() => setIsEditing(true)} className="flex-1 bg-[var(--color-accent)] text-black rounded-xl py-3 text-sm font-black">
                            Editar
                        </button>
                    )}
                    {canEdit && isEditing && (
                        <>
                            <button onClick={() => setIsEditing(false)} className="flex-1 bg-white/10 border border-white/15 rounded-xl py-3 text-sm font-black">
                                Cancelar
                            </button>
                            <button onClick={() => void handleSave()} disabled={isSaving} className="flex-1 bg-[var(--color-accent)] text-black rounded-xl py-3 text-sm font-black disabled:opacity-60">
                                Guardar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
