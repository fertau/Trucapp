import { useEffect, useState } from 'react';
import { Logo } from './Logo';

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
    const [fading, setFading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFading(true);
            setTimeout(onFinish, 600);
        }, 3500); // Extended duration for full animation sequence

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className={`fixed inset-0 z-[100] bg-[var(--color-bg)] flex flex-col items-center justify-center transition-opacity duration-700 overflow-hidden ${fading ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <div className="relative z-10 flex flex-col items-center">
                <div className="text-[var(--color-text-primary)] mb-8">
                    <Logo className="w-28 h-28" />
                </div>
                <div className="overflow-hidden flex flex-col items-center">
                    <h1 className="text-4xl font-black tracking-[0.4em] text-[var(--color-text-primary)] animate-in slide-in-from-bottom duration-700 delay-[1.6s]">
                        TRUCAPP
                    </h1>
                    <div className="h-[1px] w-12 bg-[var(--color-accent)] my-4 animate-in fade-in duration-700 delay-[1.8s]" />
                    <p className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-[0.5em] animate-in slide-in-from-bottom duration-900 delay-[2s]">
                        PRO SCOREBOARD
                    </p>
                </div>
            </div>
        </div>
    );
};
