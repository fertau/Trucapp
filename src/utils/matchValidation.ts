import type { MatchState, TeamId } from '../types';

const getExpectedWinner = (scoreNos: number, scoreEll: number): TeamId | null => {
    if (scoreNos === scoreEll) return null;
    return scoreNos > scoreEll ? 'nosotros' : 'ellos';
};

export const validateMatchResultConsistency = (match: MatchState): { valid: boolean; reason?: string } => {
    const scoreNos = match.teams.nosotros.score;
    const scoreEll = match.teams.ellos.score;
    const winner = match.winner ?? null;

    if (!Number.isFinite(scoreNos) || !Number.isFinite(scoreEll)) {
        return { valid: false, reason: 'Puntaje invalido: no numerico.' };
    }
    if (!Number.isInteger(scoreNos) || !Number.isInteger(scoreEll)) {
        return { valid: false, reason: 'Puntaje invalido: debe ser entero.' };
    }
    if (scoreNos < 0 || scoreEll < 0) {
        return { valid: false, reason: 'Puntaje invalido: no puede ser negativo.' };
    }

    const expectedWinner = getExpectedWinner(scoreNos, scoreEll);
    if (winner !== expectedWinner) {
        return { valid: false, reason: 'Ganador inconsistente con el puntaje.' };
    }

    return { valid: true };
};

export const canUserEditMatch = (match: MatchState, userId: string | null | undefined): boolean => {
    if (!userId) return false;
    return match.teams.nosotros.players.includes(userId) || match.teams.ellos.players.includes(userId);
};

export const canUserDeleteMatch = (
    match: MatchState,
    userId: string | null | undefined,
    isAdmin = false
): boolean => {
    if (!userId) return false;
    if (isAdmin) return true;
    if (match.createdByUserId) return match.createdByUserId === userId;
    // Fallback para legacy sin creador persistido.
    return canUserEditMatch(match, userId);
};
