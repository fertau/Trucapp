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
        <div className="flex flex-col gap-2">
            {matches.map(match => {
                const isNosotrosWin = match.teams.nosotros.score > match.teams.ellos.score;
                return (
                    <div key={match.id} className="bg-[var(--color-surface)] p-3 rounded border border-[var(--color-border)] flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-xs text-[var(--color-text-muted)] mb-1">
                                {new Date(match.startDate).toLocaleDateString()} - {match.mode}
                            </span>
                            <div className="font-bold flex gap-4">
                                <span className={isNosotrosWin ? 'text-[var(--color-nosotros)]' : ''}>
                                    NOS {match.teams.nosotros.score}
                                </span>
                                <span className={!isNosotrosWin ? 'text-[var(--color-ellos)]' : ''}>
                                    ELL {match.teams.ellos.score}
                                </span>
                            </div>
                        </div>
                        <div className="text-2xl">
                            {/* Icon or simplified result */}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
