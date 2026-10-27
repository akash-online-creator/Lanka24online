import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

let configFile: any = {};
try {
  // @ts-ignore
  configFile = require('../../firebase-applet-config.json');
} catch (e) {
  console.warn('firebase-applet-config.json හමුවූයේ නැත. Environment variables භාවිතා වේ.');
}

const firebaseConfig = {
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || configFile.projectId || 'gen-lang-client-0262698872',
  appId: process.env.VITE_FIREBASE_APP_ID || configFile.appId,
  apiKey: process.env.VITE_FIREBASE_API_KEY || configFile.apiKey,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || configFile.authDomain,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || configFile.storageBucket,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || configFile.messagingSenderId,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || configFile.measurementId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app, configFile.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
