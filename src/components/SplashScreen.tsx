import { useEffect, useState } from 'react';
import { Logo } from './Logo';

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
    const [fading, setFading] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [showWordmark, setShowWordmark] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updateReducedMotion = () => setReducedMotion(media.matches);
        updateReducedMotion();
        media.addEventListener('change', updateReducedMotion);

        return () => {
            media.removeEventListener('change', updateReducedMotion);
        };
    }, []);

    useEffect(() => {
        if (reducedMotion) {
            const timer = setTimeout(() => {
                setFading(true);
                setTimeout(onFinish, 220);
            }, 850);
            return () => clearTimeout(timer);
        }

        const wordmarkTimer = setTimeout(() => setShowWordmark(true), 220);
        const fadeTimer = setTimeout(() => {
            setFading(true);
            setTimeout(onFinish, 260);
        }, 1650);

        return () => {
            clearTimeout(wordmarkTimer);
            clearTimeout(fadeTimer);
        };
    }, [onFinish, reducedMotion]);

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-300 overflow-hidden ${fading ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(74,222,128,0.15),transparent_50%),linear-gradient(180deg,#1f2226_0%,#141518_100%)]" />
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

            <div className="relative z-10 flex flex-col items-center">
                <div className={`text-[var(--color-text-primary)] mb-8 transition-all duration-500 ${showWordmark ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                    <Logo className="w-24 h-24" />
                </div>
                <div className="overflow-hidden flex flex-col items-center">
                    <h1 className={`text-4xl font-black tracking-[0.32em] text-[var(--color-text-primary)] transition-all duration-500 ${showWordmark ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                        TRUCAPP
                    </h1>
                    <div className={`h-[1px] w-12 bg-[var(--color-accent)] my-4 transition-opacity duration-500 ${showWordmark ? 'opacity-100' : 'opacity-0'}`} />
                    <div className={`h-3 transition-all duration-500 ${showWordmark ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`} />
                </div>
            </div>
        </div>
    );
};
