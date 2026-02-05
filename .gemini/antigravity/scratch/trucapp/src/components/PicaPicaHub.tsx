import { usePicaPicaStore } from '../store/usePicaPicaStore';
import { useUserStore } from '../store/useUserStore';

interface PicaPicaHubProps {
    onPlayMatch: (subMatchId: string) => void;
    onFinishPicaPica: () => void;
}

export const PicaPicaHub = ({ onPlayMatch, onFinishPicaPica }: PicaPicaHubProps) => {
    const matches = usePicaPicaStore(state => state.matches);
    const players = useUserStore(state => state.players);

    const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

    const playedCount = matches.filter(m => m.isFinished).length;
    const allFinished = playedCount === matches.length;

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-6">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold tracking-tighter">PICA-PICA</h2>
                <div className="text-sm font-bold text-[var(--color-text-muted)]">
                    {playedCount}/{matches.length} jugados
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-4">
                {matches.map(m => {
                    const p1Name = getPlayerName(m.playerNosotrosId);
                    const p2Name = getPlayerName(m.playerEllosId);

                    if (m.isFinished) {
                        return (
                            <div key={m.id} className="bg-[var(--color-surface)] p-4 rounded border border-[var(--color-border)] opacity-60 flex justify-between items-center">
                                <div>
                                    <span className="font-bold">{p1Name}</span> vs <span className="font-bold">{p2Name}</span>
                                </div>
                                <div className="font-bold text-[var(--color-accent)]">
                                    ✔ Ganó {m.winner === 'nosotros' ? p1Name : p2Name}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={m.id} className="bg-[var(--color-surface)] p-4 rounded border border-[var(--color-border)] flex justify-between items-center shadow-md">
                            <div>
                                <span className="font-bold text-[var(--color-nosotros)]">{p1Name}</span>
                                <span className="mx-2 text-[var(--color-text-muted)]">vs</span>
                                <span className="font-bold text-[var(--color-ellos)]">{p2Name}</span>
                            </div>
                            <button
                                onClick={() => onPlayMatch(m.id)}
                                className="bg-[var(--color-accent)] text-white px-4 py-2 rounded text-sm font-bold"
                            >
                                ▶ Jugar
                            </button>
                        </div>
                    );
                })}
            </div>

            {allFinished && (
                <button
                    onClick={onFinishPicaPica}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] py-4 rounded font-bold text-xl"
                >
                    Volver al Inicio
                </button>
            )}
        </div>
    );
};
