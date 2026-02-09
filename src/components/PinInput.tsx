import { useState, useEffect, useRef } from 'react';

interface PinInputProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (pin: string) => void;
    autoFocus?: boolean;
}

export const PinInput = ({ value, onChange, onComplete, autoFocus = false }: PinInputProps) => {
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep focus if value is cleared (error state)
    useEffect(() => {
        if (value === '' && focused && inputRef.current) {
            inputRef.current.focus();
        }
    }, [value, focused]);

    // Initial autofocus
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.replace(/\D/g, '').slice(0, 4);
        onChange(newValue);

        if (newValue.length === 4 && onComplete) {
            onComplete(newValue);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 relative">
            <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={value}
                onChange={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20"
                style={{ fontSize: '1px' }} // Tiny font to avoid zoom
            />

            <div className="flex gap-3 relative z-10 pointer-events-none">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${focused && value.length === i
                                ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 scale-110 shadow-lg shadow-[var(--color-accent)]/20'
                                : value.length > i
                                    ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                            }`}
                    >
                        {value[i] ? '●' : ''}
                    </div>
                ))}
            </div>

            <div className="text-xs text-[var(--color-text-muted)] tracking-wider">
                {value.length}/4 dígitos
            </div>
        </div>
    );
};
