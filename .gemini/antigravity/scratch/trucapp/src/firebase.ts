import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDZXg60YvmYYIz2BbI0Yek2C_XamqgJZzI",
    authDomain: "trucapp-b1f1f.firebaseapp.com",
    projectId: "trucapp-b1f1f",
    storageBucket: "trucapp-b1f1f.firebasestorage.app",
    messagingSenderId: "902489387441",
    appId: "1:902489387441:web:c6f70334c612b8b2440d90",
    measurementId: "G-1VM8MPSVZX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
