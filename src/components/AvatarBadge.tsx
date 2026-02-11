import type { CSSProperties } from 'react';
import naipeImg from '../assets/avatars/naipe.svg';
import espadaImg from '../assets/avatars/espada.svg';
import copaImg from '../assets/avatars/copa.svg';
import oroImg from '../assets/avatars/oro.svg';
import pelotaImg from '../assets/avatars/pelota.svg';
import mateImg from '../assets/avatars/mate.svg';
import banderaImg from '../assets/avatars/bandera.svg';
import estadioImg from '../assets/avatars/estadio.svg';
import fuegoImg from '../assets/avatars/fuego.svg';
import estrellaImg from '../assets/avatars/estrella.svg';
import rayosImg from '../assets/avatars/rayos.svg';
import naipesProImg from '../assets/avatars/naipes_pro.svg';

type AvatarVisual = {
    id: string;
    label: string;
    src: string;
};

const AVATAR_VISUALS: AvatarVisual[] = [
    { id: 'naipe', label: 'Naipe', src: naipeImg },
    { id: 'espada', label: 'Espada', src: espadaImg },
    { id: 'copa', label: 'Copa', src: copaImg },
    { id: 'oro', label: 'Oro', src: oroImg },
    { id: 'pelota', label: 'Pelota', src: pelotaImg },
    { id: 'mate', label: 'Mate', src: mateImg },
    { id: 'bandera', label: 'Argentina', src: banderaImg },
    { id: 'estadio', label: 'Estadio', src: estadioImg },
    { id: 'fuego', label: 'Fuego', src: fuegoImg },
    { id: 'estrella', label: 'Estrella', src: estrellaImg },
    { id: 'rayos', label: 'Ráfaga', src: rayosImg },
    { id: 'naipes_pro', label: 'Truco', src: naipesProImg },
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
        background: 'linear-gradient(135deg, #26b36f 0%, #1954a9 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.28)'
    };

    return (
        <div
            className={`flex items-center justify-center font-black tracking-tight select-none overflow-hidden ${className}`}
            style={style}
            title={visual?.label ?? name ?? 'Avatar'}
        >
            {visual ? (
                <img
                    src={visual.src}
                    alt={visual.label}
                    className="w-full h-full object-cover"
                    draggable={false}
                />
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
