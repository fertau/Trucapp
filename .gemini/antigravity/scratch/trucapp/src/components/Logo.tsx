export const Logo = ({ className = "w-32 h-32" }: { className?: string }) => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${className} score-square`}>
        {/* The Square (4 lines) - Hand-drawn style with consistent overshoots */}
        {/* Top line: overshoots on both ends */}
        <line x1="16" y1="20" x2="84" y2="19.5" stroke="currentColor" strokeWidth="8" className="animate-[draw_0.4s_ease-out_forwards]" style={{ animationDelay: '0.1s', strokeDasharray: 68, strokeDashoffset: 68 }} />
        {/* Right line: overshoots on both ends, slightly tilted */}
        <line x1="80.5" y1="16" x2="79.5" y2="84" stroke="currentColor" strokeWidth="8" className="animate-[draw_0.4s_ease-out_forwards]" style={{ animationDelay: '0.4s', strokeDasharray: 68, strokeDashoffset: 68 }} />
        {/* Bottom line: overshoots on both ends, slightly curved */}
        <line x1="84" y1="80.5" x2="16" y2="80" stroke="currentColor" strokeWidth="8" className="animate-[draw_0.4s_ease-out_forwards]" style={{ animationDelay: '0.7s', strokeDasharray: 68, strokeDashoffset: 68 }} />
        {/* Left line: overshoots on both ends */}
        <line x1="19.5" y1="84" x2="20.5" y2="16" stroke="currentColor" strokeWidth="8" className="animate-[draw_0.4s_ease-out_forwards]" style={{ animationDelay: '1.0s', strokeDasharray: 68, strokeDashoffset: 68 }} />
        {/* The Cross ("El Gancho") - Bottom-Left to Top-Right with slight imperfection */}
        <line x1="19.5" y1="80.5" x2="80.5" y2="19.5" stroke="var(--color-accent)" strokeWidth="8" className="animate-[draw_0.4s_ease-out_forwards]" style={{ animationDelay: '1.3s', strokeDasharray: 86, strokeDashoffset: 86 }} />
    </svg>
);
