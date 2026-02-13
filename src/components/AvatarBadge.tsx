import type { CSSProperties } from 'react';
import { getVisualByAvatarId, isCustomAvatarDataUrl } from './avatarCatalog';

interface AvatarBadgeProps {
    avatar?: string | null;
    name?: string;
    size?: number;
    className?: string;
}

const initialsFromName = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || '?';
};

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
                            objectFit: 'cover',
                            objectPosition: 'center',
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
