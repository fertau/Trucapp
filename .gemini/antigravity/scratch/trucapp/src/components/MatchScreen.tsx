import { useEffect, useState } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { ScoreBoard } from './ScoreBoard';
import { FaltaEnvidoModal } from './FaltaEnvidoModal';
import type { TeamId } from '../types';

interface MatchScreenProps {
    onFinish: () => void;
}

export const MatchScreen = ({ onFinish }: MatchScreenProps) => {
    const teams = useMatchStore(state => state.teams);
    const isFinished = useMatchStore(state => state.isFinished);
    const winner = useMatchStore(state => state.winner);
    const undo = useMatchStore(state => state.undo);

    const [showFaltaModal, setShowFaltaModal] = useState(false);
    const [showManualScore, setShowManualScore] = useState(false);

    const onRequestFaltaEnvido = () => {
        setShowFaltaModal(true);
    };

    const addPoints = useMatchStore(state => state.addPoints);

    const onFinishManualMatch = (scoreNos: number, scoreEll: number) => {
        // Set points directly to trigger win
        const currentNos = teams.nosotros.score;
        const currentEll = teams.ellos.score;

        if (scoreNos > currentNos) addPoints('nosotros', scoreNos - currentNos, 'penalty');
        if (scoreEll > currentEll) addPoints('ellos', scoreEll - currentEll, 'penalty');

        setShowManualScore(false);
    };

    // Listen for custom event from ScoreBoard button
    useEffect(() => {
        const handler = () => onRequestFaltaEnvido();
        window.addEventListener('requestFaltaEnvido', handler);
        return () => window.removeEventListener('requestFaltaEnvido', handler);
    }, []);


    if (isFinished && winner) {
        return <WinnerCelebration winner={winner} teams={teams} onFinish={onFinish} />;
    }

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col">
            {/* Header / Top Bar */}
            <div className="flex justify-between items-center p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur z-50 h-[60px]">
                <button
                    onClick={undo}
                    className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded border border-[var(--color-border)] active:bg-[var(--color-surface-hover)]"
                >
                    DESHACER
                </button>

                <div className="text-xs font-black text-[var(--color-text-muted)] tracking-[0.2em]">TRUCAPP</div>

                <button
                    onClick={() => setShowManualScore(true)}
                    className="text-[var(--color-accent)] text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 shadow-sm"
                >
                    FINALIZAR
                </button>
            </div>

            {/* Score Area */}
            <div className="flex-1 relative overflow-hidden">
                <ScoreBoard />
            </div>

            {/* Modals */}
            {showFaltaModal && (
                <FaltaEnvidoModal
                    onClose={() => setShowFaltaModal(false)}
                />
            )}
            {showManualScore && (
                <ManualScoreModal
                    nosotros={{ name: teams.nosotros.name, score: teams.nosotros.score }}
                    ellos={{ name: teams.ellos.name, score: teams.ellos.score }}
                    onClose={() => setShowManualScore(false)}
                    onConfirm={onFinishManualMatch}
                />
            )}
        </div>
    );
};

const ManualScoreModal = ({ nosotros, ellos, onClose, onConfirm }: {
    nosotros: { name: string, score: number },
    ellos: { name: string, score: number },
    onClose: () => void,
    onConfirm: (nos: number, ell: number) => void
}) => {
    const [scoreNos, setScoreNos] = useState(nosotros.score);
    const [scoreEll, setScoreEll] = useState(ellos.score);

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
                <h2 className="text-xl font-black mb-1 uppercase tracking-tighter">RESULTADO FINAL</h2>
                <p className="text-xs font-bold text-[var(--color-text-muted)] mb-8 uppercase tracking-widest">Ingreso manual rápido</p>

                <div className="flex flex-col gap-6 mb-10">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase text-[var(--color-nosotros)] tracking-[0.2em]">{nosotros.name}</label>
                        <input
                            type="number"
                            className="bg-[var(--color-bg)] border border-[var(--color-border)] p-5 rounded-2xl text-3xl font-black w-full text-center tabular-nums focus:border-[var(--color-nosotros)] outline-none"
                            value={scoreNos}
                            onChange={(e) => setScoreNos(Number(e.target.value))}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase text-[var(--color-ellos)] tracking-[0.2em]">{ellos.name}</label>
                        <input
                            type="number"
                            className="bg-[var(--color-bg)] border border-[var(--color-border)] p-5 rounded-2xl text-3xl font-black w-full text-center tabular-nums focus:border-[var(--color-ellos)] outline-none"
                            value={scoreEll}
                            onChange={(e) => setScoreEll(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => onConfirm(scoreNos, scoreEll)}
                        className="w-full bg-[var(--color-accent)] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-green-900/20 active:scale-95 transition-all"
                    >
                        GUARDAR Y FINALIZAR
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-[var(--color-text-muted)] py-3 font-bold uppercase text-xs tracking-widest"
                    >
                        VOLVER
                    </button>
                </div>
            </div>
        </div>
    );
};
const WinnerCelebration = ({ winner, teams, onFinish }: { winner: TeamId, teams: any, onFinish: () => void }) => {
    const winnerData = teams[winner];
    const matchId = useMatchStore(state => state.id);

    const handleNewMatch = () => {
        onFinish();
    };

    const copyShareLink = () => {
        const url = `${window.location.origin}/?matchId=${matchId}`;
        navigator.clipboard.writeText(url);
        alert(`Link copiado: ${url}`);
    };

    return (
        <div className="full-screen bg-black flex flex-col items-center justify-center p-8 relative overflow-hidden z-[100]">
            {/* Simple confetti background */}
            <div className="absolute inset-0 z-0 opacity-30">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            backgroundColor: i % 2 === 0 ? 'var(--color-nosotros)' : 'var(--color-ellos)',
                            animation: 'bounce 2s infinite',
                            animationDelay: `${Math.random() * 2}s`,
                        }}
                    ></div>
                ))}
            </div>

            <div className="z-10 flex flex-col items-center relative w-full max-w-sm">
                <div className="flex justify-between items-center w-full mb-6">
                    <div className="text-[12px] font-black uppercase tracking-[0.5em] text-[var(--color-text-muted)]">Partido Finalizado</div>
                    <button onClick={copyShareLink} className="text-[10px] font-bold uppercase tracking-widest p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all">
                        🔗 Compartir
                    </button>
                </div>

                <h1 className="text-6xl font-black text-center mb-10 italic tracking-tighter leading-none">
                    <span className={`text-[var(--color-${winner})] block mb-2`}>¡VICTORIA!</span>
                    <span className="text-white uppercase break-words px-4 text-4xl">{winnerData.name}</span>
                </h1>

                <div className="flex items-center gap-6 mb-12 bg-white/5 py-6 px-10 rounded-3xl border border-white/10">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase text-[var(--color-nosotros)]/60 mb-2">Nosotros</span>
                        <span className="text-5xl font-black tabular-nums">{teams.nosotros.score}</span>
                    </div>
                    <div className="w-[1px] h-12 bg-white/10"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase text-[var(--color-ellos)]/60 mb-2">Ellos</span>
                        <span className="text-5xl font-black tabular-nums">{teams.ellos.score}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full relative z-20">
                    <button
                        onClick={handleNewMatch}
                        className={`w-full bg-[var(--color-${winner})] text-black py-4 rounded-xl font-black text-xl shadow-lg active:scale-95 transition-transform`}
                    >
                        NUEVO PARTIDO
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-[var(--color-text-muted)] font-bold uppercase tracking-widest text-xs py-4 active:text-white transition-colors"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        </div>
    );
};
