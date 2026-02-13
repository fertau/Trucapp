import { useState } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import type { TeamId } from '../types';
import { getFaltaEnvidoSuggestedPoints } from '../utils/truco';

interface FaltaEnvidoModalProps {
    onClose: () => void;
}

export const FaltaEnvidoModal = ({ onClose }: FaltaEnvidoModalProps) => {
    const teams = useMatchStore(state => state.teams);
    const addPoints = useMatchStore(state => state.addPoints);
    const targetScore = useMatchStore(state => state.targetScore);

    const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
    const [customPoints, setCustomPoints] = useState<string>('');
    const [isManual, setIsManual] = useState(false);

    const getPointsForTeam = (winnerTeam: TeamId, loserTeam: TeamId) => {
        return getFaltaEnvidoSuggestedPoints(
            targetScore,
            teams[winnerTeam].score,
            teams[loserTeam].score
        );
    };

    const calculatedPoints = selectedTeam
        ? getPointsForTeam(selectedTeam, selectedTeam === 'nosotros' ? 'ellos' : 'nosotros')
        : 0;

    const manualPoints = Number.parseInt(customPoints, 10);
    const pointsToApply = isManual && customPoints ? manualPoints : calculatedPoints;
    const isPointsValid = Number.isFinite(pointsToApply) && pointsToApply > 0;

    const handleConfirm = () => {
        if (!selectedTeam || !isPointsValid) return;
        addPoints(selectedTeam, pointsToApply, 'falta_envido');
        onClose();
    };

    if (!selectedTeam) {
        return (
            <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[200] p-6 animate-in fade-in duration-300 backdrop-blur-md safe-pt safe-pb safe-px">
                <h2 className="text-xl font-black mb-12 text-white italic tracking-[0.2em]">¿QUIÉN GANÓ LA FALTA?</h2>
                <div className="flex gap-4 w-full max-w-sm">
                    <button
                        onClick={() => setSelectedTeam('nosotros')}
                        className="flex-1 bg-[var(--color-nosotros)] text-black py-8 rounded-3xl text-xl font-black shadow-2xl shadow-green-900/40 active:scale-95 transition-all truncate px-2"
                    >
                        {teams.nosotros.name.toUpperCase()}
                    </button>
                    <button
                        onClick={() => setSelectedTeam('ellos')}
                        className="flex-1 bg-[var(--color-ellos)] text-black py-8 rounded-3xl text-xl font-black shadow-2xl shadow-amber-900/40 active:scale-95 transition-all truncate px-2"
                    >
                        {teams.ellos.name.toUpperCase()}
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="mt-12 text-[var(--color-text-muted)] font-bold uppercase tracking-[0.2em] text-xs"
                >
                    Cancelar
                </button>
            </div>
        );
    }

    const opponent = selectedTeam === 'nosotros' ? teams.ellos : teams.nosotros;
    const winnerTeamName = selectedTeam === 'nosotros' ? teams.nosotros.name : teams.ellos.name;
    const ruleHint = targetScore <= 15
        ? 'A 15: Falta Envido suma lo necesario para ganar el partido.'
        : opponent.score <= 14
            ? 'A 30, rival en malas (0-14): Falta Envido suma lo necesario para ganar.'
            : 'A 30, rival en buenas (15-29): Falta Envido suma lo que le falta al rival para 30.';

    return (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[200] p-6 animate-in slide-in-from-bottom duration-300 backdrop-blur-md safe-pt safe-pb safe-px">
            <h2 className="text-2xl font-black mb-8 text-white tracking-[0.3em] italic">FALTA ENVIDO</h2>

            <div className="bg-[var(--color-surface)] p-6 rounded w-full mb-6 border border-[var(--color-border)]">
                <div className="flex justify-between mb-2 text-[var(--color-text-muted)] text-[10px] uppercase font-black tracking-widest">
                    <span className="truncate max-w-[120px]">{teams.nosotros.name}</span>
                    <span className="truncate max-w-[120px]">{teams.ellos.name}</span>
                </div>
                <div className="flex justify-between text-2xl font-bold">
                    <span className="text-[var(--color-text-primary)]">{teams.nosotros.score}</span>
                    <span className="text-[var(--color-text-primary)]">{teams.ellos.score}</span>
                </div>
            </div>

            <div className="text-center mb-8">
                <div className="text-[var(--color-text-muted)] text-[10px] mb-2 uppercase tracking-widest font-black">Sugerencia para {winnerTeamName}</div>
                {isManual ? (
                    <input
                        type="number"
                        min={1}
                        step={1}
                        value={customPoints}
                        onChange={(e) => setCustomPoints(e.target.value)}
                        placeholder={calculatedPoints.toString()}
                        className="bg-transparent border-b-2 border-[var(--color-accent)] text-center text-6xl font-black text-white w-32 focus:outline-none"
                        autoFocus
                    />
                ) : (
                    <div className="text-6xl font-black text-[var(--color-accent)]">
                        +{calculatedPoints}
                    </div>
                )}
                <div className="text-[var(--color-text-muted)] text-[12px] mt-2 max-w-sm">
                    {ruleHint}
                </div>
            </div>

            <button
                onClick={handleConfirm}
                disabled={!isPointsValid}
                className={`w-full bg-[var(--color-${selectedTeam})] text-white py-4 rounded font-bold text-xl mb-4`}
            >
                CONFIRMAR
            </button>

            <button
                onClick={() => setIsManual(!isManual)}
                className="text-[var(--color-text-muted)] text-sm font-bold uppercase tracking-wider p-4"
            >
                {isManual ? 'Usar Automático' : 'Ajustar Manualmente'}
            </button>

            <button
                onClick={onClose}
                className="mt-4 text-[var(--color-text-muted)]"
            >
                Cancelar
            </button>
        </div>
    );
};
