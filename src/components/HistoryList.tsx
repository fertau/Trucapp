import { useHistoryStore } from '../store/useHistoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import type { MatchMode } from '../types';
import { getMatchEffectiveDate } from '../utils/matchIdentity';
import { formatDateDisplay } from '../utils/date';

interface HistoryListProps {
    filter: 'ALL' | MatchMode;
}

export const HistoryList = ({ filter }: HistoryListProps) => {
    const matches = useHistoryStore(state => state.matches);
    const currentUserId = useAuthStore(state => state.currentUserId);
    const players = useUserStore(state => state.players);

    const filteredMatches = filter === 'ALL'
        ? matches
        : matches.filter(m => m.mode === filter);

    if (filteredMatches.length === 0) {
        return (
            <div className="text-center text-[var(--color-text-muted)] py-12 px-8 bg-white/5 rounded-3xl border border-dashed border-white/5 mt-4">
                <span className="text-2xl block mb-2 opacity-20">📭</span>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-20">No hay partidos en esta categoría</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 py-2">
            {filteredMatches.map(match => {
                const isNosotros = match.teams.nosotros.players.includes(currentUserId!);
                const userTeam = isNosotros ? match.teams.nosotros : match.teams.ellos;
                const oppTeam = isNosotros ? match.teams.ellos : match.teams.nosotros;
                const isUserWin = match.winner === (isNosotros ? 'nosotros' : 'ellos');

                return (
                    <div key={match.id} className="bg-[#1a1a1c] p-5 rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-xl active:scale-[0.99] transition-all hover:bg-white/[0.03] group relative overflow-hidden">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className={`w-12 h-12 rounded-[1.25rem] flex flex-col items-center justify-center font-black transition-all border ${isUserWin
                                ? 'bg-[var(--color-nosotros)]/10 text-[var(--color-nosotros)] border-[var(--color-nosotros)]/20'
                                : 'bg-[var(--color-ellos)]/10 text-[var(--color-ellos)] border-[var(--color-ellos)]/20'}`}>
                                <span className="text-sm leading-none">{isUserWin ? 'G' : 'P'}</span>
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">{match.mode}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">
                                        {formatDateDisplay(getMatchEffectiveDate(match))}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-3 flex-1">
                                        {/* User Team */}
                                        <div className="flex items-start gap-2">
                                            <div className="flex flex-col flex-1">
                                                <span className={`text-sm font-black uppercase ${isUserWin ? 'text-white' : 'text-white/40'}`}>
                                                    {userTeam.name}
                                                </span>
                                                <span className={`text-[9px] font-medium ${isUserWin ? 'text-white/60' : 'text-white/30'}`}>
                                                    {userTeam.players.map(id => players.find(p => p.id === id)?.name || '?').join(', ')}
                                                </span>
                                            </div>
                                            <span className={`text-lg font-black tabular-nums ${isUserWin ? 'text-white' : 'text-white/40'}`}>
                                                {userTeam.score}
                                            </span>
                                        </div>
                                        {/* Opponent Team */}
                                        <div className="flex items-start gap-2">
                                            <div className="flex flex-col flex-1">
                                                <span className={`text-sm font-black uppercase ${!isUserWin ? 'text-white' : 'text-white/40'}`}>
                                                    {oppTeam.name}
                                                </span>
                                                <span className={`text-[9px] font-medium ${!isUserWin ? 'text-white/60' : 'text-white/30'}`}>
                                                    {oppTeam.players.map(id => players.find(p => p.id === id)?.name || '?').join(', ')}
                                                </span>
                                            </div>
                                            <span className={`text-lg font-black tabular-nums ${!isUserWin ? 'text-white' : 'text-white/40'}`}>
                                                {oppTeam.score}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end opacity-20 group-hover:opacity-100 transition-opacity pr-2 relative z-10">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isUserWin ? 'text-[var(--color-nosotros)]' : 'text-[var(--color-ellos)]'}`}>
                                {isUserWin ? 'Ganaste' : 'Perdiste'}
                            </span>
                            <span className="text-[8px] font-black uppercase text-white/20 tracking-widest mt-0.5">
                                {isUserWin ? 'Victoria' : 'Derrota'}
                            </span>
                        </div>

                        {/* Background glow for win/loss */}
                        <div className={`absolute top-0 right-0 w-32 h-full opacity-0 group-hover:opacity-10 transition-opacity blur-3xl pointer-events-none ${isUserWin ? 'bg-[var(--color-nosotros)]' : 'bg-[var(--color-ellos)]'}`}></div>
                    </div>
                );
            })}
        </div>
    );
};
