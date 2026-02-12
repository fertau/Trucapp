import type { CSSProperties } from 'react';
import afaEscudoImg from '../assets/avatars-stickers/afa_escudo.png';
import mateClasicoImg from '../assets/avatars-stickers/mate_clasico.png';
import maradonaImg from '../assets/avatars-stickers/maradona.png';
import messiEspaldaImg from '../assets/avatars-stickers/messi_espalda.png';
import fernetVasoImg from '../assets/avatars-stickers/fernet_vaso.png';
import empanadaImg from '../assets/avatars-stickers/empanada.png';
import termoMateImg from '../assets/avatars-stickers/termo_mate.png';
import fernetBotellaImg from '../assets/avatars-stickers/fernet_botella.png';
import banderaArgImg from '../assets/avatars-stickers/bandera_arg.png';
import ruta40Img from '../assets/avatars-stickers/ruta40.png';
import solArgImg from '../assets/avatars-stickers/sol_arg.png';
import mapaArgImg from '../assets/avatars-stickers/mapa_arg.png';
import messiCopaImg from '../assets/avatars-stickers/messi_copa.png';
import banderaArg2Img from '../assets/avatars-stickers/bandera_arg_2.png';
import empanadasCartelImg from '../assets/avatars-stickers/empanadas_cartel.png';
import termoMate2Img from '../assets/avatars-stickers/termo_mate_2.png';

type AvatarVisual = {
    id: string;
    label: string;
    src: string;
    objectPosition?: string;
};

const AVATAR_VISUALS: AvatarVisual[] = [
    { id: 'afa_escudo', label: 'AFA', src: afaEscudoImg },
    { id: 'mate_clasico', label: 'Mate', src: mateClasicoImg },
    { id: 'maradona', label: 'Maradona', src: maradonaImg },
    { id: 'messi_espalda', label: 'Messi 10', src: messiEspaldaImg },
    { id: 'fernet_vaso', label: 'Fernet', src: fernetVasoImg },
    { id: 'empanada', label: 'Empanada', src: empanadaImg },
    { id: 'termo_mate', label: 'Termo y Mate', src: termoMateImg },
    { id: 'fernet_botella', label: 'Fernet Botella', src: fernetBotellaImg },
    { id: 'bandera_arg', label: 'Bandera', src: banderaArgImg },
    { id: 'ruta40', label: 'Ruta 40', src: ruta40Img },
    { id: 'sol_arg', label: 'Sol', src: solArgImg },
    { id: 'mapa_arg', label: 'Argentina', src: mapaArgImg },
    { id: 'messi_copa', label: 'Messi Copa', src: messiCopaImg },
    { id: 'bandera_arg_2', label: 'Bandera 2', src: banderaArg2Img },
    { id: 'empanadas_cartel', label: 'Empanadas', src: empanadasCartelImg },
    { id: 'termo_mate_2', label: 'Mate Team', src: termoMate2Img },
];

const AVATAR_ALIASES: Record<string, string> = {
    naipe: 'afa_escudo',
    espada: 'messi_espalda',
    basto: 'termo_mate',
    oro: 'sol_arg',
    copa: 'messi_copa',
    pelota: 'messi_espalda',
    mate: 'mate_clasico',
    bandera: 'bandera_arg',
    estadio: 'ruta40',
    fuego: 'fernet_vaso',
    estrella: 'sol_arg',
    rayos: 'maradona',
    naipes_pro: 'empanada',
    truco: 'afa_escudo',
    futbol: 'messi_copa',
    fernet: 'fernet_vaso',
    choripan: 'empanada'
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
                    className="w-full h-full object-contain"
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
