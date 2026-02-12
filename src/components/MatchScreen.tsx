import { useEffect, useState } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { ScoreBoard } from './ScoreBoard';
import { FaltaEnvidoModal } from './FaltaEnvidoModal';
import type { MatchState, TeamId } from '../types';
import { formatDateInputLocal, parseDateInputLocal } from '../utils/date';

interface MatchScreenProps {
    onFinish: (next?: 'home' | 'rematch' | 'series-next') => void;
}

export const MatchScreen = ({ onFinish }: MatchScreenProps) => {
    const teams = useMatchStore(state => state.teams);
    const targetScore = useMatchStore(state => state.targetScore);
    const setTargetScore = useMatchStore(state => state.setTargetScore);
    const isFinished = useMatchStore(state => state.isFinished);
    const winner = useMatchStore(state => state.winner);
    const undo = useMatchStore(state => state.undo);

    const [showFaltaModal, setShowFaltaModal] = useState(false);
    const [showManualScore, setShowManualScore] = useState(false);
    const [showScoreConfig, setShowScoreConfig] = useState(false);

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
            <div
                className="flex justify-between items-center p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur z-50"
                style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', minHeight: '60px' }}
            >
                <button
                    onClick={undo}
                    className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded border border-[var(--color-border)] active:bg-[var(--color-surface-hover)]"
                >
                    DESHACER
                </button>

                <div className="flex items-center gap-2">
                    <div className="text-xs font-black text-[var(--color-text-muted)] tracking-[0.2em]">TRUCAPP</div>
                    <button
                        onClick={() => setShowScoreConfig(true)}
                        className="text-[var(--color-text-secondary)] text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border border-[var(--color-border)] active:bg-[var(--color-surface-hover)]"
                        title="Configurar puntaje objetivo"
                    >
                        ⚙ {targetScore}
                    </button>
                </div>

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
            {showScoreConfig && (
                <ScoreSettingsModal
                    currentTarget={targetScore}
                    currentNos={teams.nosotros.score}
                    currentEll={teams.ellos.score}
                    onClose={() => setShowScoreConfig(false)}
                    onConfirm={(next) => {
                        setTargetScore(next);
                        setShowScoreConfig(false);
                    }}
                />
            )}
        </div>
    );
};

const ScoreSettingsModal = ({ currentTarget, currentNos, currentEll, onClose, onConfirm }: {
    currentTarget: number;
    currentNos: number;
    currentEll: number;
    onClose: () => void;
    onConfirm: (nextTarget: number) => void;
}) => {
    const [selected, setSelected] = useState<number>(currentTarget);

    const handleConfirm = () => {
        if (selected !== currentTarget && (currentNos > 0 || currentEll > 0)) {
            const ok = window.confirm('Cambiar objetivo en medio del partido puede alterar el resultado. ¿Confirmás el cambio?');
            if (!ok) return;
        }
        onConfirm(selected);
    };

    return (
        <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="w-full max-w-xs rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <h3 className="text-lg font-black uppercase tracking-wide mb-1">Configurar Partido</h3>
                <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Puntos objetivo</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    {[15, 30].map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setSelected(value)}
                            className={`py-3 rounded-xl border font-black text-sm transition-all ${selected === value ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)]'}`}
                        >
                            {value} puntos
                        </button>
                    ))}
                </div>

                <div className="text-[10px] text-[var(--color-text-muted)] mb-5">
                    Marcador actual: {currentNos} - {currentEll}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs font-black uppercase tracking-wider"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 py-2 rounded-xl bg-[var(--color-accent)] text-white text-xs font-black uppercase tracking-wider"
                    >
                        Guardar
                    </button>
                </div>
            </div>
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
    const [location, setLocation] = useState(useMatchStore.getState().metadata?.location || '');
    const [date, setDate] = useState(() => {
        const d = useMatchStore.getState().metadata?.date || Date.now();
        return formatDateInputLocal(d);
    });

    const handleConfirm = () => {
        const selectedDate = parseDateInputLocal(date) ?? Date.now();
        useMatchStore.getState().setMetadata(location, selectedDate);
        onConfirm(scoreNos, scoreEll);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in duration-300 my-8">
                <h2 className="text-xl font-black mb-1 uppercase tracking-tighter">RESULTADO FINAL</h2>
                <p className="text-xs font-bold text-[var(--color-text-muted)] mb-6 uppercase tracking-widest">Ingreso manual detallado</p>

                <div className="flex flex-col gap-4 mb-8">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[var(--color-nosotros)] tracking-widest">{nosotros.name}</label>
                            <input
                                type="number"
                                className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl text-2xl font-black w-full text-center tabular-nums focus:border-[var(--color-nosotros)] outline-none"
                                value={scoreNos}
                                onChange={(e) => setScoreNos(Number(e.target.value))}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[var(--color-ellos)] tracking-widest">{ellos.name}</label>
                            <input
                                type="number"
                                className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl text-2xl font-black w-full text-center tabular-nums focus:border-[var(--color-ellos)] outline-none"
                                value={scoreEll}
                                onChange={(e) => setScoreEll(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Ubicación (Sede)</label>
                        <input
                            type="text"
                            placeholder="Ej: Club Social"
                            className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl text-sm font-bold w-full focus:border-[var(--color-accent)] outline-none"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-widest">Fecha</label>
                        <input
                            type="date"
                            className="bg-[var(--color-bg)] border border-[var(--color-border)] p-3 rounded-xl text-sm font-bold w-full focus:border-[var(--color-accent)] outline-none"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-[var(--color-accent)] text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-green-900/20 active:scale-95 transition-all"
                    >
                        GUARDAR Y FINALIZAR
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-[var(--color-text-muted)] py-2 font-bold uppercase text-[10px] tracking-widest"
                    >
                        VOLVER
                    </button>
                </div>
            </div>
        </div>
    );
};
type ConfettiPiece = { left: string; top: string; animationDelay: string };

const createConfettiPieces = (count: number): ConfettiPiece[] =>
    Array.from({ length: count }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
    }));

const WinnerCelebration = ({ winner, teams, onFinish }: { winner: TeamId, teams: MatchState['teams'], onFinish: (next?: 'home' | 'rematch' | 'series-next') => void }) => {
    const winnerData = teams[winner];
    const matchId = useMatchStore(state => state.id);
    const series = useMatchStore(state => state.series);
    const historyMatches = useHistoryStore(state => state.matches);
    const [confettiPieces] = useState<ConfettiPiece[]>(() => createConfettiPieces(20));

    const seriesProgress = (() => {
        if (!series) return null;
        const matches = historyMatches.filter((m) => m.series?.id === series.id);
        const currentMatch = useMatchStore.getState();
        const included = matches.some((m) => m.id === currentMatch.id);
        const all = included ? matches : [currentMatch, ...matches];
        const winsNos = all.filter((m) => m.winner === 'nosotros').length;
        const winsEll = all.filter((m) => m.winner === 'ellos').length;
        const isFinished = winsNos >= series.targetWins || winsEll >= series.targetWins;
        return { winsNos, winsEll, isFinished, targetWins: series.targetWins };
    })();

    const handleRematch = () => {
        onFinish('rematch');
    };

    const handleGoHome = () => {
        onFinish('home');
    };

    const handleNextSeriesMatch = () => {
        onFinish('series-next');
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
                {confettiPieces.map((piece, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                            left: piece.left,
                            top: piece.top,
                            backgroundColor: i % 2 === 0 ? 'var(--color-nosotros)' : 'var(--color-ellos)',
                            animation: 'bounce 2s infinite',
                            animationDelay: piece.animationDelay,
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
                    <div className="flex flex-col items-center flex-1 min-w-[100px]">
                        <span className="text-[8px] font-black uppercase text-[var(--color-nosotros)]/60 mb-2 truncate max-w-[80px]">{teams.nosotros.name}</span>
                        <span className="text-5xl font-black tabular-nums">{teams.nosotros.score}</span>
                    </div>
                    <div className="w-[1px] h-12 bg-white/10"></div>
                    <div className="flex flex-col items-center flex-1 min-w-[100px]">
                        <span className="text-[8px] font-black uppercase text-[var(--color-ellos)]/60 mb-2 truncate max-w-[80px]">{teams.ellos.name}</span>
                        <span className="text-5xl font-black tabular-nums">{teams.ellos.score}</span>
                    </div>
                </div>

                {seriesProgress && (
                    <div className="mb-8 text-center bg-white/5 border border-white/10 rounded-2xl px-6 py-4 w-full">
                        <div className="text-[10px] uppercase tracking-widest text-white/50 font-black mb-1">Serie BO3</div>
                        <div className="text-xl font-black">
                            {teams.nosotros.name} {seriesProgress.winsNos} - {seriesProgress.winsEll} {teams.ellos.name}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-4 w-full relative z-20">
                    {seriesProgress && !seriesProgress.isFinished ? (
                        <button
                            onClick={handleNextSeriesMatch}
                            className={`w-full bg-[var(--color-${winner})] text-black py-4 rounded-xl font-black text-xl shadow-lg active:scale-95 transition-transform`}
                        >
                            SIGUIENTE PARTIDO (SERIE)
                        </button>
                    ) : (
                        <button
                            onClick={handleRematch}
                            className={`w-full bg-[var(--color-${winner})] text-black py-4 rounded-xl font-black text-xl shadow-lg active:scale-95 transition-transform`}
                        >
                            REVANCHA
                        </button>
                    )}
                    <button
                        onClick={handleGoHome}
                        className="text-[var(--color-text-muted)] font-bold uppercase tracking-widest text-xs py-4 active:text-white transition-colors"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        </div>
    );
};
