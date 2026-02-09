import { useState } from 'react';
import { usePicaPicaStore } from '../store/usePicaPicaStore';
import type { Player } from '../types';

interface PicaPicaSetupProps {
    nosotros: Player[];
    ellos: Player[];
    onStart: () => void;
}

export const PicaPicaSetup = ({ nosotros, ellos, onStart }: PicaPicaSetupProps) => {
    const setup = usePicaPicaStore(state => state.setup);
    const [targetScore, setTargetScore] = useState(10); // Default per wireframe

    // Auto-match by index (assuming order matters or purely linear for now)
    // Wireframe Screen 7: "Juan vs Pedro (Mano: Juan)"
    // Typically PicaPica is P1 vs P1, P2 vs P2, P3 vs P3.
    // "Mano" rotates.
    // For MVP, linear mapping:
    // M1: Nos[0] vs Ell[0]
    // M2: Nos[1] vs Ell[1]
    // M3: Nos[2] vs Ell[2]

    const handleStart = () => {
        const matches = nosotros.map((p, i) => ({
            id: crypto.randomUUID(),
            playerNosotrosId: p.id,
            playerEllosId: ellos[i].id, // Assume lengths equal (3v3 checked in App)
            isFinished: false,
            scoreNosotros: 0,
            scoreEllos: 0
        }));

        setup(matches, targetScore);
        onStart();
    };

    return (
        <div className="full-screen bg-[var(--color-bg)] flex flex-col p-6">
            <h2 className="text-2xl font-black mb-8 tracking-tighter text-center">PICA-PICA</h2>

            <div className="bg-[var(--color-surface)] p-6 rounded border border-[var(--color-border)] mb-8">
                <label className="block text-[var(--color-text-muted)] text-sm font-bold uppercase mb-2">Objetivo (Puntos)</label>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setTargetScore(Math.max(5, targetScore - 5))}
                        className="w-12 h-12 rounded bg-[var(--color-surface-hover)] font-bold text-xl"
                    >
                        -
                    </button>
                    <div className="flex-1 text-center text-4xl font-black text-[var(--color-text-primary)]">
                        {targetScore}
                    </div>
                    <button
                        onClick={() => setTargetScore(Math.min(30, targetScore + 5))}
                        className="w-12 h-12 rounded bg-[var(--color-surface-hover)] font-bold text-xl"
                    >
                        +
                    </button>
                </div>
            </div>

            <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase mb-4 tracking-wider">Emparejamientos</h3>

            <div className="flex flex-col gap-2 mb-8 flex-1 overflow-y-auto">
                {nosotros.map((p, i) => (
                    <div key={p.id} className="flex justify-between items-center p-4 bg-[var(--color-surface)] rounded border border-[var(--color-border)]">
                        <div className="font-bold text-[var(--color-nosotros)]">{p.name}</div>
                        <div className="text-[var(--color-text-muted)] text-xs font-bold">VS</div>
                        <div className="font-bold text-[var(--color-ellos)]">{ellos[i]?.name}</div>
                    </div>
                ))}
            </div>

            <button
                onClick={handleStart}
                className="w-full bg-[var(--color-accent)] text-white py-4 rounded font-bold text-xl shadow-lg"
            >
                Empezar Pica-Pica
            </button>
        </div>
    );
};
