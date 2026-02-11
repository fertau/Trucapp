import type { CSSProperties, ReactNode } from 'react';

type AvatarVisual = {
    id: string;
    label: string;
    bg: string;
    color: string;
    icon: ReactNode;
};

const AVATAR_VISUALS: AvatarVisual[] = [
    {
        id: 'naipe',
        label: 'Naipe',
        bg: 'linear-gradient(135deg, #1f7668 0%, #0b2a45 100%)',
        color: '#e9fff6',
        icon: <span className="text-[0.62em]">A♠</span>
    },
    {
        id: 'espada',
        label: 'Espada',
        bg: 'linear-gradient(135deg, #2d7fd4 0%, #0e3f8f 100%)',
        color: '#f2f9ff',
        icon: <span className="text-[0.72em]">⚔</span>
    },
    {
        id: 'copa',
        label: 'Copa',
        bg: 'linear-gradient(135deg, #d74f34 0%, #7b1d1d 100%)',
        color: '#fff5ef',
        icon: <span className="text-[0.68em]">🏆</span>
    },
    {
        id: 'oro',
        label: 'Oro',
        bg: 'linear-gradient(135deg, #d0a127 0%, #7f5a11 100%)',
        color: '#fff8e9',
        icon: <span className="text-[0.72em]">◉</span>
    },
    {
        id: 'pelota',
        label: 'Pelota',
        bg: 'linear-gradient(135deg, #3b3f49 0%, #10131a 100%)',
        color: '#ffffff',
        icon: <span className="text-[0.64em]">⚽</span>
    },
    {
        id: 'mate',
        label: 'Mate',
        bg: 'linear-gradient(135deg, #4dbf7f 0%, #156a62 100%)',
        color: '#f2fff8',
        icon: <span className="text-[0.66em]">🧉</span>
    },
    {
        id: 'bandera',
        label: 'Argentina',
        bg: 'linear-gradient(135deg, #5cbef3 0%, #1e63b4 100%)',
        color: '#f5fbff',
        icon: <span className="text-[0.66em]">AR</span>
    },
    {
        id: 'estadio',
        label: 'Estadio',
        bg: 'linear-gradient(135deg, #636d7b 0%, #1d2431 100%)',
        color: '#f5f7ff',
        icon: <span className="text-[0.62em]">🏟</span>
    },
    {
        id: 'fuego',
        label: 'Fuego',
        bg: 'linear-gradient(135deg, #ff7e36 0%, #b92f18 100%)',
        color: '#fff5ee',
        icon: <span className="text-[0.66em]">🔥</span>
    },
    {
        id: 'estrella',
        label: 'Estrella',
        bg: 'linear-gradient(135deg, #4f7ec5 0%, #2f3f72 100%)',
        color: '#f4f8ff',
        icon: <span className="text-[0.7em]">★</span>
    },
    {
        id: 'rayos',
        label: 'Ráfaga',
        bg: 'linear-gradient(135deg, #ffbf47 0%, #db6b1c 100%)',
        color: '#fff9ef',
        icon: <span className="text-[0.68em]">⚡</span>
    },
    {
        id: 'naipes_pro',
        label: 'Truco',
        bg: 'linear-gradient(135deg, #3f8f5d 0%, #0f3c30 100%)',
        color: '#ebfff6',
        icon: <span className="text-[0.58em]">7O</span>
    },
];

const AVATAR_MAP = Object.fromEntries(AVATAR_VISUALS.map((option) => [option.id, option]));

const initialsFromName = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || '?';
};

interface AvatarBadgeProps {
    avatar?: string | null;
    name?: string;
    size?: number;
    className?: string;
}

export const AvatarBadge = ({ avatar, name, size = 44, className = '' }: AvatarBadgeProps) => {
    const visual = avatar ? AVATAR_MAP[avatar] : undefined;
    const style: CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        background: visual?.bg ?? 'linear-gradient(135deg, #26b36f 0%, #1954a9 100%)',
        color: visual?.color ?? '#ffffff',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.28)'
    };

    return (
        <div
            className={`flex items-center justify-center font-black tracking-tight select-none overflow-hidden ${className}`}
            style={style}
            title={visual?.label ?? name ?? 'Avatar'}
        >
            {visual ? (
                <span className="leading-none uppercase">{visual.icon}</span>
            ) : avatar ? (
                <span className="leading-none" style={{ fontSize: `${Math.round(size * 0.46)}px` }}>{avatar}</span>
            ) : (
                <span className="leading-none uppercase" style={{ fontSize: `${Math.round(size * 0.34)}px` }}>
                    {initialsFromName(name)}
                </span>
            )}
        </div>
    );
};

export const avatarOptions = AVATAR_VISUALS;
