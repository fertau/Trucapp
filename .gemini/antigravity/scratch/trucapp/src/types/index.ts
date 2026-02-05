export type TeamId = 'nosotros' | 'ellos';
export type MatchMode = '1v1' | '2v2' | '3v3';
export type PointType = 'envido' | 'real_envido' | 'falta_envido' | 'truco' | 'retruco' | 'vale_cuatro' | 'score_tap' | 'penalty';

export interface Player {
    id: string;
    name: string;
    avatar?: string;
    pin?: string;
    wins?: number;
    matchesPlayed?: number;
}

export interface Team {
    id: TeamId;
    name: string;
    players: string[]; // Player IDs
    score: number;
}

export interface GameAction {
    id: string;
    timestamp: number;
    type: 'ADD_POINTS' | 'UNDO'; // Simplified
    team: TeamId;
    amount: number;
    reason: PointType;
}

export interface Pair {
    id: string;
    name: string; // "Fernando + Julián"
    playerIds: [string, string]; // Always 2
    matchCount: number;
    winCount: number;
    lastPlayedAt: number;
    isFavorite?: boolean;
}

export interface MatchMetadata {
    location?: string;
    date?: number;
    customDate?: number; // If user edits the date
}

export interface MatchState {
    id: string;
    mode: MatchMode;
    startDate: number; // timestamp (creation)

    // V2 Metadata
    metadata?: MatchMetadata;

    targetScore: number;
    teams: {
        nosotros: Team;
        ellos: Team;
    };

    // V2 Pairs
    pairs?: {
        nosotros?: string; // PairId
        ellos?: string;    // PairId
    };

    history: GameAction[];
    isFinished: boolean;
    winner?: TeamId;
}
