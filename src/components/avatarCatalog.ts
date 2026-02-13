export type AvatarVisual = {
    id: string;
    label: string;
    src: string;
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

export const avatarOptions: AvatarVisual[] = [
    { id: 'capitan', label: 'CARP', src: pick('river_letras') },
    { id: 'afa', label: 'AFA', src: pick('afa') },
    { id: 'ancho_basto', label: 'Ancho Basto', src: pick('ancho_basto') },
    { id: 'ancho_espada', label: 'Ancho Espada', src: pick('ancho_espada') },
    { id: 'pais_argento', label: 'Pais Argento', src: pick('pais_arg') },
    { id: 'sol_argento', label: 'Sol Argento', src: pick('sol_arg') },
    { id: 'cartas_truco', label: 'Cartas Truco', src: pick('cartas_truco') },
    { id: 'copa_mundo', label: 'Copa Mundo', src: pick('copa_fifa') },
    { id: 'river_escudo', label: 'River Escudo', src: pick('escudo_river') },
    { id: 'fernet', label: 'Fernet', src: pick('fernet') },
    { id: 'leon_river', label: 'Leon River', src: pick('leon_river') },
    { id: 'mate_team', label: 'Mate Team', src: pick('mate_termo') },
    { id: 'academia', label: 'Academia', src: pick('racing_escudo') },
    { id: 'geo_violeta', label: 'Geo Violeta', src: pick('geo_violeta') },
].filter((a) => Boolean(a.src));

const AVATAR_MAP = Object.fromEntries(avatarOptions.map((option) => [option.id, option]));

const AVATAR_ALIASES: Record<string, string> = {
    naipe: 'cartas_truco',
    espada: 'ancho_espada',
    basto: 'ancho_basto',
    oro: 'sol_argento',
    copa: 'copa_mundo',
    pelota: 'capitan',
    mate: 'mate_team',
    bandera: 'pais_argento',
    estadio: 'river_escudo',
    fuego: 'fernet',
    estrella: 'sol_argento',
    rayos: 'copa_mundo',
    naipes_pro: 'cartas_truco',
    truco: 'cartas_truco',
    futbol: 'copa_mundo',
    fernet: 'fernet',
    choripan: 'fernet',
    afa_escudo: 'afa',
    afa: 'afa',
    maradona: 'copa_mundo',
    messi_espalda: 'capitan',
    messi_copa: 'copa_mundo',
    campeon: 'copa_mundo',
    geo: 'geo_violeta',
    fernet_vaso: 'fernet',
    fernet_cortado: 'fernet',
    fernet_branca: 'fernet',
    empanada: 'mate_team',
    termo_mate: 'mate_team',
    mate_termo: 'mate_team',
    termo_mate_2: 'mate_team',
    mate_solo: 'mate_team',
    mate_clasico: 'mate_team',
    fernet_botella: 'fernet',
    bandera_arg: 'pais_argento',
    bandera_arg_2: 'pais_argento',
    arg_bandera: 'pais_argento',
    ruta40: 'river_escudo',
    sol_arg: 'sol_argento',
    mapa_arg: 'pais_argento',
    empanadas_cartel: 'mate_team',
    arg_pais: 'pais_argento',
    escudo_arg: 'afa',
    racing_escudo: 'academia',
    escudi_river: 'river_escudo',
    cartas_truco: 'cartas_truco'
};

export const getVisualByAvatarId = (avatar?: string | null): AvatarVisual | undefined => {
    if (!avatar) return undefined;
    const direct = AVATAR_MAP[avatar];
    if (direct) return direct;
    const alias = AVATAR_ALIASES[avatar];
    return alias ? AVATAR_MAP[alias] : undefined;
};

export const isCustomAvatarDataUrl = (value?: string | null): boolean =>
    typeof value === 'string' && value.startsWith('data:image/');
