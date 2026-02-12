import type { CSSProperties } from 'react';

type AvatarVisual = {
    id: string;
    label: string;
    src: string;
    kind: 'curated' | 'uploaded';
};

const toSlug = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

const toLabel = (value: string): string =>
    value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());

const getFileBase = (path: string): string => {
    const last = path.split('/').pop() ?? path;
    const noExt = last.replace(/\.[^.]+$/, '');
    return decodeURIComponent(noExt);
};

const curatedLabelById: Record<string, string> = {
    afa_escudo: 'AFA',
    mate_clasico: 'Mate',
    maradona: 'Maradona',
    messi_espalda: 'Messi 10',
    fernet_vaso: 'Fernet',
    empanada: 'Empanada',
    termo_mate: 'Termo y Mate',
    fernet_botella: 'Fernet Botella',
    bandera_arg: 'Bandera',
    ruta40: 'Ruta 40',
    sol_arg: 'Sol',
    mapa_arg: 'Argentina',
    messi_copa: 'Messi Copa',
    bandera_arg_2: 'Bandera 2',
    empanadas_cartel: 'Empanadas',
    termo_mate_2: 'Mate Team'
};

const curatedModules = import.meta.glob('../assets/avatars-stickers/*.{png,jpg,jpeg,webp,avif}', {
    eager: true,
    import: 'default'
}) as Record<string, string>;

const uploadedModules = import.meta.glob('../assets/avatars-library/*.{png,jpg,jpeg,webp,avif}', {
    eager: true,
    import: 'default'
}) as Record<string, string>;

const curatedOptions: AvatarVisual[] = Object.entries(curatedModules)
    .map(([path, src]) => {
        const base = getFileBase(path);
        const id = toSlug(base);
        return {
            id,
            label: curatedLabelById[id] ?? toLabel(base),
            src,
            kind: 'curated' as const
        };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

const uploadedOptions: AvatarVisual[] = Object.entries(uploadedModules)
    .map(([path, src]) => {
        const base = getFileBase(path);
        return {
            id: `upload_${toSlug(base)}`,
            label: toLabel(base),
            src,
            kind: 'uploaded' as const,
            rawBase: base
        };
    })
    .filter((x) => !/^sheet-\d+$/i.test(x.rawBase))
    .map(({ rawBase: _rawBase, ...rest }) => rest)
    .sort((a, b) => a.label.localeCompare(b.label));

const AVATAR_VISUALS: AvatarVisual[] = [...curatedOptions, ...uploadedOptions];

const AVATAR_MAP = Object.fromEntries(AVATAR_VISUALS.map((option) => [option.id, option]));

const AVATAR_ALIASES: Record<string, string> = {
    naipe: 'afa_escudo',
    espada: 'upload_ancho_espada',
    basto: 'upload_ancho_basto',
    oro: 'sol_arg',
    copa: 'upload_copa',
    pelota: 'messi_espalda',
    mate: 'mate_clasico',
    bandera: 'bandera_arg',
    estadio: 'ruta40',
    fuego: 'fernet_vaso',
    estrella: 'sol_arg',
    rayos: 'maradona',
    naipes_pro: 'upload_cartas_truco',
    truco: 'upload_cartas_truco',
    futbol: 'messi_copa',
    fernet: 'fernet_vaso',
    choripan: 'empanada'
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
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.28)'
    };

    return (
        <div
            className={`flex items-center justify-center font-black tracking-tight select-none overflow-hidden ${className}`}
            style={style}
            title={visual?.label ?? name ?? 'Avatar'}
        >
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
                    className="w-full h-full object-contain"
                    style={{
                        mixBlendMode: visual.kind === 'uploaded' ? 'normal' : 'multiply',
                        filter: visual.kind === 'uploaded' ? 'none' : 'saturate(1.04) contrast(1.02)'
                    }}
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
