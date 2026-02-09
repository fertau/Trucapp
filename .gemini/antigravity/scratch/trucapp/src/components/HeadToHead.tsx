import { useHistoryStore } from '../store/useHistoryStore';

export const HeadToHead = () => {
    const matches = useHistoryStore(state => state.matches);

    // Calculate global stats
    const total = matches.length;
    const winsNos = matches.filter(m => m.winner === 'nosotros').length;
    const winRate = total > 0 ? Math.round((winsNos / total) * 100) : 0;
    const diff = matches.reduce((acc, match) => acc + (match.teams.nosotros.score - match.teams.ellos.score), 0);

    return (
        <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
            {/* Big Summary Card */}
            <div className="bg-gradient-to-br from-[#2c2c2e] to-[#1c1c1e] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

                <div className="flex justify-between items-end mb-8 relative z-10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] mb-1">Efectividad</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-6xl font-black tracking-tighter text-white italic">{winRate}</span>
                            <span className="text-2xl font-black text-[var(--color-accent)]">%</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`text-xl font-black ${diff >= 0 ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                            {diff >= 0 ? `+${diff}` : diff}
                        </span>
                        <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Puntos Totales</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                        <span className="text-xl font-black text-white">{total}</span>
                        <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Partidos</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center">
                        <span className="text-xl font-black text-[var(--color-nosotros)]">{winsNos}</span>
                        <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">Victorias</span>
                    </div>
                </div>
            </div>

            {/* Form / Streak */}
            <div className="flex flex-col gap-3 px-2">
                <h4 className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em] ml-2">Últimos Partidos</h4>
                <div className="flex gap-2 overflow-x-auto pb-2 px-1 no-scrollbar">
                    {matches.slice(0, 8).map(m => (
                        <div
                            key={m.id}
                            className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-xs transition-all border ${m.winner === 'nosotros'
                                ? 'bg-[var(--color-nosotros)]/20 text-[var(--color-nosotros)] border-[var(--color-nosotros)]/40'
                                : 'bg-[var(--color-ellos)]/20 text-[var(--color-ellos)] border-[var(--color-ellos)]/40'}`}
                        >
                            {m.winner === 'nosotros' ? 'W' : 'L'}
                        </div>
                    ))}
                    {matches.length === 0 && (
                        <div className="w-full text-center py-4 text-[10px] font-black text-white/10 uppercase tracking-widest">Sin datos</div>
                    )}
                </div>
            </div>
        </div>
    );
};
