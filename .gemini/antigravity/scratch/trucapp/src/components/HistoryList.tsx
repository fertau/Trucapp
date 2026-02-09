import { useHistoryStore } from '../store/useHistoryStore';

export const HistoryList = () => {
    const matches = useHistoryStore(state => state.matches);

    if (matches.length === 0) {
        return (
            <div className="text-center text-[var(--color-text-muted)] py-8">
                No hay partidos registrados.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 py-2">
            {matches.map(match => {
                const isNosotrosWin = match.teams.nosotros.score > match.teams.ellos.score;

                return (
                    <div key={match.id} className="bg-[var(--color-surface)] p-4 rounded-[2rem] border border-[var(--color-border)] flex justify-between items-center shadow-lg active:scale-98 transition-all hover:bg-white/5 group">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${isNosotrosWin ? 'bg-[var(--color-nosotros)]/20 text-[var(--color-nosotros)] border border-[var(--color-nosotros)]/30' : 'bg-[var(--color-ellos)]/20 text-[var(--color-ellos)] border border-[var(--color-ellos)]/30'}`}>
                                {isNosotrosWin ? 'W' : 'L'}
                            </div>
                            <div className="flex flex-col">
                                <div className="flex flex-col gap-0.5 mt-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black tracking-tight ${isNosotrosWin ? 'text-white' : 'text-white/30'}`}>
                                            {match.teams.nosotros.score}
                                        </span>
                                        <span className={`text-[10px] font-bold truncate max-w-[100px] ${isNosotrosWin ? 'text-white/80' : 'text-white/20'}`}>
                                            {match.teams.nosotros.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black tracking-tight ${!isNosotrosWin ? 'text-white' : 'text-white/30'}`}>
                                            {match.teams.ellos.score}
                                        </span>
                                        <span className={`text-[10px] font-bold truncate max-w-[100px] ${!isNosotrosWin ? 'text-white/80' : 'text-white/20'}`}>
                                            {match.teams.ellos.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end opacity-40 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Dif.</span>
                            <span className={`text-xs font-black ${isNosotrosWin ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                {Math.abs(match.teams.nosotros.score - match.teams.ellos.score)}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
