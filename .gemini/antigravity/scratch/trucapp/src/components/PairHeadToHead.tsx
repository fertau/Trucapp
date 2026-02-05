import { useState } from 'react';
import { usePairStore } from '../store/usePairStore';
import { useHistoryStore } from '../store/useHistoryStore';


export const PairHeadToHead = ({ onBack }: { onBack: () => void }) => {
    const pairs = usePairStore(state => state.pairs);
    const matches = useHistoryStore(state => state.matches);

    // Simplistic selector for demo
    // Ideally user selects 2 Pairs to compare.
    // Spec says "Cara a cara (Parejas)".
    // "Fernando+Julian vs Yoel+Alex"
    // So we need to select Pair A and Pair B.

    const [pairAId, setPairAId] = useState<string>('');
    const [pairBId, setPairBId] = useState<string>('');

    const pairA = pairs.find(p => p.id === pairAId);
    const pairB = pairs.find(p => p.id === pairBId);

    // Filter matches where both pairs participated
    const h2hMatches = matches.filter(m => {
        if (!m.pairs) return false;
        const pNos = m.pairs.nosotros;
        const pEll = m.pairs.ellos;

        if (!pNos || !pEll) return false;

        const hasA = pNos === pairAId || pEll === pairAId;
        const hasB = pNos === pairBId || pEll === pairBId;

        return hasA && hasB;
    });

    const stats = h2hMatches.reduce((acc, m) => {
        const winnerPairId = m.winner === 'nosotros' ? m.pairs!.nosotros : m.pairs!.ellos;
        if (winnerPairId === pairAId) acc.winsA++;
        else if (winnerPairId === pairBId) acc.winsB++;
        return acc;
    }, { winsA: 0, winsB: 0 });

    // Streak (Last 5)
    // Ordered by date desc
    const recentMatches = [...h2hMatches].sort((a, b) => b.startDate - a.startDate).slice(0, 5);
    const streak = recentMatches.map(m => {
        const winnerPairId = m.winner === 'nosotros' ? m.pairs!.nosotros : m.pairs!.ellos;
        return winnerPairId === pairAId ? 'W' : 'L';
    });

    const toggleFavorite = usePairStore(state => state.toggleFavorite);

    if (!pairAId || !pairBId) {
        return (
            <div className="full-screen bg-[var(--color-bg)] flex flex-col p-4">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-bold mb-6 self-start">← VOLVER</button>
                <h2 className="text-xl font-bold mb-8">COMPARAR PAREJAS</h2>

                {/* Selection UI */}
                <label className="text-xs font-bold uppercase mb-2">Pareja 1</label>
                <select
                    className="bg-[var(--color-surface)] p-3 rounded mb-4 text-white"
                    value={pairAId}
                    onChange={(e) => setPairAId(e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {pairs.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)).map(p => (
                        <option key={p.id} value={p.id}>
                            {p.isFavorite ? '★ ' : ''}{p.name}
                        </option>
                    ))}
                </select>

                <label className="text-xs font-bold uppercase mb-2">Pareja 2</label>
                <select
                    className="bg-[var(--color-surface)] p-3 rounded mb-4 text-white"
                    value={pairBId}
                    onChange={(e) => setPairBId(e.target.value)}
                >
                    <option value="">Seleccionar...</option>
                    {pairs.filter(p => p.id !== pairAId).map(p => (
                        <option key={p.id} value={p.id}>
                            {p.isFavorite ? '★ ' : ''}{p.name}
                        </option>
                    ))}
                </select>

                {matches.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No hay partidos registrados con parejas aún.</p>}
            </div>
        )
    }

    const totalMatches = stats.winsA + stats.winsB;
    const winRateA = totalMatches > 0 ? Math.round((stats.winsA / totalMatches) * 100) : 0;
    const winRateB = totalMatches > 0 ? Math.round((stats.winsB / totalMatches) * 100) : 0;

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => { setPairAId(''); setPairBId(''); }} className="text-[var(--color-text-muted)] font-bold text-sm">← NUEVA CONSULTA</button>
            </div>

            <h2 className="text-center font-bold text-[var(--color-text-muted)] mb-2 uppercase text-sm tracking-widest">CARA A CARA</h2>

            <div className="flex justify-between items-start mb-8 gap-4">
                <div className="flex-1 flex flex-col items-center">
                    <div className="font-black text-xl leading-tight text-center mb-2">{pairA?.name}</div>
                    <button
                        onClick={() => pairA && toggleFavorite(pairA.id)}
                        className={`text-2xl ${pairA?.isFavorite ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] opacity-50'}`}
                    >
                        {pairA?.isFavorite ? '★' : '☆'}
                    </button>
                </div>

                <div className="px-2 pt-2 text-sm font-bold text-[var(--color-text-muted)]">VS</div>

                <div className="flex-1 flex flex-col items-center">
                    <div className="font-black text-xl leading-tight text-center mb-2">{pairB?.name}</div>
                    <button
                        onClick={() => pairB && toggleFavorite(pairB.id)}
                        className={`text-2xl ${pairB?.isFavorite ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] opacity-50'}`}
                    >
                        {pairB?.isFavorite ? '★' : '☆'}
                    </button>
                </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-xl p-6 mb-8 border border-[var(--color-border)] shadow-lg">
                <h3 className="text-xs font-bold uppercase text-[var(--color-text-muted)] mb-6 text-center tracking-widest">Resumen Histórico</h3>

                {/* Wins Row */}
                <div className="flex justify-between items-end mb-6">
                    <div className="flex-1 text-center">
                        <div className="text-5xl font-black text-[var(--color-nosotros)]">{stats.winsA}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mt-1">Victorias</div>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="text-5xl font-black text-[var(--color-ellos)]">{stats.winsB}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mt-1">Victorias</div>
                    </div>
                </div>

                {/* Win Rate Row */}
                <div className="flex justify-between items-center mb-2 px-4 relative">
                    {/* Bar Background */}
                    <div className="absolute left-4 right-4 top-1/2 h-2 bg-[var(--color-bg)] rounded-full -z-0"></div>
                    {/* Bar Fill (Simple split) */}
                    <div
                        className="absolute left-4 top-1/2 h-2 bg-[var(--color-nosotros)] rounded-l-full -z-0 transition-all duration-1000"
                        style={{ width: `calc(${winRateA}% - 16px)` }}
                    ></div>
                    <div
                        className="absolute right-4 top-1/2 h-2 bg-[var(--color-ellos)] rounded-r-full -z-0 transition-all duration-1000"
                        style={{ width: `calc(${winRateB}% - 16px)` }}
                    ></div>

                    <div className="z-10 bg-[var(--color-surface)] px-2 text-xs font-bold text-[var(--color-text-muted)] tabular-nums">{winRateA}%</div>
                    <div className="z-10 text-[9px] font-bold uppercase text-[var(--color-text-muted)]">Rendimiento</div>
                    <div className="z-10 bg-[var(--color-surface)] px-2 text-xs font-bold text-[var(--color-text-muted)] tabular-nums">{winRateB}%</div>
                </div>


                <div className="border-t border-[var(--color-border)] pt-6 mt-6">
                    <div className="flex gap-1 justify-center mb-2">
                        {streak.map((r, i) => (
                            <div
                                key={i}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${r === 'W' ? 'bg-[var(--color-nosotros)] text-[var(--color-bg)]' : 'bg-[var(--color-ellos)] text-[var(--color-bg)]'}`}
                            >
                                {r}
                            </div>
                        ))}
                    </div>
                    <div className="text-center text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Últimos 5 (Local)</div>
                </div>
            </div>

            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-4 tracking-wider pl-2">Historial de Partidos</h3>
            <div className="flex flex-col gap-3">
                {h2hMatches.sort((a, b) => b.startDate - a.startDate).map(m => {
                    const date = new Date(m.metadata?.customDate || m.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                    const loc = m.metadata?.location || 'Sede';
                    const winA = (m.winner === 'nosotros' && m.pairs?.nosotros === pairAId) || (m.winner === 'ellos' && m.pairs?.ellos === pairAId);

                    return (
                        <div key={m.id} className="bg-[var(--color-surface)] p-4 rounded-xl border border-[var(--color-border)] flex justify-between items-center text-sm shadow-sm">
                            <div className="text-[var(--color-text-muted)] text-xs flex flex-col font-medium">
                                <span className="text-[var(--color-text-secondary)]">{date}</span>
                                <span className="uppercase tracking-wider text-[10px]">{loc}</span>
                            </div>
                            <div className="font-bold flex-1 text-center px-2">
                                {winA
                                    ? <span className="text-[var(--color-nosotros)]">Ganó {pairA?.name.split('+')[0]}</span>
                                    : <span className="text-[var(--color-ellos)]">Ganó {pairB?.name.split('+')[0]}</span>
                                }
                            </div>
                            <div className="font-mono font-bold text-lg text-[var(--color-text-primary)]">
                                {m.teams.nosotros.score} - {m.teams.ellos.score}
                            </div>
                        </div>
                    )
                })}
            </div>

        </div>
    );
};
