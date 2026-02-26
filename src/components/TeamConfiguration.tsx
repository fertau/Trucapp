import { useRef, useState } from 'react';
import { usePairStore } from '../store/usePairStore';
import { useHistoryStore } from '../store/useHistoryStore';
import type { MatchPicaPicaConfig, Player, TeamId } from '../types';
import { formatDateInputLocal, parseDateInputLocal } from '../utils/date';
import { getMatchEffectiveDate } from '../utils/matchIdentity';

interface TeamConfigurationProps {
    players: Player[];
    requiredCount: number; // 2, 4 o 6
    onBack: () => void;
    onStartMatch: (
        teams: { nosotros: Player[], ellos: Player[] },
        metadata: { location: string, date: number, teamNames?: { nosotros: string, ellos: string } },
        pairIds: { nosotros?: string, ellos?: string },
        targetScore?: number,
        options?: { startBestOf3?: boolean; picaPica?: MatchPicaPicaConfig | null }
    ) => void;
}

type AutoDetectedTemplate = {
    matchId: string;
    date: number;
    nosotros: Player[];
    ellos: Player[];
    teamNames: {
        nosotros: string;
        ellos: string;
    };
};

const detectAutoTemplate = (
    players: Player[],
    matches: ReturnType<typeof useHistoryStore.getState>['matches'],
    mode: '1v1' | '2v2' | '3v3',
    limit: number
): AutoDetectedTemplate | null => {
    const availableMap = new Map(players.map((player) => [player.id, player]));
    const sortedMatches = [...matches].sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a));
    const candidate = sortedMatches.find((match) => {
        if (match.mode !== mode) return false;
        if (match.teams.nosotros.players.length !== limit || match.teams.ellos.players.length !== limit) return false;
        return [...match.teams.nosotros.players, ...match.teams.ellos.players].every((playerId) => availableMap.has(playerId));
    });
    if (!candidate) return null;

    const nextNosotros = candidate.teams.nosotros.players
        .map((playerId) => availableMap.get(playerId))
        .filter((player): player is Player => Boolean(player));
    const nextEllos = candidate.teams.ellos.players
        .map((playerId) => availableMap.get(playerId))
        .filter((player): player is Player => Boolean(player));
    if (nextNosotros.length !== limit || nextEllos.length !== limit) return null;

    return {
        matchId: candidate.id,
        date: getMatchEffectiveDate(candidate),
        nosotros: nextNosotros,
        ellos: nextEllos,
        teamNames: {
            nosotros: candidate.teams.nosotros.name || 'Equipo 1',
            ellos: candidate.teams.ellos.name || 'Equipo 2'
        }
    };
};

export const TeamConfiguration = ({ players, requiredCount, onBack, onStartMatch }: TeamConfigurationProps) => {
    const limit = requiredCount === 2 ? 1 : requiredCount === 4 ? 2 : 3;
    const mode = requiredCount === 2 ? '1v1' : requiredCount === 4 ? '2v2' : '3v3';
    const is2v2 = limit === 2;
    const supportsPicaPica = requiredCount === 6;
    const shouldShowPicaControls = supportsPicaPica;

    const matches = useHistoryStore(state => state.matches);
    const [detectedTemplate] = useState<AutoDetectedTemplate | null>(() => (
        detectAutoTemplate(players, matches, mode, limit)
    ));

    // We use a pool for unassigned players
    const [pool, setPool] = useState<Player[]>(() => {
        if (!detectedTemplate) return players;
        const selectedIds = new Set([
            ...detectedTemplate.nosotros.map((player) => player.id),
            ...detectedTemplate.ellos.map((player) => player.id)
        ]);
        return players.filter((player) => !selectedIds.has(player.id));
    });
    const [nosotros, setNosotros] = useState<Player[]>(() => detectedTemplate?.nosotros ?? []);
    const [ellos, setEllos] = useState<Player[]>(() => detectedTemplate?.ellos ?? []);
    const teamsSectionRef = useRef<HTMLDivElement | null>(null);

    const [location, setLocation] = useState('');
    const [customDate, setCustomDate] = useState<string>(() => formatDateInputLocal(Date.now()));
    const locationSuggestions = Array.from(
        new Set(
            matches
                .map(m => m.metadata?.location?.trim())
                .filter((loc): loc is string => Boolean(loc))
        )
    ).slice(0, 12);

    const { getOrCreatePair, updatePairName, findPairByPlayers } = usePairStore();
    const [nosotrosPairName, setNosotrosPairName] = useState('');
    const [ellosPairName, setEllosPairName] = useState('');
    const [isEditingNosotrosPair, setIsEditingNosotrosPair] = useState(false);
    const [isEditingEllosPair, setIsEditingEllosPair] = useState(false);
    const [nosotrosTeamName, setNosotrosTeamName] = useState(() => detectedTemplate?.teamNames.nosotros ?? 'Equipo 1');
    const [ellosTeamName, setEllosTeamName] = useState(() => detectedTemplate?.teamNames.ellos ?? 'Equipo 2');
    const [isEditingNosotrosTeam, setIsEditingNosotrosTeam] = useState(false);
    const [isEditingEllosTeam, setIsEditingEllosTeam] = useState(false);
    const [startBestOf3, setStartBestOf3] = useState(false);
    const [isPicaPicaEnabled, setIsPicaPicaEnabled] = useState(requiredCount === 6);
    const [picaPairingMap, setPicaPairingMap] = useState<Record<string, string>>({});

    const handlePairNameSave = (team: TeamId, name: string) => {
        if (team === 'nosotros' && nosotros.length === 2) {
            const pair = getOrCreatePair([nosotros[0].id, nosotros[1].id] as [string, string]);
            updatePairName(pair.id, name);
            setIsEditingNosotrosPair(false);
        }
        if (team === 'ellos' && ellos.length === 2) {
            const pair = getOrCreatePair([ellos[0].id, ellos[1].id] as [string, string]);
            updatePairName(pair.id, name);
            setIsEditingEllosPair(false);
        }
    };

    const getLimit = () => {
        if (requiredCount === 2) return 1;
        if (requiredCount === 4) return 2;
        return 3;
    };

    const moveToTeam = (player: Player, from: 'pool' | TeamId, to: 'pool' | TeamId) => {
        if (from === to) return;

        // Check limits if moving to a team
        if (to !== 'pool') {
            const targetTeam = to === 'nosotros' ? nosotros : ellos;
            if (targetTeam.length >= getLimit()) {
                // Return to pool if target is full
                return;
            }
        }

        // Remove from source
        if (from === 'pool') setPool(prev => prev.filter(p => p.id !== player.id));
        else if (from === 'nosotros') setNosotros(prev => prev.filter(p => p.id !== player.id));
        else setEllos(prev => prev.filter(p => p.id !== player.id));

        // Add to target
        if (to === 'pool') setPool(prev => [...prev, player]);
        else if (to === 'nosotros') setNosotros(prev => [...prev, player]);
        else setEllos(prev => [...prev, player]);
    };

    const isValid = nosotros.length === limit && ellos.length === limit;

    const normalizePicaMap = (source: Record<string, string>) => {
        if (!supportsPicaPica || nosotros.length !== limit || ellos.length !== limit) return source;

        const next: Record<string, string> = {};
        const usedEllos = new Set<string>();
        const availableEllos = ellos.map((p) => p.id);

        nosotros.forEach((player) => {
            const existing = source[player.id];
            if (existing && availableEllos.includes(existing) && !usedEllos.has(existing)) {
                next[player.id] = existing;
                usedEllos.add(existing);
                return;
            }
            const fallback = availableEllos.find((id) => !usedEllos.has(id));
            if (fallback) {
                next[player.id] = fallback;
                usedEllos.add(fallback);
            }
        });

        return next;
    };

    const normalizedPicaPairingMap = normalizePicaMap(picaPairingMap);

    const handlePicaPairingChange = (nosotrosId: string, ellosId: string) => {
        setPicaPairingMap((prev) => {
            const base = normalizePicaMap(prev);
            const previousValue = base[nosotrosId];
            const next = { ...base, [nosotrosId]: ellosId };
            const takenBy = Object.entries(next)
                .find(([id, assigned]) => id !== nosotrosId && assigned === ellosId)?.[0];
            if (takenBy) {
                next[takenBy] = previousValue ?? '';
            }
            return next;
        });
    };

    const picaPairings = nosotros
        .map((player) => {
            const rivalId = normalizedPicaPairingMap[player.id];
            if (!rivalId) return null;
            return {
                nosotrosId: player.id,
                ellosId: rivalId
            };
        })
        .filter((pairing): pairing is { nosotrosId: string; ellosId: string } => pairing !== null);

    const hasUniquePicaPairings = new Set(picaPairings.map((pairing) => pairing.ellosId)).size === picaPairings.length;
    const isPicaConfigValid = !shouldShowPicaControls || !isPicaPicaEnabled || (picaPairings.length === limit && hasUniquePicaPairings);

    const findHistoricTeamName = (playerIds: string[]): string => {
        if (playerIds.length === 0) return '';
        const key = [...playerIds].sort().join('|');
        const hit = [...matches]
            .sort((a, b) => getMatchEffectiveDate(b) - getMatchEffectiveDate(a))
            .find((m) => {
                const nos = [...m.teams.nosotros.players].sort().join('|');
                const ell = [...m.teams.ellos.players].sort().join('|');
                return nos === key || ell === key;
            });
        if (!hit) return '';
        const isNos = [...hit.teams.nosotros.players].sort().join('|') === key;
        return isNos ? hit.teams.nosotros.name : hit.teams.ellos.name;
    };
    const resolvePairName = (pairName: string | undefined, historic: string, fallback: string) => {
        const cleanedPair = (pairName ?? '').trim();
        if (cleanedPair && cleanedPair !== 'Pareja Sin Nombre') return cleanedPair;
        const cleanedHistoric = historic.trim();
        if (cleanedHistoric) return cleanedHistoric;
        if (cleanedPair) return cleanedPair;
        return fallback;
    };

    const defaultNosotrosPairName = nosotros.length === 2
        ? resolvePairName(
            findPairByPlayers([nosotros[0].id, nosotros[1].id])?.name,
            findHistoricTeamName([nosotros[0].id, nosotros[1].id]),
            `${nosotros[0].name} + ${nosotros[1].name}`
        )
        : '';
    const defaultEllosPairName = ellos.length === 2
        ? resolvePairName(
            findPairByPlayers([ellos[0].id, ellos[1].id])?.name,
            findHistoricTeamName([ellos[0].id, ellos[1].id]),
            `${ellos[0].name} + ${ellos[1].name}`
        )
        : '';
    const displayNosotrosPairName = nosotrosPairName || defaultNosotrosPairName;
    const displayEllosPairName = ellosPairName || defaultEllosPairName;
    const displayNosotrosTeamName = isEditingNosotrosTeam
        ? nosotrosTeamName
        : (limit === 1 && nosotros.length === 1 ? nosotros[0].name : (is2v2 ? (displayNosotrosPairName || nosotrosTeamName) : nosotrosTeamName));
    const displayEllosTeamName = isEditingEllosTeam
        ? ellosTeamName
        : (limit === 1 && ellos.length === 1 ? ellos[0].name : (is2v2 ? (displayEllosPairName || ellosTeamName) : ellosTeamName));

    // Drag & Drop Handlers
    const [draggedPlayer, setDraggedPlayer] = useState<{ p: Player, from: 'pool' | TeamId } | null>(null);

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg)] px-4 pt-4 pb-[calc(14px+env(safe-area-inset-bottom))] sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full"
                >
                    ← Volver
                </button>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                    {requiredCount === 2 ? '1v1' : requiredCount === 4 ? '2v2' : '3v3'}
                </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mb-0.5 sm:mb-1 uppercase italic tracking-tighter text-center">ARMAR EQUIPOS</h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-[var(--color-text-muted)] text-center mb-5 sm:mb-8 uppercase tracking-[0.2em]">Arrastrar para asignar</p>

            {detectedTemplate && (
                <div className="mb-5 rounded-2xl border border-[var(--color-accent)]/35 bg-[var(--color-accent)]/10 px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 flex items-center justify-center text-[11px]">
                            ✓
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[var(--color-accent)]">Equipos detectados</div>
                            <div className="text-[11px] leading-tight text-white/70">
                                Tomamos la ultima formacion de {mode} ({new Date(detectedTemplate.date).toLocaleDateString('es-AR')}).
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => teamsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            className="h-8 w-8 shrink-0 rounded-full border border-white/20 bg-white/10 text-[14px] flex items-center justify-center"
                            title="Editar equipos"
                            aria-label="Editar equipos"
                        >
                            ✎
                        </button>
                    </div>
                </div>
            )}

            {/* POOL SECTION */}
            <div
                className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-dashed mb-6 sm:mb-10 transition-colors ${draggedPlayer ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-[var(--color-border)] bg-[var(--color-surface)]/30'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => draggedPlayer && moveToTeam(draggedPlayer.p, draggedPlayer.from, 'pool')}
            >
                <div className="text-[9px] sm:text-[10px] font-black uppercase text-[var(--color-text-muted)] mb-3 sm:mb-4 tracking-widest text-center">Banquillo de Jugadores</div>
                <div className="flex flex-wrap gap-2 justify-center min-h-[44px] sm:min-h-[50px]">
                    {pool.map(p => (
                        <div
                            key={p.id}
                            draggable
                            onDragStart={() => setDraggedPlayer({ p, from: 'pool' })}
                            onDragEnd={() => setDraggedPlayer(null)}
                            onClick={() => {
                                if (nosotros.length < getLimit()) moveToTeam(p, 'pool', 'nosotros');
                                else if (ellos.length < getLimit()) moveToTeam(p, 'pool', 'ellos');
                            }}
                            className={`bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-sm cursor-grab active:scale-95 transition-all text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] ${draggedPlayer ? 'opacity-50' : ''}`}
                        >
                            {p.name}
                        </div>
                    ))}
                    {pool.length === 0 && <span className="text-xs text-[var(--color-text-muted)] italic font-medium">Todos asignados</span>}
                </div>
            </div>

            {/* TEAMS GRID */}
            <div ref={teamsSectionRef} className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-10">
                {/* NOSOTROS */}
                <div
                    className={`flex flex-col p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-all min-h-[136px] sm:min-h-[160px] ${draggedPlayer ? 'border-dashed border-[var(--color-nosotros)]/40 bg-[var(--color-nosotros)]/5' : 'border-transparent bg-[var(--color-surface)] shadow-inner'} ${nosotros.length >= getLimit() ? 'opacity-60' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => draggedPlayer && moveToTeam(draggedPlayer.p, draggedPlayer.from, 'nosotros')}
                >
                    <div className="flex justify-center items-center mb-3 sm:mb-4 px-2 overflow-hidden">
                        {isEditingNosotrosTeam ? (
                            <input
                                autoFocus
                                className="bg-transparent border-b border-[var(--color-nosotros)] text-[10px] font-black uppercase text-[var(--color-nosotros)] tracking-widest text-center w-full outline-none"
                                value={nosotrosTeamName}
                                onBlur={() => setIsEditingNosotrosTeam(false)}
                                onChange={e => setNosotrosTeamName(e.target.value)}
                            />
                        ) : (
                            <div
                                onClick={() => {
                                    setNosotrosTeamName(displayNosotrosTeamName);
                                    setIsEditingNosotrosTeam(true);
                                }}
                                className="text-[10px] font-black uppercase text-[var(--color-nosotros)] tracking-widest text-center px-1 truncate cursor-edit"
                            >
                                {displayNosotrosTeamName}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        {nosotros.map(p => (
                            <div
                                key={p.id}
                                draggable
                                onDragStart={() => setDraggedPlayer({ p, from: 'nosotros' })}
                                onDragEnd={() => setDraggedPlayer(null)}
                                onClick={() => moveToTeam(p, 'nosotros', 'pool')}
                                className="bg-[var(--color-nosotros)] text-black p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-center"
                            >
                                {p.name}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ELLOS */}
                <div
                    className={`flex flex-col p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 transition-all min-h-[136px] sm:min-h-[160px] ${draggedPlayer ? 'border-dashed border-[var(--color-ellos)]/40 bg-[var(--color-ellos)]/5' : 'border-transparent bg-[var(--color-surface)] shadow-inner'} ${ellos.length >= getLimit() ? 'opacity-60' : ''}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => draggedPlayer && moveToTeam(draggedPlayer.p, draggedPlayer.from, 'ellos')}
                >
                    <div className="flex justify-center items-center mb-3 sm:mb-4 px-2 overflow-hidden">
                        {isEditingEllosTeam ? (
                            <input
                                autoFocus
                                className="bg-transparent border-b border-[var(--color-ellos)] text-[10px] font-black uppercase text-[var(--color-ellos)] tracking-widest text-center w-full outline-none"
                                value={ellosTeamName}
                                onBlur={() => setIsEditingEllosTeam(false)}
                                onChange={e => setEllosTeamName(e.target.value)}
                            />
                        ) : (
                            <div
                                onClick={() => {
                                    setEllosTeamName(displayEllosTeamName);
                                    setIsEditingEllosTeam(true);
                                }}
                                className="text-[10px] font-black uppercase text-[var(--color-ellos)] tracking-widest text-center px-1 truncate cursor-edit"
                            >
                                {displayEllosTeamName}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        {ellos.map(p => (
                            <div
                                key={p.id}
                                draggable
                                onDragStart={() => setDraggedPlayer({ p, from: 'ellos' })}
                                onDragEnd={() => setDraggedPlayer(null)}
                                onClick={() => moveToTeam(p, 'ellos', 'pool')}
                                className="bg-[var(--color-ellos)] text-black p-3 sm:p-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm shadow-sm hover:scale-[1.02] active:scale-95 transition-all text-center"
                            >
                                {p.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* PAIRS UI */}
            {is2v2 && (
                <div className="mb-6 sm:mb-10 flex flex-col gap-2.5 sm:gap-3">
                    <div className="bg-[var(--color-surface)] p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--color-border)] shadow-sm">
                        <div className="text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-2 tracking-widest">Nombre Pareja (Nosotros)</div>
                        {isEditingNosotrosPair ? (
                            <div className="flex gap-2">
                                <input
                                    className="bg-transparent border-b border-[var(--color-accent)] w-full font-black text-sm outline-none"
                                    value={nosotrosPairName}
                                    onChange={(e) => setNosotrosPairName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={() => handlePairNameSave('nosotros', nosotrosPairName)} className="text-[var(--color-accent)] font-black text-xs">OK</button>
                            </div>
                        ) : (
                            <div
                                className="flex justify-between items-center"
                                onClick={() => {
                                    setNosotrosPairName(displayNosotrosPairName);
                                    setIsEditingNosotrosPair(true);
                                }}
                            >
                                <span className="font-black text-sm">{displayNosotrosPairName}</span>
                                <span className="text-[9px] text-[var(--color-accent)] font-black uppercase tracking-widest">Editar</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-[var(--color-surface)] p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--color-border)] shadow-sm">
                        <div className="text-[9px] text-[var(--color-text-muted)] uppercase font-black mb-2 tracking-widest">Nombre Pareja (Ellos)</div>
                        {isEditingEllosPair ? (
                            <div className="flex gap-2">
                                <input
                                    className="bg-transparent border-b border-[var(--color-accent)] w-full font-black text-sm outline-none"
                                    value={ellosPairName}
                                    onChange={(e) => setEllosPairName(e.target.value)}
                                    autoFocus
                                />
                                <button onClick={() => handlePairNameSave('ellos', ellosPairName)} className="text-[var(--color-accent)] font-black text-xs">OK</button>
                            </div>
                        ) : (
                            <div
                                className="flex justify-between items-center"
                                onClick={() => {
                                    setEllosPairName(displayEllosPairName);
                                    setIsEditingEllosPair(true);
                                }}
                            >
                                <span className="font-black text-sm">{displayEllosPairName}</span>
                                <span className="text-[9px] text-[var(--color-accent)] font-black uppercase tracking-widest">Editar</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {is2v2 && (
                <div className="mb-6 sm:mb-8">
                    <div className="text-[10px] font-black uppercase text-[var(--color-text-muted)] mb-2.5 sm:mb-3 tracking-widest border-b border-[var(--color-border)] pb-2">Formato</div>
                    <button
                        type="button"
                        onClick={() => setStartBestOf3((v) => !v)}
                        className={`w-full rounded-2xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-left transition-all ${startBestOf3 ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}
                    >
                        <div className="text-xs sm:text-sm font-black uppercase tracking-wide">Serie al mejor de 3</div>
                        <div className="text-[11px] opacity-80 mt-1">
                            {startBestOf3 ? 'Activado: se encadenan hasta 2 victorias.' : 'Desactivado: partido suelto.'}
                        </div>
                    </button>
                </div>
            )}

            {shouldShowPicaControls && (
                <div className="mb-6 sm:mb-8">
                    <div className="text-[10px] font-black uppercase text-[var(--color-text-muted)] mb-2.5 sm:mb-3 tracking-widest border-b border-[var(--color-border)] pb-2">Pica Pica</div>
                    <button
                        type="button"
                        onClick={() => setIsPicaPicaEnabled((value) => !value)}
                        className={`w-full rounded-2xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-left transition-all ${isPicaPicaEnabled
                            ? 'bg-[var(--color-accent)]/15 border-[var(--color-accent)]/40 text-[var(--color-accent)]'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]'
                            }`}
                    >
                        <div className="text-xs sm:text-sm font-black uppercase tracking-wide">Activar pica pica (20 a 25)</div>
                        <div className="text-[11px] opacity-80 mt-1">
                            {isPicaPicaEnabled
                                ? 'Encendido: rota mano de por medio según emparejamientos.'
                                : 'Apagado: partido normal sin pica pica.'}
                        </div>
                    </button>

                    {isPicaPicaEnabled && isValid && (
                        <div className="mt-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3">
                            <div className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] font-black mb-2">
                                Elegí los cruces 1v1
                            </div>
                            <div className="space-y-2">
                                {nosotros.map((player) => (
                                    <div key={`pica-row-${player.id}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                        <div className="text-xs font-black text-[var(--color-nosotros)] truncate">{player.name}</div>
                                        <div className="text-[10px] text-[var(--color-text-muted)] font-black uppercase">vs</div>
                                        <select
                                            value={normalizedPicaPairingMap[player.id] ?? ''}
                                            onChange={(event) => handlePicaPairingChange(player.id, event.target.value)}
                                            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs font-black text-[var(--color-ellos)]"
                                        >
                                            <option value="" disabled>Elegir rival</option>
                                            {ellos.map((rival) => (
                                                <option key={`pica-rival-${player.id}-${rival.id}`} value={rival.id}>{rival.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            {!isPicaConfigValid && (
                                <div className="mt-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-danger)]">
                                    Configurá cruces únicos para todos.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Metadata Section */}
            <div className="mb-8 sm:mb-12">
                <div className="text-[10px] font-black uppercase text-[var(--color-text-muted)] mb-3 sm:mb-4 tracking-widest border-b border-[var(--color-border)] pb-2">Información del Partido</div>
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] ml-2">Sede / Ubicación</label>
                        <input
                            type="text"
                            placeholder="Ej. Quincho de Julian"
                            list="location-suggestions"
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3.5 sm:p-4 rounded-2xl w-full font-bold text-sm outline-none focus:border-[var(--color-accent)]"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                            <button
                                type="button"
                                onClick={() => setLocation('')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap border ${location.trim() === '' ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]' : 'bg-white/5 text-white/55 border-white/15'}`}
                            >
                                Opcional
                            </button>
                            {locationSuggestions.map((loc) => (
                                <button
                                    key={`loc-chip-${loc}`}
                                    type="button"
                                    onClick={() => setLocation(loc)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide whitespace-nowrap border ${location === loc ? 'bg-[var(--color-accent)] text-black border-[var(--color-accent)]' : 'bg-white/5 text-white/55 border-white/15'}`}
                                >
                                    {loc}
                                </button>
                            ))}
                        </div>
                        <datalist id="location-suggestions">
                            {locationSuggestions.map((loc) => (
                                <option key={loc} value={loc} />
                            ))}
                        </datalist>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] ml-2">Fecha (Opcional)</label>
                        <input
                            type="date"
                            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-3.5 sm:p-4 rounded-2xl w-full font-bold text-sm outline-none focus:border-[var(--color-accent)]"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <button
                className="w-full bg-[var(--color-accent)] text-white py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl disabled:opacity-30 mt-auto shadow-2xl shadow-green-900/40 active:scale-95 transition-all"
                disabled={!isValid || !isPicaConfigValid}
                onClick={() => {
                    try {
                        let dateTs = Date.now();
                        const parsedDate = parseDateInputLocal(customDate);
                        if (parsedDate !== null) dateTs = parsedDate;

                        let pIds: { nosotros?: string, ellos?: string } = {};
                        if (is2v2) {
                            const pN = getOrCreatePair([nosotros[0].id, nosotros[1].id] as [string, string], defaultNosotrosPairName);
                            const pE = getOrCreatePair([ellos[0].id, ellos[1].id] as [string, string], defaultEllosPairName);
                            pIds = { nosotros: pN.id, ellos: pE.id };
                        }

                        const picaConfig: MatchPicaPicaConfig | null =
                            shouldShowPicaControls && isPicaPicaEnabled
                                ? {
                                    enabled: true,
                                    startAt: 20,
                                    endAt: 25,
                                    pairings: picaPairings,
                                    currentPairingIndex: 0
                                }
                                : null;

                        onStartMatch(
                            { nosotros, ellos },
                            {
                                location: location || 'Sin ubicación',
                                date: dateTs,
                                teamNames: { nosotros: displayNosotrosTeamName, ellos: displayEllosTeamName }
                            },
                            pIds,
                            undefined,
                            {
                                startBestOf3: is2v2 ? startBestOf3 : false,
                                picaPica: picaConfig
                            }
                        );
                    } catch (e) {
                        alert("Error al iniciar partido: " + JSON.stringify(e));
                        console.error(e);
                    }
                }}
            >
                COMENZAR PARTIDO
            </button>
        </div>
    );
};
