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
    ...import.meta.glob('../assets/avatars-stickers/*.{png,jpg,jpeg,webp,avif}', { eager: true, import: 'default' }),
    ...import.meta.glob('../assets/avatars-library/*.{png,jpg,jpeg,webp,avif}', { eager: true, import: 'default' })
} as Record<string, string>;

const fileBySlug = Object.fromEntries(
    Object.entries(curatedModules).map(([path, src]) => [toSlug(baseName(path)), src])
);

const pick = (slug: string): string => fileBySlug[slug] ?? '';

const AVATAR_VISUALS: AvatarVisual[] = [
    { id: 'el_diez', label: 'El Diez', src: pick('messi_espalda'), objectFit: 'cover' as const, objectPosition: '52% 38%', scale: 1.06 },
    { id: 'campeon', label: 'Campeon', src: pick('messi_copa'), objectFit: 'cover' as const, objectPosition: '50% 34%', scale: 1.02 },
    { id: 'pelusa', label: 'Pelusa', src: pick('maradona'), objectFit: 'cover' as const, objectPosition: '50% 40%', scale: 1.08 },
    { id: 'afa_dorada', label: 'AFA Dorada', src: pick('afa'), scale: 0.86 },
    { id: 'escudo_patria', label: 'Escudo Patrio', src: pick('escudo_arg'), scale: 0.84 },
    { id: 'mapa_argento', label: 'Mapa Argento', src: pick('arg_pais'), scale: 0.8 },
    { id: 'bandera_cielo', label: 'Bandera Cielo', src: pick('arg_bandera'), scale: 0.82 },
    { id: 'ruta_cuarenta', label: 'Ruta Cuarenta', src: pick('ruta40'), scale: 0.86 },
    { id: 'ancho_espada', label: 'Ancho Espada', src: pick('ancho_espada'), scale: 0.83 },
    { id: 'ancho_basto', label: 'Ancho Basto', src: pick('ancho_basto'), scale: 0.83 },
    { id: 'basto_bravo', label: 'Basto Bravo', src: pick('basto'), scale: 0.82 },
    { id: 'copa_truco', label: 'Copa Truco', src: pick('copa'), scale: 0.84 },
    { id: 'cartas_bravas', label: 'Cartas Bravas', src: pick('cartas_truco'), scale: 0.74 },
    { id: 'la_empa', label: 'La Empa', src: pick('empanada'), scale: 0.94 },
    { id: 'fernet_cortado', label: 'Fernet Cortado', src: pick('fernet_cortado'), scale: 0.8 },
    { id: 'branca_logo', label: 'Branca', src: pick('fernet_branca'), scale: 0.86 },
    { id: 'branca_botella', label: 'Branca Botella', src: pick('fernet_botella'), scale: 0.78 },
    { id: 'mate_power', label: 'Mate Power', src: pick('mate_termo'), scale: 0.82 },
    { id: 'manso_mate', label: 'Manso Mate', src: pick('mate_clasico'), scale: 0.82 },
    { id: 'copa_mundial', label: 'Copa Mundial', src: pick('copa_del_mundo'), scale: 0.8 },
    { id: 'millonario', label: 'Millonario', src: pick('escudi_river'), scale: 0.86 },
    { id: 'academia', label: 'Academia', src: pick('racing_escudo'), scale: 0.86 },
].filter((a) => Boolean(a.src));

const AVATAR_MAP = Object.fromEntries(AVATAR_VISUALS.map((option) => [option.id, option]));

const AVATAR_ALIASES: Record<string, string> = {
    naipe: 'cartas_bravas',
    espada: 'ancho_espada',
    basto: 'ancho_basto',
    oro: 'escudo_patria',
    copa: 'copa_truco',
    pelota: 'el_diez',
    mate: 'mate_power',
    bandera: 'bandera_cielo',
    estadio: 'ruta_cuarenta',
    fuego: 'fernet_cortado',
    estrella: 'escudo_patria',
    rayos: 'pelusa',
    naipes_pro: 'cartas_bravas',
    truco: 'cartas_bravas',
    futbol: 'campeon',
    fernet: 'fernet_cortado',
    choripan: 'la_empa',
    afa_escudo: 'afa_dorada',
    afa: 'afa_dorada',
    maradona: 'pelusa',
    messi_espalda: 'el_diez',
    messi_copa: 'campeon',
    fernet_vaso: 'fernet_cortado',
    fernet_cortado: 'fernet_cortado',
    fernet_branca: 'branca_logo',
    empanada: 'la_empa',
    termo_mate: 'mate_power',
    mate_termo: 'mate_power',
    termo_mate_2: 'mate_power',
    mate_solo: 'manso_mate',
    mate_clasico: 'manso_mate',
    fernet_botella: 'branca_botella',
    bandera_arg: 'bandera_cielo',
    bandera_arg_2: 'bandera_cielo',
    arg_bandera: 'bandera_cielo',
    ruta40: 'ruta_cuarenta',
    sol_arg: 'escudo_patria',
    mapa_arg: 'mapa_argento',
    arg_pais: 'mapa_argento',
    empanadas_cartel: 'la_empa',
    escudo_arg: 'escudo_patria',
    racing_escudo: 'academia',
    escudi_river: 'millonario',
    cartas_truco: 'cartas_bravas'
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
                            transform: `scale(${visual.scale ?? 1})`
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
