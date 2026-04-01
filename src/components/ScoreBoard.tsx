import { useEffect, useRef, useState } from 'react';
import { useMatchStore } from '../store/useMatchStore';
import { useUserStore } from '../store/useUserStore';
import { TallyMarks } from './TallyMarks';
import type { TeamId } from '../types';

function useLongPress(callback: () => void, ms = 800, enabled = true) {
    const timerRef = useRef<number | null>(null);
    const triggeredRef = useRef(false);

    const clear = () => {
        if (timerRef.current !== null) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const start = () => {
        if (!enabled) return;
        clear();
        triggeredRef.current = false;
        timerRef.current = window.setTimeout(() => {
            triggeredRef.current = true;
            callback();
        }, ms);
    };

    const wasTriggered = () => triggeredRef.current;
    const resetTriggered = () => {
        triggeredRef.current = false;
    };

    return { start, clear, wasTriggered, resetTriggered };
}

const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {open ? (
            <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ) : (
            <>
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
            </>
        )}
    </svg>
);

export const ScoreBoard = () => {
    const teams = useMatchStore(state => state.teams);
    const targetScore = useMatchStore(state => state.targetScore);
    const picaPica = useMatchStore(state => state.picaPica);
    const players = useUserStore(state => state.players);
    const addPoints = useMatchStore(state => state.addPoints);
    const subtractPoints = useMatchStore(state => state.subtractPoints);
    const hasBuenasSection = targetScore > 15;
    const scoreSplit = Math.floor(targetScore / 2);
    const isPicaConfigured = Boolean(picaPica?.enabled && picaPica.pairings.length > 0);
    const isPicaActive = Boolean(
        isPicaConfigured && (
            (teams.nosotros.score >= (picaPica?.startAt ?? 0) && teams.nosotros.score <= (picaPica?.endAt ?? 0)) ||
            (teams.ellos.score >= (picaPica?.startAt ?? 0) && teams.ellos.score <= (picaPica?.endAt ?? 0))
        )
    );
    const currentPairing = isPicaConfigured && picaPica
        ? picaPica.pairings[picaPica.currentPairingIndex % picaPica.pairings.length]
        : null;
    const currentNosName = currentPairing
        ? players.find((p) => p.id === currentPairing.nosotrosId)?.name ?? 'Jugador A'
        : '';
    const currentEllName = currentPairing
        ? players.find((p) => p.id === currentPairing.ellosId)?.name ?? 'Jugador B'
        : '';
    const [shortcutInteractionLock, setShortcutInteractionLock] = useState(false);
    const shortcutUnlockTimerRef = useRef<number | null>(null);

    const lockShortcutInteraction = () => {
        if (shortcutUnlockTimerRef.current !== null) {
            window.clearTimeout(shortcutUnlockTimerRef.current);
            shortcutUnlockTimerRef.current = null;
        }
        setShortcutInteractionLock(true);
    };

    const unlockShortcutInteraction = () => {
        if (shortcutUnlockTimerRef.current !== null) {
            window.clearTimeout(shortcutUnlockTimerRef.current);
        }
        shortcutUnlockTimerRef.current = window.setTimeout(() => {
            setShortcutInteractionLock(false);
            shortcutUnlockTimerRef.current = null;
        }, 120);
    };

    useEffect(() => {
        return () => {
            if (shortcutUnlockTimerRef.current !== null) {
                window.clearTimeout(shortcutUnlockTimerRef.current);
            }
        };
    }, []);

    const handleLongPress = (teamId: TeamId) => {
        if (shortcutInteractionLock) return;
        if (navigator.vibrate) navigator.vibrate(40);
        subtractPoints(teamId, 1);
    };

    const longPressNosotros = useLongPress(() => handleLongPress('nosotros'), 800, !shortcutInteractionLock);
    const longPressEllos = useLongPress(() => handleLongPress('ellos'), 800, !shortcutInteractionLock);

    const handleColumnClick = (teamId: TeamId) => {
        if (shortcutInteractionLock) return;
        const longPressState = teamId === 'nosotros' ? longPressNosotros : longPressEllos;
        if (longPressState.wasTriggered()) {
            longPressState.resetTriggered();
            return;
        }
        addPoints(teamId, 1, 'score_tap');
    };

    const [showNumbers, setShowNumbers] = useState(true);

    return (
        <div className="flex flex-col w-full h-full relative bg-[var(--color-bg)] overflow-hidden select-none">

            {/* Tap zones */}
            <div className="absolute inset-0 flex z-0">
                <button
                    className="flex-1 active:bg-[#4ade80]/5 transition-colors outline-none touch-manipulation"
                    onClick={() => handleColumnClick('nosotros')}
                    onPointerDown={longPressNosotros.start}
                    onPointerUp={longPressNosotros.clear}
                    onPointerLeave={longPressNosotros.clear}
                    onPointerCancel={longPressNosotros.clear}
                />
                <button
                    className="flex-1 active:bg-[#fbbf24]/5 transition-colors outline-none touch-manipulation"
                    onClick={() => handleColumnClick('ellos')}
                    onPointerDown={longPressEllos.start}
                    onPointerUp={longPressEllos.clear}
                    onPointerLeave={longPressEllos.clear}
                    onPointerCancel={longPressEllos.clear}
                />
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col pointer-events-none z-10">

                {/* Team headers */}
                <div className="flex w-full pt-4 pb-2">
                    <div className="flex-1 text-center">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-nosotros)] truncate px-2">
                            {teams.nosotros.name}
                        </h2>
                    </div>
                    <div className="w-[1px]" />
                    <div className="flex-1 text-center">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ellos)] truncate px-2">
                            {teams.ellos.name}
                        </h2>
                    </div>
                </div>

                {isPicaConfigured && (
                    <div className="mb-2 px-3">
                        <div className={`rounded-lg border px-3 py-2 text-center ${isPicaActive
                            ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/35'
                            : 'bg-[var(--color-surface)]/70 border-[var(--color-border)]'
                            }`}>
                            <div className={`text-[9px] font-bold uppercase tracking-[0.2em] ${isPicaActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}`}>
                                Pica pica {isPicaActive ? 'activo' : 'configurado'}
                            </div>
                            <div className="text-[12px] font-bold leading-tight mt-0.5">
                                {isPicaActive && currentPairing
                                    ? `${currentNosName} vs ${currentEllName}`
                                    : `Se activa entre ${picaPica?.startAt} y ${picaPica?.endAt} puntos`}
                            </div>
                        </div>
                    </div>
                )}

                {/* Malas label */}
                <div className="flex items-center px-6 mb-1">
                    <div className="h-[1px] flex-1 bg-[var(--color-border)]/40" />
                    <span className="px-3 text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.3em]">Malas</span>
                    <div className="h-[1px] flex-1 bg-[var(--color-border)]/40" />
                </div>

                {/* Malas tally marks */}
                <div className="flex w-full px-6 py-2">
                    <div className="flex-1 flex justify-center">
                        <TallyMarks points={Math.min(teams.nosotros.score, hasBuenasSection ? scoreSplit : targetScore)} />
                    </div>
                    <div className="w-[1px] bg-[var(--color-border)]/20 mx-2" />
                    <div className="flex-1 flex justify-center">
                        <TallyMarks points={Math.min(teams.ellos.score, hasBuenasSection ? scoreSplit : targetScore)} />
                    </div>
                </div>

                {hasBuenasSection && (
                    <>
                        {/* Buenas label */}
                        <div className="flex items-center px-6 mt-2 mb-1">
                            <div className="h-[1px] flex-1 bg-[var(--color-border)]/40" />
                            <span className="px-3 text-[9px] font-semibold text-[var(--color-text-muted)] uppercase tracking-[0.3em]">Buenas</span>
                            <div className="h-[1px] flex-1 bg-[var(--color-border)]/40" />
                        </div>

                        {/* Buenas tally marks */}
                        <div className="flex w-full px-6 py-2">
                            <div className="flex-1 flex justify-center">
                                <TallyMarks points={Math.max(0, teams.nosotros.score - scoreSplit)} />
                            </div>
                            <div className="w-[1px] bg-[var(--color-border)]/20 mx-2" />
                            <div className="flex-1 flex justify-center">
                                <TallyMarks points={Math.max(0, teams.ellos.score - scoreSplit)} />
                            </div>
                        </div>
                    </>
                )}

                {/* Ghost score numbers (toggleable) */}
                <div className={`flex items-center justify-center gap-4 mt-4 transition-all duration-250 ${showNumbers ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    <span className="text-5xl font-black tabular-nums tracking-tighter leading-none opacity-10">{teams.nosotros.score}</span>
                    <span className="text-lg opacity-10">—</span>
                    <span className="text-5xl font-black tabular-nums tracking-tighter leading-none opacity-10">{teams.ellos.score}</span>
                </div>
                {showNumbers && (
                    <div className="text-center mt-0.5">
                        <span className="text-[10px] text-[var(--color-text-muted)] opacity-40">a {targetScore}</span>
                    </div>
                )}

                {/* Eye toggle */}
                <div className="flex justify-center mt-2 pointer-events-auto">
                    <button
                        onClick={() => setShowNumbers(v => !v)}
                        className="text-[var(--color-text-muted)] p-2 rounded-full active:bg-[var(--color-surface)] transition-colors"
                    >
                        <EyeIcon open={showNumbers} />
                    </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Point buttons: 2x2 per team */}
                <div className="w-full px-4 grid grid-cols-2 gap-4 pointer-events-auto z-30 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                    <div className="grid grid-cols-2 gap-1.5">
                        {[1, 2, 3, 4].map(n => (
                            <button
                                key={n}
                                onClick={(e) => { e.stopPropagation(); addPoints('nosotros', n, 'score_tap'); }}
                                onPointerDown={(e) => { e.stopPropagation(); lockShortcutInteraction(); }}
                                onPointerUp={(e) => { e.stopPropagation(); unlockShortcutInteraction(); }}
                                onPointerCancel={() => unlockShortcutInteraction()}
                                onPointerLeave={() => unlockShortcutInteraction()}
                                className="py-3.5 rounded-lg bg-[#4ade80]/8 border border-[#4ade80]/15 text-[#4ade80] font-black text-base active:scale-95 active:bg-[#4ade80]/20 transition-all"
                            >
                                +{n}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[1, 2, 3, 4].map(n => (
                            <button
                                key={n}
                                onClick={(e) => { e.stopPropagation(); addPoints('ellos', n, 'score_tap'); }}
                                onPointerDown={(e) => { e.stopPropagation(); lockShortcutInteraction(); }}
                                onPointerUp={(e) => { e.stopPropagation(); unlockShortcutInteraction(); }}
                                onPointerCancel={() => unlockShortcutInteraction()}
                                onPointerLeave={() => unlockShortcutInteraction()}
                                className="py-3.5 rounded-lg bg-[#fbbf24]/8 border border-[#fbbf24]/15 text-[#fbbf24] font-black text-base active:scale-95 active:bg-[#fbbf24]/20 transition-all"
                            >
                                +{n}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
