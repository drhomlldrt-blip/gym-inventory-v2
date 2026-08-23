import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Reemplaza estos valores con los de tu proyecto de Firebase
// (Firebase Console > Configuración del proyecto > Tus apps > SDK config)
// Si no configuras esto, la app sigue funcionando 100% offline, solo
// no habrá respaldo/sincronización en la nube.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseConfigurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let firebaseApp: FirebaseApp | undefined;
let firestore: Firestore | undefined;
let auth: Auth | undefined;

if (firebaseConfigurado) {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firestore = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
} else if (typeof window !== 'undefined') {
  // Aviso solo informativo en consola del navegador; no rompe la app.
  console.info(
    'Firebase no está configurado (.env.local vacío). La app funciona en modo 100% offline.'
  );
}

export { firebaseApp, firestore, auth, firebaseConfigurado };
