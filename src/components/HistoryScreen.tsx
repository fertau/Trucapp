import { useCallback, useEffect, useMemo, useRef, useState, type TouchEventHandler } from 'react';
import { useHistoryStore } from '../store/useHistoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import type { MatchEditField, MatchMode, MatchState, TeamId } from '../types';
import { formatDateDisplay, formatDateInputLocal, formatDateTimeDisplay, parseDateInputLocal } from '../utils/date';
import { canUserEditMatch } from '../utils/matchValidation';
import { getMatchEffectiveDate, getTeamRefKey, getTeamRefLabel } from '../utils/matchIdentity';

interface HistoryScreenProps {
    onBack: () => void;
    initialTab?: HistoryTab;
    onStartSeriesFromHistory?: (baseMatch: MatchState, mode: 'continue' | 'new') => void;
}

type HistoryTab = 'SUMMARY' | 'MATCHES';
type FilterMode = 'ALL' | MatchMode;
type Scope = 'MINE' | 'GLOBAL';
type ResultFilter = 'ALL' | 'W' | 'L';
type MatchListView = 'SERIES' | 'MATCHES';
type SeriesResultFilter = 'ALL' | 'G' | 'P';
type StatsModeTab = '1v1' | '2v2' | 'GLOBAL';
type HistoryFocus = 'YO_1V1' | 'YO_2V2' | 'YO_3V3' | 'MI_EQUIPO' | 'CLASICOS';
type SavedHistoryView = {
    id: string;
    name: string;
    scope: Scope;
    mode: FilterMode;
    result: ResultFilter;
    opponentId: string;
    opponentGroupKey: string;
    search: string;
    matchListView: MatchListView;
};

const MODES: FilterMode[] = ['ALL', '1v1', '2v2', '3v3'];
const STATS_MODE_TABS: StatsModeTab[] = ['1v1', '2v2', 'GLOBAL'];
const HISTORY_FILTERS_STORAGE_KEY = 'trucapp-history-filters-v2';
const HISTORY_SUMMARY_STORAGE_KEY = 'trucapp-history-summary-v2';
const HISTORY_FAVORITE_CLASSICS_STORAGE_KEY = 'trucapp-history-favorite-classics-v1';
const HISTORY_SAVED_VIEWS_STORAGE_KEY = 'trucapp-history-saved-views-v1';
const HISTORY_FOCUS_TABS: Array<{ key: HistoryFocus; label: string }> = [
    { key: 'YO_1V1', label: 'Yo 1v1' },
    { key: 'YO_2V2', label: 'Yo 2v2' },
    { key: 'YO_3V3', label: 'Yo 3v3' },
    { key: 'MI_EQUIPO', label: 'Mi equipo' },
    { key: 'CLASICOS', label: 'Clasicos' }
];

const getTeamIdForUser = (match: MatchState, userId: string): TeamId | null => {
    if (match.teams.nosotros.players.includes(userId)) return 'nosotros';
    if (match.teams.ellos.players.includes(userId)) return 'ellos';
    return null;
};

const getOppositeTeam = (team: TeamId): TeamId => (team === 'nosotros' ? 'ellos' : 'nosotros');
const isParticipant = (match: MatchState, userId: string | null): boolean => {
    if (!userId) return false;
    return match.teams.nosotros.players.includes(userId) || match.teams.ellos.players.includes(userId);
};

const TAB_META: Record<HistoryTab, { title: string; hint: string }> = {
    SUMMARY: { title: 'Resumen', hint: 'Tus indicadores clave y rendimiento reciente.' },
    MATCHES: { title: 'Partidos', hint: 'Historial de partidos con filtros combinables.' }
};

export const HistoryScreen = ({ onBack, initialTab = 'SUMMARY', onStartSeriesFromHistory }: HistoryScreenProps) => {
    const matches = useHistoryStore(state => state.matches);
    const updateMatch = useHistoryStore(state => state.updateMatch);
    const loadMoreMatches = useHistoryStore(state => state.loadMoreMatches);
    const isLoading = useHistoryStore(state => state.isLoading);
    const isLoadingMore = useHistoryStore(state => state.isLoadingMore);
    const hasMore = useHistoryStore(state => state.hasMore);
    const currentUserId = useAuthStore(state => state.currentUserId);
    const players = useUserStore(state => state.players);

    const [tab, setTab] = useState<HistoryTab>(initialTab);
    const [historyFocus, setHistoryFocus] = useState<HistoryFocus>('YO_1V1');
    const [myTeamKey, setMyTeamKey] = useState<string>('ALL');
    const [classicKey, setClassicKey] = useState<string>('AUTO');
    const [scope, setScope] = useState<Scope>('MINE');
    const [mode, setMode] = useState<FilterMode>('ALL');
    const [result, setResult] = useState<ResultFilter>('ALL');
    const [opponentId, setOpponentId] = useState<string>('ALL');
    const [opponentGroupKey, setOpponentGroupKey] = useState<string>('ALL');
    const [search, setSearch] = useState('');
    const [statsMode, setStatsMode] = useState<StatsModeTab>('1v1');
    const [isClassicOpen, setIsClassicOpen] = useState(false);
    const [matchListView, setMatchListView] = useState<MatchListView>('SERIES');
    const [openSeriesId, setOpenSeriesId] = useState<string | null>(null);
    const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
    const [seriesResultFilter, setSeriesResultFilter] = useState<SeriesResultFilter>('ALL');
    const [selectedMatch, setSelectedMatch] = useState<MatchState | null>(null);
    const [favoriteClassicKeys, setFavoriteClassicKeys] = useState<string[]>([]);
    const [savedViews, setSavedViews] = useState<SavedHistoryView[]>([]);
    const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);
    const edgeSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const edgeSwipeTriggeredRef = useRef(false);

    useEffect(() => {
        setTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        try {
            const persistedFilters = localStorage.getItem(HISTORY_FILTERS_STORAGE_KEY);
            if (persistedFilters) {
                const parsed = JSON.parse(persistedFilters) as Partial<{
                    scope: Scope;
                    mode: FilterMode;
                    result: ResultFilter;
                    opponentId: string;
                    opponentGroupKey: string;
                    search: string;
                    matchListView: MatchListView;
                }>;
                if (parsed.scope) setScope(parsed.scope);
                if (parsed.mode) setMode(parsed.mode);
                if (parsed.result) setResult(parsed.result);
                if (parsed.opponentId) setOpponentId(parsed.opponentId);
                if (parsed.opponentGroupKey) setOpponentGroupKey(parsed.opponentGroupKey);
                if (typeof parsed.search === 'string') setSearch(parsed.search);
                if (parsed.matchListView) setMatchListView(parsed.matchListView);
            }

            const persistedSummary = localStorage.getItem(HISTORY_SUMMARY_STORAGE_KEY);
            if (persistedSummary) {
                const parsed = JSON.parse(persistedSummary) as Partial<{
                    statsMode: StatsModeTab;
                    historyFocus: HistoryFocus;
                    myTeamKey: string;
                    classicKey: string;
                }>;
                if (parsed.statsMode) setStatsMode(parsed.statsMode);
                if (parsed.historyFocus) setHistoryFocus(parsed.historyFocus);
                if (parsed.myTeamKey) setMyTeamKey(parsed.myTeamKey);
                if (parsed.classicKey) setClassicKey(parsed.classicKey);
            }

            const persistedFavorites = localStorage.getItem(HISTORY_FAVORITE_CLASSICS_STORAGE_KEY);
            if (persistedFavorites) {
                const parsed = JSON.parse(persistedFavorites) as string[];
                setFavoriteClassicKeys(Array.isArray(parsed) ? parsed : []);
            }

            const persistedViews = localStorage.getItem(HISTORY_SAVED_VIEWS_STORAGE_KEY);
            if (persistedViews) {
                const parsed = JSON.parse(persistedViews) as SavedHistoryView[];
                setSavedViews(Array.isArray(parsed) ? parsed : []);
            }
        } catch (err) {
            console.warn('No se pudo restaurar preferencias de historial:', err);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(HISTORY_FILTERS_STORAGE_KEY, JSON.stringify({
            scope,
            mode,
            result,
            opponentId,
            opponentGroupKey,
            search,
            matchListView
        }));
    }, [scope, mode, result, opponentId, opponentGroupKey, search, matchListView]);

    useEffect(() => {
        localStorage.setItem(HISTORY_SUMMARY_STORAGE_KEY, JSON.stringify({
            statsMode,
            historyFocus,
            myTeamKey,
            classicKey
        }));
    }, [statsMode, historyFocus, myTeamKey, classicKey]);

    useEffect(() => {
        localStorage.setItem(HISTORY_FAVORITE_CLASSICS_STORAGE_KEY, JSON.stringify(favoriteClassicKeys));
    }, [favoriteClassicKeys]);

    useEffect(() => {
        localStorage.setItem(HISTORY_SAVED_VIEWS_STORAGE_KEY, JSON.stringify(savedViews));
    }, [savedViews]);

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
            const opponentSide = getOppositeTeam(userTeam);
            const key = getTeamRefKey(m, opponentSide);
            if (!keys.has(key)) {
                keys.set(key, getTeamRefLabel(m, opponentSide));
            }
        });

        return Array.from(keys.entries()).map(([id, label]) => ({ id, label }));
    }, [modeMatches, currentUserId]);

    const filteredMatches = useMemo(() => {
        const text = search.trim().toLowerCase();
        const sourceModeMatches = mode === 'ALL'
            ? scopeMatches
            : scopeMatches.filter((m) => m.mode === mode);

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
                const opponentSide = getOppositeTeam(userTeam);
                if (getTeamRefKey(m, opponentSide) !== opponentGroupKey) return false;
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
    }, [scopeMatches, mode, scope, currentUserId, opponentId, opponentGroupKey, result, search, getPlayerName]);

    const statsScopedMatches = useMemo(() => {
        if (!currentUserId) return [];
        return matches.filter((m) => {
            if (!isParticipant(m, currentUserId)) return false;
            if (statsMode === 'GLOBAL') return true;
            return m.mode === statsMode;
        });
    }, [matches, currentUserId, statsMode]);

    const statsScopedMatchesSorted = useMemo(() => (
        [...statsScopedMatches].sort((a, b) => getMatchEffectiveDate(a) - getMatchEffectiveDate(b))
    ), [statsScopedMatches]);

    const summaryStats = useMemo(() => {
        if (!currentUserId) {
            return {
                total: 0,
                wins: 0,
                losses: 0
            };
        }

        let wins = 0;
        let losses = 0;

        statsScopedMatchesSorted.forEach((m) => {
            const myTeam = getTeamIdForUser(m, currentUserId);
            if (!myTeam) return;

            if (m.winner === myTeam) wins++;
            else losses++;
        });

        const total = statsScopedMatchesSorted.length;
        return {
            total,
            wins,
            losses
        };
    }, [statsScopedMatchesSorted, currentUserId]);

    const summaryForm = useMemo(() => {
        if (!currentUserId) return [] as Array<'G' | 'P'>;
        return statsScopedMatchesSorted
            .slice(-10)
            .map((m) => {
                const myTeam = getTeamIdForUser(m, currentUserId);
                return myTeam && m.winner === myTeam ? 'G' : 'P';
            });
    }, [statsScopedMatchesSorted, currentUserId]);

    const myAllMatchesSorted = useMemo(() => {
        if (!currentUserId) return [] as MatchState[];
        return matches
            .filter((m) => isParticipant(m, currentUserId))
            .sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a));
    }, [matches, currentUserId]);

    const myTeamOptions = useMemo(() => {
        if (!currentUserId) return [] as Array<{ key: string; label: string; count: number }>;
        const buckets = new Map<string, { label: string; count: number }>();
        myAllMatchesSorted
            .filter((m) => m.mode === '2v2' || m.mode === '3v3')
            .forEach((m) => {
                const mySide = getTeamIdForUser(m, currentUserId);
                if (!mySide) return;
                const key = getTeamRefKey(m, mySide);
                const label = getTeamRefLabel(m, mySide);
                const prev = buckets.get(key);
                buckets.set(key, { label, count: (prev?.count ?? 0) + 1 });
            });
        return Array.from(buckets.entries())
            .map(([key, v]) => ({ key, label: v.label, count: v.count }))
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }, [myAllMatchesSorted, currentUserId]);

    const classicOptions = useMemo(() => {
        if (!currentUserId) return [] as Array<{ key: string; label: string; count: number; lastPlayedAt: number; isFavorite: boolean; isHot: boolean }>;
        const buckets = new Map<string, { label: string; count: number; lastPlayedAt: number }>();

        myAllMatchesSorted.forEach((m) => {
            const mySide = getTeamIdForUser(m, currentUserId);
            if (!mySide) return;
            const oppSide = getOppositeTeam(mySide);

            let key = '';
            let label = '';
            if (m.mode === '1v1') {
                const rivalId = m.teams[oppSide].players[0];
                key = `1v1:${rivalId}`;
                label = `1v1 vs ${getPlayerName(rivalId)}`;
            } else {
                const myKey = getTeamRefKey(m, mySide);
                const oppKey = getTeamRefKey(m, oppSide);
                key = `${m.mode}:${myKey}:${oppKey}`;
                label = `${m.mode} · ${getTeamRefLabel(m, mySide)} vs ${getTeamRefLabel(m, oppSide)}`;
            }

            const prev = buckets.get(key);
            buckets.set(key, {
                label,
                count: (prev?.count ?? 0) + 1,
                lastPlayedAt: Math.max(prev?.lastPlayedAt ?? 0, getMatchEffectiveDate(m))
            });
        });

        const hotThreshold = Date.now() - (1000 * 60 * 60 * 24 * 14);
        return Array.from(buckets.entries())
            .map(([key, v]) => ({
                key,
                label: v.label,
                count: v.count,
                lastPlayedAt: v.lastPlayedAt,
                isFavorite: favoriteClassicKeys.includes(key),
                isHot: v.lastPlayedAt >= hotThreshold
            }))
            .filter((x) => x.count >= 3)
            .sort((a, b) => {
                if (Number(b.isFavorite) !== Number(a.isFavorite)) return Number(b.isFavorite) - Number(a.isFavorite);
                if (b.count !== a.count) return b.count - a.count;
                if (b.lastPlayedAt !== a.lastPlayedAt) return b.lastPlayedAt - a.lastPlayedAt;
                return a.label.localeCompare(b.label);
            });
    }, [myAllMatchesSorted, currentUserId, getPlayerName, favoriteClassicKeys]);

    const favoriteClassics = useMemo(
        () => classicOptions.filter((classic) => classic.isFavorite),
        [classicOptions]
    );

    const activeClassicKey = useMemo(() => {
        if (classicKey === 'AUTO') return classicOptions[0]?.key ?? '';
        return classicKey;
    }, [classicKey, classicOptions]);

    const toggleFavoriteClassic = (key: string) => {
        setFavoriteClassicKeys((prev) => (
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        ));
    };

    useEffect(() => {
        setIsClassicOpen(false);
    }, [historyFocus, activeClassicKey]);

    const historyFocusMatches = useMemo(() => {
        if (!currentUserId) return [] as MatchState[];
        if (historyFocus === 'YO_1V1') return myAllMatchesSorted.filter((m) => m.mode === '1v1');
        if (historyFocus === 'YO_2V2') return myAllMatchesSorted.filter((m) => m.mode === '2v2');
        if (historyFocus === 'YO_3V3') return myAllMatchesSorted.filter((m) => m.mode === '3v3');
        if (historyFocus === 'MI_EQUIPO') {
            const base = myAllMatchesSorted.filter((m) => m.mode === '2v2' || m.mode === '3v3');
            if (myTeamKey === 'ALL') return base;
            return base.filter((m) => {
                const mySide = getTeamIdForUser(m, currentUserId);
                return mySide ? getTeamRefKey(m, mySide) === myTeamKey : false;
            });
        }

        if (!activeClassicKey) return [] as MatchState[];
        return myAllMatchesSorted.filter((m) => {
            const mySide = getTeamIdForUser(m, currentUserId);
            if (!mySide) return false;
            const oppSide = getOppositeTeam(mySide);
            if (m.mode === '1v1') {
                return `1v1:${m.teams[oppSide].players[0]}` === activeClassicKey;
            }
            const key = `${m.mode}:${getTeamRefKey(m, mySide)}:${getTeamRefKey(m, oppSide)}`;
            return key === activeClassicKey;
        });
    }, [currentUserId, historyFocus, myAllMatchesSorted, myTeamKey, activeClassicKey]);

    const compactHistory = useMemo(() => {
        if (!currentUserId) return [] as Array<{
            id: string;
            line1: string;
            line2: string;
            code: 'G' | 'P';
        }>;

        return historyFocusMatches.slice(0, 25).map((m) => {
            const myTeam = getTeamIdForUser(m, currentUserId);
            const oppTeamId = myTeam ? getOppositeTeam(myTeam) : 'ellos';
            const myScore = myTeam ? m.teams[myTeam].score : 0;
            const oppScore = myTeam ? m.teams[oppTeamId].score : 0;
            const opponentLabel = myTeam
                ? (m.mode === '1v1'
                    ? m.teams[oppTeamId].players.map(getPlayerName).join(' / ')
                    : m.teams[oppTeamId].name)
                : 'Rival';
            const dateLabel = formatDateDisplay(getMatchEffectiveDate(m));
            const closureLabel = `A ${m.targetScore}${m.editedFlags?.resultEdited ? ' · Editado' : ''}`;
            const code: 'G' | 'P' = myTeam && m.winner === myTeam ? 'G' : 'P';

            return {
                id: m.id,
                line1: `${opponentLabel} · ${myScore}-${oppScore} · ${dateLabel}`,
                line2: `${m.mode} · ${closureLabel}`,
                code
            };
        });
    }, [historyFocusMatches, currentUserId, getPlayerName]);

    const historySummary = useMemo(() => {
        if (!currentUserId) return { total: 0, wins: 0, losses: 0 };
        let wins = 0;
        let losses = 0;
        historyFocusMatches.forEach((m) => {
            const myTeam = getTeamIdForUser(m, currentUserId);
            if (!myTeam) return;
            if (m.winner === myTeam) wins++;
            else losses++;
        });
        const total = wins + losses;
        return {
            total,
            wins,
            losses
        };
    }, [historyFocusMatches, currentUserId]);

    const historyForm = useMemo(() => {
        if (!currentUserId) return [] as Array<'G' | 'P'>;
        return historyFocusMatches
            .slice(0, 10)
            .map((m) => {
                const myTeam = getTeamIdForUser(m, currentUserId);
                return myTeam && m.winner === myTeam ? 'G' : 'P';
            });
    }, [historyFocusMatches, currentUserId]);

    const classicSeriesGroups = useMemo(() => {
        if (historyFocus !== 'CLASICOS') return [] as Array<{
            id: string;
            first: MatchState;
            matches: MatchState[];
            winsMine: number;
            winsRival: number;
        }>;
        if (!currentUserId) return [];

        const grouped = new Map<string, MatchState[]>();
        historyFocusMatches
            .filter((m) => Boolean(m.series?.id))
            .forEach((m) => {
                const sid = m.series!.id;
                const arr = grouped.get(sid) ?? [];
                arr.push(m);
                grouped.set(sid, arr);
            });

        return Array.from(grouped.entries())
            .map(([id, arr]) => {
                const matches = [...arr].sort((a, b) => getMatchEffectiveDate(a) - getMatchEffectiveDate(b));
                let winsMine = 0;
                let winsRival = 0;
                matches.forEach((m) => {
                    const myTeam = getTeamIdForUser(m, currentUserId);
                    if (!myTeam) return;
                    if (m.winner === myTeam) winsMine++;
                    else winsRival++;
                });
                return { id, first: matches[0], matches, winsMine, winsRival };
            })
            .sort((a, b) => getMatchEffectiveDate(b.matches[b.matches.length - 1]) - getMatchEffectiveDate(a.matches[a.matches.length - 1]));
    }, [historyFocus, historyFocusMatches, currentUserId]);

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
                const matches = [...ms].sort((a, b) => getMatchEffectiveDate(a) - getMatchEffectiveDate(b));
                const first = matches[0];
                const last = matches[matches.length - 1];
                const winsNos = matches.filter((m) => m.winner === 'nosotros').length;
                const winsEll = matches.filter((m) => m.winner === 'ellos').length;
                const targetWins = first.series?.targetWins ?? 2;
                const closedManually = matches.some((m) => Boolean(m.series?.closedManually));
                const seriesName = last.series?.name ?? first.series?.name ?? `${first.teams.nosotros.name} vs ${first.teams.ellos.name}`;
                return {
                    seriesId,
                    matches,
                    first,
                    seriesName,
                    winsNos,
                    winsEll,
                    targetWins,
                    closedManually,
                    isFinished: winsNos >= targetWins || winsEll >= targetWins || closedManually
                };
            })
            .sort((a, b) => getMatchEffectiveDate(b.matches[b.matches.length - 1]) - getMatchEffectiveDate(a.matches[a.matches.length - 1]));
    }, [filteredMatches]);

    const selectedSeriesData = useMemo(
        () => groupedSeries.find((s) => s.seriesId === selectedSeriesId) ?? null,
        [groupedSeries, selectedSeriesId]
    );

    const locationSuggestions = useMemo(() => (
        Array.from(
            new Set(
                matches
                    .map((m) => m.metadata?.location?.trim())
                    .filter((loc): loc is string => Boolean(loc))
            )
        ).slice(0, 12)
    ), [matches]);

    const updateSeriesMetadata = async (
        seriesId: string,
        changes: { name?: string; closedManually?: boolean }
    ) => {
        if (!currentUserId) return;
        const seriesMatches = matches.filter((m) => m.series?.id === seriesId);
        const updatable = seriesMatches.filter((m) => canUserEditMatch(m, currentUserId));
        if (updatable.length === 0) {
            alert('No tenés permisos para editar esta serie.');
            return;
        }

        try {
            await Promise.all(updatable.map(async (m) => {
                const nextSeries = {
                    ...m.series!,
                    name: changes.name ?? m.series?.name ?? `${m.teams.nosotros.name} vs ${m.teams.ellos.name}`,
                    closedManually: changes.closedManually ?? (m.series?.closedManually ?? false),
                    closedAt: changes.closedManually === undefined
                        ? (m.series?.closedAt ?? null)
                        : (changes.closedManually ? Date.now() : null)
                };
                await updateMatch({ ...m, series: nextSeries }, currentUserId);
            }));
        } catch (err) {
            console.error('Error actualizando serie', err);
            alert('No se pudo actualizar la serie.');
        }
    };

    const getResultEditTooltip = (match: MatchState): string => {
        if (!match.edits || match.edits.length === 0) return '';
        const resultKeys = new Set<MatchEditField['key']>(['winner', 'score_nosotros', 'score_ellos']);
        const resultEdit = [...match.edits]
            .reverse()
            .find((e) => e.fields.some((f) => resultKeys.has(f.key)));

        if (!resultEdit) return '';
        const editor = getPlayerName(resultEdit.byUserId);
        const when = formatDateTimeDisplay(resultEdit.at);
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

    const saveCurrentView = () => {
        const name = window.prompt('Nombre corto para esta vista (ej: Clasico 2v2)');
        const trimmed = name?.trim();
        if (!trimmed) return;
        const next: SavedHistoryView = {
            id: crypto.randomUUID(),
            name: trimmed,
            scope,
            mode,
            result,
            opponentId,
            opponentGroupKey,
            search,
            matchListView
        };
        setSavedViews((prev) => [next, ...prev].slice(0, 8));
    };

    const applySavedView = (viewId: string) => {
        const view = savedViews.find((v) => v.id === viewId);
        if (!view) return;
        setScope(view.scope);
        setMode(view.mode);
        setResult(view.result);
        setOpponentId(view.opponentId);
        setOpponentGroupKey(view.opponentGroupKey);
        setSearch(view.search);
        setMatchListView(view.matchListView);
    };

    const removeSavedView = (viewId: string) => {
        setSavedViews((prev) => prev.filter((v) => v.id !== viewId));
    };

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

    const onRootTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
        if (selectedMatch || selectedSeriesId) return;
        const t = e.touches[0];
        if (!t) return;
        if (t.clientX > 28) {
            edgeSwipeStartRef.current = null;
            edgeSwipeTriggeredRef.current = false;
            return;
        }
        edgeSwipeStartRef.current = { x: t.clientX, y: t.clientY };
        edgeSwipeTriggeredRef.current = false;
    };

    const onRootTouchMove: TouchEventHandler<HTMLDivElement> = (e) => {
        if (!edgeSwipeStartRef.current || edgeSwipeTriggeredRef.current) return;
        const t = e.touches[0];
        if (!t) return;
        const dx = t.clientX - edgeSwipeStartRef.current.x;
        const dy = Math.abs(t.clientY - edgeSwipeStartRef.current.y);
        if (dx > 82 && dy < 36) {
            edgeSwipeTriggeredRef.current = true;
            onBack();
        }
    };

    const onRootTouchEnd: TouchEventHandler<HTMLDivElement> = () => {
        edgeSwipeStartRef.current = null;
        edgeSwipeTriggeredRef.current = false;
    };

    return (
        <div
            className="full-screen bg-[var(--color-bg)] flex flex-col p-5 overflow-hidden safe-px"
            style={{ paddingTop: 'max(20px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
            onTouchStart={onRootTouchStart}
            onTouchMove={onRootTouchMove}
            onTouchEnd={onRootTouchEnd}
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
                {(['SUMMARY', 'MATCHES'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border card-smooth ${tab === t ? 'bg-white text-black border-white' : 'bg-white/5 text-white/40 border-white/10'}`}
                    >
                        {TAB_META[t].title}
                    </button>
                ))}
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-black tracking-wide">{TAB_META[tab].title}</div>
                <div className="text-[11px] text-white/55">{TAB_META[tab].hint}</div>
            </div>

            {tab === 'MATCHES' && (
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

                    <div className="mb-4">
                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={saveCurrentView}
                                className="min-h-11 px-3 py-2 rounded-full text-[10px] font-black bg-white/10 border border-white/20 text-white/70"
                            >
                                Guardar vista
                            </button>
                        </div>
                        {savedViews.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                {savedViews.map((view) => (
                                    <div key={view.id} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full pr-1">
                                        <button
                                            onClick={() => applySavedView(view.id)}
                                            className="px-3 py-2 text-[10px] font-black text-white/70 whitespace-nowrap"
                                        >
                                            {view.name}
                                        </button>
                                        <button
                                            onClick={() => removeSavedView(view.id)}
                                            className="w-6 h-6 rounded-full text-[10px] font-black text-white/60 bg-white/10"
                                            aria-label={`Eliminar vista ${view.name}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar scroll-safe pr-3">
                {isLoading && (
                    <div className="space-y-3">
                        <div className="h-24 skeleton-block rounded-3xl" />
                        <div className="h-40 skeleton-block rounded-3xl" />
                        <div className="h-20 skeleton-block rounded-2xl" />
                        <div className="h-20 skeleton-block rounded-2xl" />
                    </div>
                )}

                {!isLoading && tab === 'SUMMARY' && (
                    <div className="flex flex-col gap-3 tab-content-enter">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {STATS_MODE_TABS.map((sm) => (
                                <button
                                    key={sm}
                                    onClick={() => setStatsMode(sm)}
                                    className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${statsMode === sm ? 'bg-white text-black border-white' : 'bg-white/5 text-white/45 border-white/10'}`}
                                >
                                    {sm}
                                </button>
                            ))}
                        </div>

                        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 relative overflow-hidden card-smooth">
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(74,222,128,0.14),transparent_44%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.04),transparent_40%)]" />
                            <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-[10px] text-white/40 uppercase tracking-[0.18em] font-black">Resumen {statsMode}</div>
                                <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/75">
                                    {statsMode}
                                </span>
                            </div>
                            <div className="text-[34px] font-black leading-none tabular-nums">
                                {summaryStats.total} <span className="text-[16px] text-white/65">PJ</span>
                            </div>
                            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                                <div className="h-3 w-full flex">
                                    <div
                                        className="h-full bg-[var(--color-nosotros)]"
                                        style={{ width: `${summaryStats.total ? (summaryStats.wins / summaryStats.total) * 100 : 0}%` }}
                                    />
                                    <div
                                        className="h-full bg-[var(--color-danger)]"
                                        style={{ width: `${summaryStats.total ? (summaryStats.losses / summaryStats.total) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="px-3 py-2 flex items-center justify-between text-[11px] font-black">
                                    <span className="text-[var(--color-nosotros)]">
                                        {summaryStats.wins} ({summaryStats.total ? Math.round((summaryStats.wins / summaryStats.total) * 100) : 0}%)
                                    </span>
                                    <span className="text-[var(--color-danger)]">
                                        {summaryStats.losses} ({summaryStats.total ? Math.round((summaryStats.losses / summaryStats.total) * 100) : 0}%)
                                    </span>
                                </div>
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-black mt-3 text-center">Ultimos 10</div>
                            <div className="mt-3 grid grid-cols-10 gap-2 w-full">
                                {Array.from({ length: 10 }).map((_, idx) => {
                                    const item = summaryForm[idx] ?? null;
                                    const cls = item === 'G'
                                        ? 'bg-[var(--color-nosotros)] border-[var(--color-nosotros)]/90 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                                        : item === 'P'
                                            ? 'bg-[var(--color-danger)] border-[var(--color-danger)]/90 shadow-[0_0_10px_rgba(255,69,58,0.35)]'
                                            : 'bg-white/5 border-white/15';
                                    return <span key={`summary-slot-${idx}`} className={`w-full aspect-square rounded-full border ${cls}`} />;
                                })}
                            </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border)] p-4 card-smooth">
                            <div className="text-[10px] text-white/40 uppercase tracking-[0.18em] font-black mb-3">Historial principal</div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2">
                                {HISTORY_FOCUS_TABS.map((hf) => (
                                    <button
                                        key={hf.key}
                                        onClick={() => setHistoryFocus(hf.key)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${historyFocus === hf.key ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]' : 'bg-white/5 text-white/45 border-white/10'}`}
                                    >
                                        {hf.label}
                                    </button>
                                ))}
                            </div>

                            {historyFocus === 'MI_EQUIPO' && (
                                <select
                                    value={myTeamKey}
                                    onChange={(e) => setMyTeamKey(e.target.value)}
                                    className="w-full mb-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold"
                                >
                                    <option value="ALL">Todos mis equipos</option>
                                    {myTeamOptions.map((team) => (
                                        <option key={team.key} value={team.key}>{team.label} · {team.count} PJ</option>
                                    ))}
                                </select>
                            )}

                            {historyFocus === 'CLASICOS' && (
                                <div className="mb-3">
                                    <select
                                        value={classicKey}
                                        onChange={(e) => setClassicKey(e.target.value)}
                                        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-xs font-bold"
                                    >
                                        <option value="AUTO">Clasico principal</option>
                                        {classicOptions.map((classic) => (
                                            <option key={classic.key} value={classic.key}>
                                                {classic.isFavorite ? '★ ' : ''}{classic.label} · {classic.count} PJ{classic.isHot ? ' · Activo' : ''}
                                            </option>
                                        ))}
                                    </select>

                                    {favoriteClassics.length > 0 && (
                                        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                                            {favoriteClassics.map((classic) => (
                                                <button
                                                    key={`fav-${classic.key}`}
                                                    onClick={() => setClassicKey(classic.key)}
                                                    className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap border ${activeClassicKey === classic.key ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]' : 'bg-white/5 text-white/60 border-white/10'}`}
                                                >
                                                    ★ {classic.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setIsClassicOpen((v) => !v)}
                                    className="text-left bg-white/5 border border-white/10 rounded-2xl px-3 py-3 relative overflow-hidden"
                                >
                                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(74,222,128,0.12),transparent_40%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.03),transparent_40%)]" />
                                    <div className="relative">
                                    <div className="text-[10px] text-white/45 uppercase tracking-[0.14em] font-black mb-1">
                                        Ficha resumen
                                    </div>
                                    <div className="text-[32px] font-black leading-none tabular-nums mt-1">
                                        {historySummary.total} <span className="text-[14px] text-white/65">PJ</span>
                                    </div>
                                    <div className="mt-2 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                                        <div className="h-3 w-full flex">
                                            <div
                                                className="h-full bg-[var(--color-nosotros)]"
                                                style={{ width: `${historySummary.total ? (historySummary.wins / historySummary.total) * 100 : 0}%` }}
                                            />
                                            <div
                                                className="h-full bg-[var(--color-danger)]"
                                                style={{ width: `${historySummary.total ? (historySummary.losses / historySummary.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <div className="px-3 py-2 flex items-center justify-between text-[11px] font-black">
                                            <span className="text-[var(--color-nosotros)]">
                                                {historySummary.wins} ({historySummary.total ? Math.round((historySummary.wins / historySummary.total) * 100) : 0}%)
                                            </span>
                                            <span className="text-[var(--color-danger)]">
                                                {historySummary.losses} ({historySummary.total ? Math.round((historySummary.losses / historySummary.total) * 100) : 0}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-black mt-3 text-center">Ultimos 10</div>
                                    <div className="mt-2 grid grid-cols-10 gap-2 w-full">
                                        {Array.from({ length: 10 }).map((_, idx) => {
                                            const item = historyForm[idx] ?? null;
                                            const cls = item === 'G'
                                                ? 'bg-[var(--color-nosotros)] border-[var(--color-nosotros)]/90 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                                                : item === 'P'
                                                    ? 'bg-[var(--color-danger)] border-[var(--color-danger)]/90 shadow-[0_0_10px_rgba(255,69,58,0.35)]'
                                                    : 'bg-white/5 border-white/15';
                                            return (
                                                <span
                                                    key={`history-form-slot-${idx}`}
                                                    className={`w-full aspect-square rounded-full border ${cls}`}
                                                    title={item ? `Partido ${idx + 1}: ${item}` : `Partido ${idx + 1}: sin dato`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="text-[10px] text-white/45 uppercase tracking-wider mt-2">
                                        {isClassicOpen ? 'Ocultar detalle' : 'Ver detalle'}
                                    </div>
                                    </div>
                                </button>

                                {historyFocus === 'CLASICOS' && classicOptions.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                        {classicOptions.slice(0, 6).map((classic) => (
                                            <button
                                                key={`classic-pin-${classic.key}`}
                                                onClick={() => toggleFavoriteClassic(classic.key)}
                                                className={`px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap border ${classic.isFavorite ? 'bg-amber-300/20 text-amber-300 border-amber-300/30' : 'bg-white/5 text-white/55 border-white/10'}`}
                                            >
                                                {classic.isFavorite ? '★ ' : '☆ '}
                                                {classic.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {!isClassicOpen && historySummary.total === 0 && (
                                    <div className="text-sm text-white/30">
                                        {historyFocus === 'CLASICOS' ? 'No hay clasicos (minimo 3 PJ por cruce).' : 'Sin partidos para esta vista.'}
                                    </div>
                                )}

                                {isClassicOpen && historySummary.total > 0 && historyFocus === 'CLASICOS' && classicSeriesGroups.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        {classicSeriesGroups.map((serie) => (
                                            <div key={serie.id} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                                {(() => {
                                                    const targetWins = serie.first.series?.targetWins ?? 2;
                                                    const isFinished = serie.winsMine >= targetWins || serie.winsRival >= targetWins;
                                                    const lastMatch = serie.matches[serie.matches.length - 1];
                                                    const lastLocation = lastMatch.metadata?.location?.trim() || 'Sin sede';
                                                    return (
                                                        <>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <div className="text-[9px] text-white/45 uppercase tracking-widest font-black">Fecha</div>
                                                        <div className="text-[12px] font-black">{formatDateDisplay(getMatchEffectiveDate(lastMatch))}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-white/45 uppercase tracking-widest font-black">Sede</div>
                                                        <div className="text-[12px] font-black truncate" title={lastLocation}>{lastLocation}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-white/45 uppercase tracking-widest font-black">Resultado</div>
                                                        <div className="text-[12px] font-black">{serie.winsMine} - {serie.winsRival}</div>
                                                    </div>
                                                </div>
                                                {onStartSeriesFromHistory && currentUserId && isParticipant(serie.first, currentUserId) && (
                                                    <div className="flex gap-2 mt-2">
                                                        {!isFinished && (
                                                            <button
                                                                onClick={() => onStartSeriesFromHistory(serie.first, 'continue')}
                                                                className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                                                            >
                                                                Continuar
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => onStartSeriesFromHistory(serie.first, 'new')}
                                                            className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/70"
                                                        >
                                                            Nueva serie
                                                        </button>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setSeriesResultFilter('ALL');
                                                        setSelectedSeriesId(serie.id);
                                                    }}
                                                    className="w-full mt-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/70"
                                                >
                                                    Detalle serie
                                                </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isClassicOpen && historySummary.total > 0 && (historyFocus !== 'CLASICOS' || classicSeriesGroups.length === 0) && (
                                    <div className="flex flex-col gap-2">
                                        {compactHistory.map((row) => (
                                            <button key={row.id} onClick={() => setSelectedMatch(matches.find((m) => m.id === row.id) ?? null)} className="text-left bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                                                <div className="text-[12px] font-black flex items-center gap-2.5">
                                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${row.code === 'G' ? 'bg-[var(--color-nosotros)]/20 text-[var(--color-nosotros)]' : 'bg-[var(--color-ellos)]/20 text-[var(--color-ellos)]'}`}>{row.code}</span>
                                                    <span className="truncate">{row.line1}</span>
                                                </div>
                                                <div className="text-[10px] text-white/45 uppercase tracking-[0.08em] mt-1">{row.line2}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!isLoading && tab === 'MATCHES' && (
                    <div className="flex flex-col gap-3 tab-content-enter">
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
                                className={`flex-1 py-2 rounded-lg text-xs font-black card-smooth ${matchListView === 'SERIES' ? 'bg-white text-black' : 'text-white/50'}`}
                            >
                                Series
                            </button>
                            <button
                                onClick={() => setMatchListView('MATCHES')}
                                className={`flex-1 py-2 rounded-lg text-xs font-black card-smooth ${matchListView === 'MATCHES' ? 'bg-white text-black' : 'text-white/50'}`}
                            >
                                Partidos
                            </button>
                        </div>

                        {groupedSeries.length > 0 && matchListView === 'MATCHES' && (
                            <button
                                onClick={() => setMatchListView('SERIES')}
                                className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                            >
                                Ver series sugeridas ({groupedSeries.length})
                            </button>
                        )}

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
                        {filteredMatches.length > 0 && (
                            <div className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-black px-1">
                                {filteredMatches.length} resultado{filteredMatches.length === 1 ? '' : 's'}
                            </div>
                        )}

                        {matchListView === 'SERIES' && groupedSeries.length > 0 && (
                            <div className="flex flex-col gap-3">
                                {groupedSeries.map((serie) => {
                                    const sid = serie.seriesId;
                                    const isOpen = openSeriesId === sid;
                                    const first = serie.first;
                                    const lastMatch = serie.matches[serie.matches.length - 1];
                                    const lastLocation = lastMatch.metadata?.location?.trim() || 'Sin sede';
                                    const canQuickStart = scope === 'MINE' && !!currentUserId && isParticipant(first, currentUserId);
                                    return (
                                        <div key={sid} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden card-smooth">
                                            <button
                                                onClick={() => setOpenSeriesId((v) => (v === sid ? null : sid))}
                                                className="w-full text-left p-3"
                                            >
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <div className="text-[9px] uppercase text-white/45 font-black tracking-widest">Fecha</div>
                                                        <div className="text-xs font-black">{formatDateDisplay(getMatchEffectiveDate(lastMatch))}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] uppercase text-white/45 font-black tracking-widest">Sede</div>
                                                        <div className="text-xs font-black truncate" title={lastLocation}>{lastLocation}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] uppercase text-white/45 font-black tracking-widest">Resultado</div>
                                                        <div className="text-xs font-black">{serie.winsNos} - {serie.winsEll}</div>
                                                    </div>
                                                </div>
                                            </button>

                                            {canQuickStart && onStartSeriesFromHistory && (
                                                <div className="px-4 pb-3 flex gap-2">
                                                    {!serie.isFinished && (
                                                        <button
                                                            onClick={() => onStartSeriesFromHistory(first, 'continue')}
                                                            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                                                        >
                                                            Continuar serie
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => onStartSeriesFromHistory(first, 'new')}
                                                        className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/70"
                                                    >
                                                        Nueva serie
                                                    </button>
                                                </div>
                                            )}
                                            <div className="px-4 pb-3">
                                                <button
                                                    onClick={() => {
                                                        setSeriesResultFilter('ALL');
                                                        setSelectedSeriesId(sid);
                                                    }}
                                                    className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/70"
                                                >
                                                    Abrir detalle de serie
                                                </button>
                                            </div>

                                            {isOpen && (
                                                <div className="border-t border-white/10 p-3 flex flex-col gap-2 bg-black/10">
                                                    {serie.matches.map((m) => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => setSelectedMatch(m)}
                                                            className="text-left bg-white/5 border border-white/10 rounded-xl p-3"
                                                        >
                                                            <div className="text-[10px] uppercase text-white/40 font-black tracking-widest">
                                                                Partido {m.series?.gameNumber ?? '-'} · {formatDateTimeDisplay(getMatchEffectiveDate(m))}
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
                                    className="w-full text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 active:scale-[0.99] transition-transform card-smooth"
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
                                            <span className="text-[10px] uppercase text-white/40 font-black tracking-widest">{formatDateDisplay(getMatchEffectiveDate(m))}</span>
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
            {selectedSeriesData && (
                <SeriesDetailDrawer
                    key={selectedSeriesData.seriesId}
                    series={selectedSeriesData}
                    currentUserId={currentUserId}
                    getPlayerName={getPlayerName}
                    resultFilter={seriesResultFilter}
                    onChangeResultFilter={setSeriesResultFilter}
                    onClose={() => setSelectedSeriesId(null)}
                    onOpenMatch={(match) => {
                        setSelectedSeriesId(null);
                        setSelectedMatch(match);
                    }}
                    onUpdateSeries={updateSeriesMetadata}
                />
            )}
        </div>
    );
};

interface SeriesDetailDrawerProps {
    series: {
        seriesId: string;
        matches: MatchState[];
        first: MatchState;
        seriesName: string;
        winsNos: number;
        winsEll: number;
        targetWins: number;
        closedManually: boolean;
        isFinished: boolean;
    };
    currentUserId: string | null;
    getPlayerName: (id: string) => string;
    resultFilter: SeriesResultFilter;
    onChangeResultFilter: (filter: SeriesResultFilter) => void;
    onClose: () => void;
    onOpenMatch: (match: MatchState) => void;
    onUpdateSeries: (seriesId: string, changes: { name?: string; closedManually?: boolean }) => Promise<void>;
}

const SeriesDetailDrawer = ({
    series,
    currentUserId,
    getPlayerName,
    resultFilter,
    onChangeResultFilter,
    onClose,
    onOpenMatch,
    onUpdateSeries
}: SeriesDetailDrawerProps) => {
    const [isSavingSeries, setIsSavingSeries] = useState(false);
    const [seriesName, setSeriesName] = useState(series.seriesName);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const swipeTriggeredRef = useRef(false);

    const mySide = currentUserId ? getTeamIdForUser(series.first, currentUserId) : null;
    const filteredTimeline = useMemo(() => {
        if (!mySide || resultFilter === 'ALL') return series.matches;
        return series.matches.filter((m) => {
            const won = m.winner === mySide;
            return resultFilter === 'G' ? won : !won;
        });
    }, [series.matches, mySide, resultFilter]);

    const onDrawerTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
        const t = e.touches[0];
        if (!t) return;
        swipeStartRef.current = { x: t.clientX, y: t.clientY };
        swipeTriggeredRef.current = false;
    };

    const onDrawerTouchMove: TouchEventHandler<HTMLDivElement> = (e) => {
        if (!swipeStartRef.current || swipeTriggeredRef.current) return;
        const t = e.touches[0];
        if (!t) return;
        const dy = t.clientY - swipeStartRef.current.y;
        const dx = Math.abs(t.clientX - swipeStartRef.current.x);
        if (dy > 96 && dx < 42) {
            swipeTriggeredRef.current = true;
            onClose();
        }
    };

    const onDrawerTouchEnd: TouchEventHandler<HTMLDivElement> = () => {
        swipeStartRef.current = null;
        swipeTriggeredRef.current = false;
    };

    return (
        <div className="fixed inset-0 z-[121] bg-black/70 backdrop-blur-sm flex items-end">
            <div
                className="w-full bg-[var(--color-bg)] border-t border-[var(--color-border)] rounded-t-3xl p-5 max-h-[88vh] overflow-y-auto custom-scrollbar safe-px safe-pb"
                style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
                onTouchStart={onDrawerTouchStart}
                onTouchMove={onDrawerTouchMove}
                onTouchEnd={onDrawerTouchEnd}
            >
                <div className="sticky top-0 z-10 bg-[var(--color-bg)] pb-3">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-white/40 font-black">
                                Serie BO{(series.targetWins * 2) - 1}
                            </div>
                            <div className="text-lg font-black">Detalle de serie</div>
                        </div>
                        <button onClick={onClose} className="text-white/60 font-black text-sm">Cerrar</button>
                    </div>
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3 mb-3">
                        <input
                            value={seriesName}
                            onChange={(e) => setSeriesName(e.target.value)}
                            className="w-full mb-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm font-black"
                            placeholder="Nombre de serie"
                        />
                        <div className="text-sm font-black">
                            {series.first.teams.nosotros.name} {series.winsNos} - {series.winsEll} {series.first.teams.ellos.name}
                        </div>
                        <div className="text-[11px] text-white/55 mt-1">
                            {series.matches.length} partidos · {series.isFinished ? 'Serie cerrada' : 'Serie en curso'}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button
                                disabled={isSavingSeries}
                                onClick={async () => {
                                    const trimmed = seriesName.trim();
                                    if (!trimmed) return;
                                    setIsSavingSeries(true);
                                    await onUpdateSeries(series.seriesId, { name: trimmed });
                                    setIsSavingSeries(false);
                                }}
                                className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/15 bg-white/5 text-white/70 disabled:opacity-60"
                            >
                                Guardar nombre
                            </button>
                            <button
                                disabled={isSavingSeries}
                                onClick={async () => {
                                    setIsSavingSeries(true);
                                    await onUpdateSeries(series.seriesId, { closedManually: !series.closedManually });
                                    setIsSavingSeries(false);
                                }}
                                className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-accent)] disabled:opacity-60"
                            >
                                {series.closedManually ? 'Reabrir serie' : 'Cerrar serie'}
                            </button>
                        </div>
                    </div>
                    <div className="flex bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)]">
                        {(['ALL', 'G', 'P'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => onChangeResultFilter(f)}
                                className={`flex-1 py-2 rounded-lg text-xs font-black ${resultFilter === f ? 'bg-white text-black' : 'text-white/50'}`}
                            >
                                {f === 'ALL' ? 'Todos' : f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {filteredTimeline.length === 0 && (
                        <div className="text-sm text-white/35 py-6 text-center">No hay partidos con ese filtro.</div>
                    )}
                    {filteredTimeline.map((m) => {
                        const side = currentUserId ? getTeamIdForUser(m, currentUserId) : null;
                        const isWin = side ? m.winner === side : null;
                        return (
                            <button
                                key={m.id}
                                onClick={() => onOpenMatch(m)}
                                className="text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-[10px] uppercase tracking-widest text-white/45 font-black">
                                        Partido {m.series?.gameNumber ?? '-'}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/45 font-black">
                                        {formatDateDisplay(getMatchEffectiveDate(m))}
                                    </div>
                                </div>
                                <div className="text-sm font-black">
                                    {m.teams.nosotros.name} {m.teams.nosotros.score} - {m.teams.ellos.score} {m.teams.ellos.name}
                                </div>
                                <div className="text-[11px] text-white/50 mt-1">
                                    {m.teams.nosotros.players.map(getPlayerName).join(', ')} vs {m.teams.ellos.players.map(getPlayerName).join(', ')}
                                </div>
                                {isWin !== null && (
                                    <div className={`mt-1 text-[10px] font-black uppercase tracking-wider ${isWin ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                        {isWin ? 'G' : 'P'}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
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
        const ts = getMatchEffectiveDate(match);
        return formatDateInputLocal(ts);
    });
    const [scoreNos, setScoreNos] = useState(match.teams.nosotros.score);
    const [scoreEll, setScoreEll] = useState(match.teams.ellos.score);
    const [winner, setWinner] = useState<TeamId | null>(match.winner ?? null);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const swipeTriggeredRef = useRef(false);

    const canEdit = isParticipant(match, currentUserId);
    const editTitle = useMemo(() => {
        if (!match.edits || match.edits.length === 0) return '';
        const last = match.edits[match.edits.length - 1];
        const fields = last.fields.map((f) => `${f.key}: ${f.before ?? '-'} -> ${f.after ?? '-'}`).join(' | ');
        return `Editado por ${getPlayerName(last.byUserId)} el ${formatDateTimeDisplay(last.at)}. ${fields}`;
    }, [match.edits, getPlayerName]);

    const onDrawerTouchStart: TouchEventHandler<HTMLDivElement> = (e) => {
        const t = e.touches[0];
        if (!t) return;
        swipeStartRef.current = { x: t.clientX, y: t.clientY };
        swipeTriggeredRef.current = false;
    };

    const onDrawerTouchMove: TouchEventHandler<HTMLDivElement> = (e) => {
        if (!swipeStartRef.current || swipeTriggeredRef.current) return;
        const t = e.touches[0];
        if (!t) return;
        const dy = t.clientY - swipeStartRef.current.y;
        const dx = Math.abs(t.clientX - swipeStartRef.current.x);
        if (dy > 96 && dx < 42) {
            swipeTriggeredRef.current = true;
            onClose();
        }
    };

    const onDrawerTouchEnd: TouchEventHandler<HTMLDivElement> = () => {
        swipeStartRef.current = null;
        swipeTriggeredRef.current = false;
    };

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
        const prevDate = getMatchEffectiveDate(match);
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
                className="w-full bg-[var(--color-bg)] border-t border-[var(--color-border)] rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto custom-scrollbar safe-px safe-pb"
                style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
                onTouchStart={onDrawerTouchStart}
                onTouchMove={onDrawerTouchMove}
                onTouchEnd={onDrawerTouchEnd}
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
                                            {getPlayerName(edit.byUserId)} · {formatDateTimeDisplay(edit.at)}
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
