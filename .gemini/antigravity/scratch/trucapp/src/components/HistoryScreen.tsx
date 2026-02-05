import { useHistoryStore } from '../store/useHistoryStore';
import type { MatchState } from '../types';

interface HistoryScreenProps {
    onBack: () => void;
}

export const HistoryScreen = ({ onBack }: HistoryScreenProps) => {
    const matches = useHistoryStore(state => state.matches);

    // Grouping by Date/Location could be complex. 
    // Wireframe: "Hoy - Nordelta", "Ayer - Casa Yoel".
    // For MVP V2, let's just reverse chronological list with Location Header logic.

    const sortedMatches = [...matches].sort((a, b) => b.startDate - a.startDate);

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-bold">← VOLVER</button>
                <h2 className="text-xl font-bold">HISTORIAL</h2>
                <div className="w-8"></div>
            </div>

            <div className="flex flex-col gap-4">
                {sortedMatches.map(match => (
                    <MatchHistoryCard key={match.id} match={match} />
                ))}

                {matches.length === 0 && (
                    <div className="text-center text-[var(--color-text-muted)] mt-12">
                        No hay partidos jugados aún.
                    </div>
                )}
            </div>
        </div>
    );
};

const MatchHistoryCard = ({ match }: { match: MatchState }) => {
    const date = new Date(match.metadata?.customDate || match.startDate);
    const dateStr = date.toLocaleDateString();
    const location = match.metadata?.location || 'Sin ubicación';

    // Wireframe Style: "Fernando+Julian 15 - 12 Yoel+Alex"
    // Use Pair names if available, else standard names.
    // Or just "Nosotros vs Ellos" if names generic.
    // Assuming team names are set or players are known.
    // In V1 we didn't force Team Names updates.
    // In V2, we might want to display Pair Names or Team Names.

    return (
        <div className="bg-[var(--color-surface)] p-4 rounded border border-[var(--color-border)] shadow-sm">
            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] font-bold uppercase mb-2">
                <span>{dateStr} • {location}</span>
            </div>

            <div className="flex justify-between items-center">
                <div className="flex-1 text-right">
                    <div className={`font-bold ${match.winner === 'nosotros' ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-text-primary)]'}`}>
                        {match.teams.nosotros.name}
                    </div>
                </div>

                <div className="px-4 font-black text-xl whitespace-nowrap">
                    {match.teams.nosotros.score} <span className="text-[var(--color-text-muted)] text-sm px-1">—</span> {match.teams.ellos.score}
                </div>

                <div className="flex-1 text-left">
                    <div className={`font-bold ${match.winner === 'ellos' ? 'text-[var(--color-ellos)]' : 'text-[var(--color-text-primary)]'}`}>
                        {match.teams.ellos.name}
                    </div>
                </div>
            </div>
        </div>
    );
}
