import { HeadToHead } from './HeadToHead';
import { HistoryList } from './HistoryList';

interface HistoryScreenProps {
    onBack: () => void;
}

export const HistoryScreen = ({ onBack }: HistoryScreenProps) => {
    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="text-[var(--color-text-muted)] font-black text-xs uppercase tracking-[0.3em] bg-white/5 py-2 px-4 rounded-full active:scale-95 transition-all">
                    ← VOLVER
                </button>
                <div className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-[var(--color-accent)]/20">
                    Estadísticas
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-12 custom-scrollbar pr-1">
                <div className="flex flex-col gap-10">
                    <section>
                        <HeadToHead />
                    </section>

                    <section className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 pl-2">
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Historial Completo</h3>
                            <div className="h-[1px] flex-1 bg-white/5"></div>
                        </div>
                        <HistoryList />
                    </section>
                </div>
            </div>
        </div>
    );
};
