import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const env = import.meta.env as Record<string, string | undefined>;
const readRequiredEnv = (key: string): string => {
    const value = env[key]?.trim();
    if (!value) {
        throw new Error(`Missing required env var: ${key}`);
    }
    return value;
};

const readOptionalEnv = (key: string): string | undefined => {
    const value = env[key]?.trim();
    return value || undefined;
};

const firebaseConfig = {
    apiKey: readRequiredEnv("VITE_FIREBASE_API_KEY"),
    authDomain: readRequiredEnv("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: readRequiredEnv("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: readRequiredEnv("VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: readRequiredEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: readRequiredEnv("VITE_FIREBASE_APP_ID"),
    measurementId: readOptionalEnv("VITE_FIREBASE_MEASUREMENT_ID")
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let authBootstrapPromise: Promise<void> | null = null;

export const ensureFirebaseSession = async (): Promise<void> => {
    if (auth.currentUser) return;
    if (!authBootstrapPromise) {
        authBootstrapPromise = signInAnonymously(auth)
            .then(() => undefined)
            .catch((error) => {
                // Auth anónima puede no estar habilitada en algunos entornos.
                // No bloqueamos la app: seguimos con la sesión local.
                console.warn('Anonymous Firebase auth unavailable, continuing without auth session.', error);
            })
            .finally(() => {
                authBootstrapPromise = null;
            });
    }
    await authBootstrapPromise;
};

export { db, auth };
