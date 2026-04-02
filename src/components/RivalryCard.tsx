import type { Player } from '../types';
import type { RivalryProfile } from '../services/rivalryService';

interface RivalryCardProps {
    rivalry: RivalryProfile;
    players: Player[];
    onClose?: () => void;
}

export const RivalryCard = ({ rivalry, players, onClose }: RivalryCardProps) => {
    const getPlayerName = (id: string) =>
        players.find((p) => p.id === id)?.name ?? 'Jugador desconocido';

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-accent)]">
                            Rivalidad {rivalry.mode}
                        </span>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-[10px] font-black uppercase tracking-wider text-white/50 active:text-white/80 transition-colors"
                            >
                                Cerrar
                            </button>
                        )}
                    </div>
                    <h2 className="text-base font-black leading-tight mt-2 truncate">
                        {rivalry.label.replace(`${rivalry.mode} · `, '')}
                    </h2>
                    <div className="text-[11px] text-white/45 mt-1">
                        {rivalry.matchCount} partidos jugados
                    </div>
                </div>

                <div className="w-full h-px bg-white/10" />

                {/* Series bar */}
                {rivalry.seriesTotal > 0 && (
                    <div className="px-5 py-4">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-black mb-2">
                            Series ganadas
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                            <div className="h-4 w-full flex">
                                <div
                                    className="h-full bg-[var(--color-nosotros)] transition-all"
                                    style={{ width: `${(rivalry.seriesWins / rivalry.seriesTotal) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-[var(--color-danger)] transition-all"
                                    style={{ width: `${(rivalry.seriesLosses / rivalry.seriesTotal) * 100}%` }}
                                />
                            </div>
                            <div className="px-3 py-2 flex items-center justify-between text-sm font-black">
                                <span className="text-[var(--color-nosotros)]">{rivalry.seriesWins}</span>
                                <span className="text-white/30 text-xs">{rivalry.seriesTotal} series</span>
                                <span className="text-[var(--color-danger)]">{rivalry.seriesLosses}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Match bar */}
                <div className="px-5 py-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-black mb-2">
                        Partidos
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
                        <div className="h-4 w-full flex">
                            {rivalry.matchCount > 0 && (
                                <>
                                    <div
                                        className="h-full bg-[var(--color-nosotros)] transition-all"
                                        style={{ width: `${(rivalry.matchWins / rivalry.matchCount) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-[var(--color-danger)] transition-all"
                                        style={{ width: `${(rivalry.matchLosses / rivalry.matchCount) * 100}%` }}
                                    />
                                </>
                            )}
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between text-sm font-black">
                            <span className="text-[var(--color-nosotros)]">
                                G {rivalry.matchWins} ({rivalry.matchCount ? Math.round(rivalry.matchWinRate * 100) : 0}%)
                            </span>
                            <span className="text-[var(--color-danger)]">
                                P {rivalry.matchLosses} ({rivalry.matchCount ? Math.round((1 - rivalry.matchWinRate) * 100) : 0}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form dots */}
                {rivalry.seriesForm.length > 0 && (
                    <div className="px-5 py-3">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-black mb-2 text-center">
                            Forma de series
                        </div>
                        <div className="grid grid-cols-10 gap-2 w-full">
                            {Array.from({ length: 10 }).map((_, idx) => {
                                const item = rivalry.seriesForm[idx];
                                const cls = item === 'G'
                                    ? 'bg-[var(--color-nosotros)] border-[var(--color-nosotros)]/90 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                                    : item === 'P'
                                        ? 'bg-[var(--color-danger)] border-[var(--color-danger)]/90 shadow-[0_0_10px_rgba(255,69,58,0.35)]'
                                        : 'bg-white/5 border-white/15';
                                return (
                                    <span
                                        key={`form-${idx}`}
                                        className={`w-full aspect-square rounded-full border ${cls}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Streak */}
                {rivalry.streak.type !== 'none' && rivalry.streak.count >= 2 && (
                    <div className="px-5 py-3">
                        <div className="text-center">
                            <span className={`text-sm font-black ${rivalry.streak.type === 'W' ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-danger)]'}`}>
                                {rivalry.streak.type === 'W' ? 'Racha ganadora' : 'Racha perdedora'}: {rivalry.streak.count} partidos
                            </span>
                        </div>
                    </div>
                )}

                {/* Pica-pica 1v1 records */}
                {rivalry.picaPicaH2H.length > 0 && (
                    <div className="px-5 py-4">
                        <div className="w-full h-px bg-white/10 mb-4" />
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-black mb-3">
                            Pica-pica 1v1
                        </div>
                        <div className="flex flex-col gap-2">
                            {rivalry.picaPicaH2H.map((h2h, idx) => {
                                const total = h2h.winsNosotros + h2h.winsEllos;
                                return (
                                    <div key={`h2h-${idx}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                            <span className="text-[var(--color-nosotros)] truncate max-w-[40%]">
                                                {getPlayerName(h2h.playerNosotrosId)}
                                            </span>
                                            <span className="text-white/40 text-[10px]">
                                                {h2h.winsNosotros}-{h2h.winsEllos}
                                            </span>
                                            <span className="text-[var(--color-ellos)] truncate max-w-[40%] text-right">
                                                {getPlayerName(h2h.playerEllosId)}
                                            </span>
                                        </div>
                                        {total > 0 && (
                                            <div className="h-1.5 w-full flex rounded-full overflow-hidden mt-1.5">
                                                <div
                                                    className="h-full bg-[var(--color-nosotros)]"
                                                    style={{ width: `${(h2h.winsNosotros / total) * 100}%` }}
                                                />
                                                <div
                                                    className="h-full bg-[var(--color-ellos)]"
                                                    style={{ width: `${(h2h.winsEllos / total) * 100}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bottom padding */}
                <div className="h-4" />
            </div>
        </div>
    );
};
