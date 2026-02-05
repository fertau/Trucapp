import { useHistoryStore } from '../store/useHistoryStore';

// Stats logic:
// Matches played, Wins per team (Nosotros/Ellos is loose context, actually stats should be Player vs Player)
// BUT "Head-to-head" implies Player A vs Player B.
// Since we store "Nosotros" vs "Ellos" with player IDs attached, we can calculate.
// MVP: Just Global "Nosotros" vs "Ellos" stats for the device owner?
// Or user selects two players/teams to compare?
// Spec: "Head-to-head view: summary FIRST, matches AFTER."

// For MVP, I'll implement a simple "Device Stats" showing "Nosotros" (User) win rate vs "Ellos".
// Because "Nosotros" usually implies the device owner's team.

export const HeadToHead = () => {
    const matches = useHistoryStore(state => state.matches);

    // Calculate global stats
    const total = matches.length;
    const winsNos = matches.filter(m => (m.winner === 'nosotros')).length;
    const winsEll = matches.filter(m => (m.winner === 'ellos')).length;

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[var(--color-surface)] p-2 rounded border border-[var(--color-border)]">
                    <div className="text-2xl font-bold">{total}</div>
                    <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Partidos</div>
                </div>
                <div className="bg-[var(--color-surface)] p-2 rounded border border-[var(--color-border)]">
                    <div className="text-2xl font-bold text-[var(--color-nosotros)]">{winsNos}</div>
                    <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Ganados</div>
                </div>
                <div className="bg-[var(--color-surface)] p-2 rounded border border-[var(--color-border)]">
                    <div className="text-2xl font-bold text-[var(--color-ellos)]">{winsEll}</div>
                    <div className="text-[10px] uppercase text-[var(--color-text-muted)]">Perdidos</div>
                </div>
            </div>

            {/* Streak visualization (Basic) */}
            <div className="flex gap-1 overflow-x-auto pb-2">
                {matches.slice(0, 10).map(m => (
                    <div
                        key={m.id}
                        className={`w-6 h-6 rounded-full flex-shrink-0 ${m.winner === 'nosotros' ? 'bg-[var(--color-nosotros)]' : m.winner === 'ellos' ? 'bg-[var(--color-ellos)]' : 'bg-[var(--color-text-muted)]'}`}
                    />
                ))}
            </div>

            {/* History List Usage */}
            {/* We can import HistoryList here or let Parent handle it */}
        </div>
    );
};
