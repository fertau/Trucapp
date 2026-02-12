import type { CSSProperties } from 'react';

type AvatarVisual = {
    id: string;
    label: string;
    src: string;
    objectFit?: 'contain' | 'cover';
    objectPosition?: string;
    scale?: number;
};

const toSlug = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const baseName = (path: string): string => {
    const last = path.split('/').pop() ?? path;
    return decodeURIComponent(last.replace(/\.[^.]+$/, ''));
};

const curatedModules = {
    ...import.meta.glob('../assets/avatars-final/*.{png,jpg,jpeg,webp,avif}', { eager: true, import: 'default' })
} as Record<string, string>;

const fileBySlug = Object.fromEntries(
    Object.entries(curatedModules).map(([path, src]) => [toSlug(baseName(path)), src])
);

const pick = (slug: string): string => fileBySlug[slug] ?? '';

const AVATAR_VISUALS: AvatarVisual[] = [
    { id: 'capitan', label: 'Capitan', src: pick('messi_espalda'), objectFit: 'cover' as const, objectPosition: '52% 38%', scale: 1.04 },
    { id: 'campeon', label: 'Campeon', src: pick('messi_copa'), objectFit: 'cover' as const, objectPosition: '50% 35%', scale: 1.02 },
    { id: 'afa', label: 'AFA', src: pick('afa'), scale: 0.9 },
    { id: 'ancho_basto', label: 'Ancho Basto', src: pick('ancho_basto'), scale: 0.9 },
    { id: 'ancho_espada', label: 'Ancho Espada', src: pick('ancho_espada'), scale: 0.9 },
    { id: 'arg_pais', label: 'Pais Argento', src: pick('arg_pais'), scale: 0.88 },
    { id: 'bandera', label: 'Bandera', src: pick('arg_bandera'), scale: 0.88 },
    { id: 'bandera_trozo', label: 'Bandera Trozo', src: pick('bandera_trozo'), scale: 0.9 },
    { id: 'cartas_truco', label: 'Cartas Truco', src: pick('cartas_truco'), scale: 0.82 },
    { id: 'copa_mundo', label: 'Copa Mundo', src: pick('copa_del_mundo'), scale: 0.9 },
    { id: 'escudo_patrio', label: 'Escudo Patrio', src: pick('escudo_arg'), scale: 0.9 },
    { id: 'river_escudo', label: 'River Escudo', src: pick('escudo_river'), scale: 0.9 },
    { id: 'fernet', label: 'Fernet', src: pick('fernet_cortado'), scale: 0.88 },
    { id: 'leon_river', label: 'Leon River', src: pick('leon_river'), scale: 0.92 },
    { id: 'mate', label: 'Mate', src: pick('mate_solo'), scale: 0.9 },
    { id: 'mate_team', label: 'Mate Team', src: pick('mate_termo'), scale: 0.9 },
    { id: 'academia', label: 'Academia', src: pick('racing_escudo'), scale: 0.9 },
].filter((a) => Boolean(a.src));

const AVATAR_MAP = Object.fromEntries(AVATAR_VISUALS.map((option) => [option.id, option]));

const AVATAR_ALIASES: Record<string, string> = {
    naipe: 'cartas_truco',
    espada: 'ancho_espada',
    basto: 'ancho_basto',
    oro: 'escudo_patrio',
    copa: 'copa_mundo',
    pelota: 'capitan',
    mate: 'mate_team',
    bandera: 'bandera',
    estadio: 'river_escudo',
    fuego: 'fernet',
    estrella: 'escudo_patrio',
    rayos: 'campeon',
    naipes_pro: 'cartas_truco',
    truco: 'cartas_truco',
    futbol: 'campeon',
    fernet: 'fernet',
    choripan: 'fernet',
    afa_escudo: 'afa',
    afa: 'afa',
    maradona: 'campeon',
    messi_espalda: 'capitan',
    messi_copa: 'campeon',
    fernet_vaso: 'fernet',
    fernet_cortado: 'fernet',
    fernet_branca: 'fernet',
    empanada: 'mate',
    termo_mate: 'mate_team',
    mate_termo: 'mate_team',
    termo_mate_2: 'mate_team',
    mate_solo: 'mate',
    mate_clasico: 'mate',
    fernet_botella: 'fernet',
    bandera_arg: 'bandera',
    bandera_arg_2: 'bandera',
    arg_bandera: 'bandera',
    ruta40: 'river_escudo',
    sol_arg: 'escudo_patrio',
    mapa_arg: 'arg_pais',
    empanadas_cartel: 'mate',
    arg_pais: 'arg_pais',
    escudo_arg: 'escudo_patrio',
    racing_escudo: 'academia',
    escudi_river: 'river_escudo',
    cartas_truco: 'cartas_truco'
};

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

export const isCustomAvatarDataUrl = (value?: string | null): boolean =>
    typeof value === 'string' && value.startsWith('data:image/');

interface AvatarBadgeProps {
    avatar?: string | null;
    name?: string;
    size?: number;
    className?: string;
}

export const AvatarBadge = ({ avatar, name, size = 44, className = '' }: AvatarBadgeProps) => {
    const visual = getVisualByAvatarId(avatar);
    const isCustom = isCustomAvatarDataUrl(avatar);

    const style: CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        background: 'linear-gradient(135deg, #26b36f 0%, #1954a9 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 6px 14px rgba(0,0,0,0.28)',
        padding: `${Math.max(2, Math.round(size * 0.04))}px`
    };

    return (
        <div
            className={`flex items-center justify-center font-black tracking-tight select-none overflow-hidden ${className}`}
            style={style}
            title={visual?.label ?? name ?? 'Avatar'}
        >
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: '#0f1219' }}>
                {isCustom && avatar ? (
                    <img
                        src={avatar}
                        alt={name ?? 'Avatar personalizado'}
                        className="w-full h-full object-cover"
                        draggable={false}
                    />
                ) : visual ? (
                    <img
                        src={visual.src}
                        alt={visual.label}
                        className="w-full h-full"
                        style={{
                            objectFit: visual.objectFit ?? 'contain',
                            objectPosition: visual.objectPosition ?? 'center',
                            transform: `scale(${visual.scale ?? 1})`,
                            imageRendering: 'auto'
                        }}
                        draggable={false}
                    />
                ) : avatar ? (
                    <span className="leading-none" style={{ fontSize: `${Math.round(size * 0.46)}px` }}>{avatar}</span>
                ) : (
                    <span className="leading-none uppercase text-white" style={{ fontSize: `${Math.round(size * 0.34)}px` }}>
                        {initialsFromName(name)}
                    </span>
                )}
            </div>
        </div>
    );
};

export const avatarOptions = AVATAR_VISUALS;
