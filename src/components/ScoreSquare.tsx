interface ScoreSquareProps {
    points: number; // 0 to 5
}

export const ScoreSquare = ({ points }: ScoreSquareProps) => {
    if (points <= 0) return <div className="w-8 h-8" />; // Placeholder size

    // Stroke color
    const strokeColor = "currentColor";
    const strokeWidth = 3;

    // Dimensions
    const size = 48;
    const padding = 6;

    // Points:
    // 1: Top
    // 2: Right
    // 3: Bottom
    // 4: Left
    // 5: Diagonal

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="score-square">
            {/* Point 1: Top Line */}
            {points >= 1 && (
                <line
                    x1={padding} y1={padding}
                    x2={size - padding} y2={padding}
                    stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
                />
            )}

            {/* Point 2: Right Line */}
            {points >= 2 && (
                <line
                    x1={size - padding} y1={padding}
                    x2={size - padding} y2={size - padding}
                    stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
                />
            )}

            {/* Point 3: Bottom Line */}
            {points >= 3 && (
                <line
                    x1={size - padding} y1={size - padding}
                    x2={padding} y2={size - padding}
                    stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
                />
            )}

            {/* Point 4: Left Line */}
            {points >= 4 && (
                <line
                    x1={padding} y1={size - padding}
                    x2={padding} y2={padding}
                    stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
                />
            )}

            {/* Point 5: Diagonal (Top Right to Bottom Left) */}
            {points >= 5 && (
                <line
                    x1={size - padding} y1={padding}
                    x2={padding} y2={size - padding}
                    stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round"
                />
            )}
        </svg>
    );
};
