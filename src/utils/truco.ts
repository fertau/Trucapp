export const getFaltaEnvidoSuggestedPoints = (
    targetScore: number,
    winnerScore: number,
    opponentScore: number
): number => {
    const clampedTarget = Math.max(1, targetScore);

    // Partido corto: no existe split malas/buenas.
    if (clampedTarget <= 15) {
        return Math.max(0, clampedTarget - winnerScore);
    }

    // Partido a 30:
    // - Rival en malas (0-14): ganar partido.
    // - Rival en buenas (15-29): sumar lo que le falta al rival para 30.
    const opponentInMalas = opponentScore <= 14;
    if (opponentInMalas) {
        return Math.max(0, clampedTarget - winnerScore);
    }
    return Math.max(0, clampedTarget - opponentScore);
};

