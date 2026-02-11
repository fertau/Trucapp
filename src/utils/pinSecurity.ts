const PBKDF2_PREFIX = 'pbkdf2';
const PBKDF2_ITERATIONS = 120000;
const SALT_BYTES = 16;

const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary);
};

const fromBase64 = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const deriveKey = async (pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> => {
    const encoder = new TextEncoder();
    const stableSalt = new Uint8Array(salt);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: stableSalt, iterations, hash: 'SHA-256' },
        keyMaterial,
        256
    );

    return new Uint8Array(bits);
};

export const hashPin = async (pin: string): Promise<string> => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const hash = await deriveKey(pin, salt, PBKDF2_ITERATIONS);
    return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
};

export const isModernPinHash = (value?: string | null): boolean =>
    typeof value === 'string' && value.startsWith(`${PBKDF2_PREFIX}$`);

export const verifyPin = async (pin: string, storedValue?: string | null): Promise<boolean> => {
    if (!storedValue) return false;

    // Backward-compatible legacy support
    if (!isModernPinHash(storedValue)) {
        return storedValue === pin || storedValue === `hash_${pin}`;
    }

    const parts = storedValue.split('$');
    if (parts.length !== 4) return false;

    const iterations = Number(parts[1]);
    const salt = fromBase64(parts[2]);
    const storedHash = fromBase64(parts[3]);
    const computedHash = await deriveKey(pin, salt, iterations);

    if (storedHash.length !== computedHash.length) return false;

    let diff = 0;
    for (let i = 0; i < storedHash.length; i++) {
        diff |= storedHash[i] ^ computedHash[i];
    }
    return diff === 0;
};
