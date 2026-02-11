import type { CSSProperties } from 'react';
import espadaImg from '../assets/avatars-real/espada.svg';
import bastoImg from '../assets/avatars-real/basto.svg';
import oroImg from '../assets/avatars-real/oro.svg';
import copaImg from '../assets/avatars-real/copa.svg';
import mateImg from '../assets/avatars-real/mate3.jpg';
import mateGauchoImg from '../assets/avatars-real/mate_gaucho.jpg';
import fernetImg from '../assets/avatars-real/fernet2.jpg';
import fernetAltImg from '../assets/avatars-real/fernet.jpg';
import choripanImg from '../assets/avatars-real/choripan2.jpg';
import futbolImg from '../assets/avatars-real/futbol.jpg';
import cartasImg from '../assets/avatars-real/cartas_real.jpg';

type AvatarVisual = {
    id: string;
    label: string;
    src: string;
    objectPosition?: string;
};

const AVATAR_VISUALS: AvatarVisual[] = [
    { id: 'espada', label: 'Espada', src: espadaImg },
    { id: 'basto', label: 'Basto', src: bastoImg },
    { id: 'oro', label: 'Oro', src: oroImg },
    { id: 'copa', label: 'Copa', src: copaImg },
    { id: 'cartas', label: 'Cartas', src: cartasImg, objectPosition: 'center 62%' },
    { id: 'mate', label: 'Mate', src: mateImg, objectPosition: 'center 34%' },
    { id: 'mate_arg', label: 'Mate Argentino', src: mateGauchoImg, objectPosition: 'center 35%' },
    { id: 'fernet', label: 'Fernet', src: fernetImg, objectPosition: 'center 58%' },
    { id: 'fernet_clasico', label: 'Fernet Clásico', src: fernetAltImg, objectPosition: 'center 42%' },
    { id: 'choripan', label: 'Choripán', src: choripanImg, objectPosition: 'center 45%' },
    { id: 'futbol', label: 'Fútbol', src: futbolImg, objectPosition: 'center 42%' },
];

const AVATAR_ALIASES: Record<string, string> = {
    naipe: 'cartas',
    pelota: 'futbol',
    bandera: 'mate_arg',
    estadio: 'futbol',
    fuego: 'fernet',
    estrella: 'copa',
    rayos: 'espada',
    naipes_pro: 'cartas',
    truco: 'cartas'
};

const AVATAR_MAP = Object.fromEntries(AVATAR_VISUALS.map((option) => [option.id, option]));

const getVisualByAvatarId = (avatar?: string | null): AvatarVisual | undefined => {
    if (!avatar) return undefined;
    const direct = AVATAR_MAP[avatar];
    if (direct) return direct;
    const alias = AVATAR_ALIASES[avatar];
    return alias ? AVATAR_MAP[alias] : undefined;
};

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
    const visual = getVisualByAvatarId(avatar);
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
                    style={{ objectPosition: visual.objectPosition ?? 'center' }}
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
