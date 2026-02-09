import type { CSSProperties } from 'react';

export const AceOfSwords = ({ className = "", style }: { className?: string, style?: CSSProperties }) => (
    <svg viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <rect x="5" y="5" width="90" height="130" rx="8" fill="white" stroke="#333" strokeWidth="2" />
        <path d="M50 20 L60 40 L50 110 L40 40 Z" fill="#2D3436" />
        <path d="M35 110 H65 V115 H35 Z" fill="#2D3436" />
        <text x="12" y="25" fill="#2D3436" fontSize="14" fontWeight="bold">1</text>
        <text x="88" y="125" fill="#2D3436" fontSize="14" fontWeight="bold" transform="rotate(180 88 125)">1</text>
    </svg>
);

export const AceOfClubs = ({ className = "", style }: { className?: string, style?: CSSProperties }) => (
    <svg viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <rect x="5" y="5" width="90" height="130" rx="8" fill="white" stroke="#333" strokeWidth="2" />
        <path d="M50 110 V30 M40 50 Q50 30 60 50 M35 70 Q50 50 65 70" stroke="#27ae60" strokeWidth="6" strokeLinecap="round" />
        <text x="12" y="25" fill="#27ae60" fontSize="14" fontWeight="bold">1</text>
        <text x="88" y="125" fill="#27ae60" fontSize="14" fontWeight="bold" transform="rotate(180 88 125)">1</text>
    </svg>
);

export const SevenOfSwords = ({ className = "", style }: { className?: string, style?: CSSProperties }) => (
    <svg viewBox="0 0 100 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <rect x="5" y="5" width="90" height="130" rx="8" fill="white" stroke="#333" strokeWidth="2" />
        {/* Simplified 3 swords on left, 3 on right, 1 in middle */}
        <path d="M30 30 L30 110 M70 30 L70 110 M50 40 L50 100" stroke="#2D3436" strokeWidth="4" strokeLinecap="round" />
        <text x="12" y="25" fill="#2D3436" fontSize="14" fontWeight="bold">7</text>
        <text x="88" y="125" fill="#2D3436" fontSize="14" fontWeight="bold" transform="rotate(180 88 125)">7</text>
    </svg>
);
