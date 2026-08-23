import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseConfigurado } from './firebase';

// ==========================================================
// AUTENTICACIÓN — necesaria para que las reglas de seguridad
// de Firestore sean permanentes (no expiran como el "modo de
// prueba"). No pedimos nada al usuario: cada dispositivo se
// identifica solo, en silencio, al abrir la app. El PIN sigue
// siendo el control de acceso real para las personas.
// ==========================================================

let promesaListo: Promise<void> | null = null;

export function asegurarAutenticacion(): Promise<void> {
  if (!firebaseConfigurado || !auth) return Promise.resolve();
  if (promesaListo) return promesaListo;

  promesaListo = new Promise((resolve) => {
    const cancelar = onAuthStateChanged(auth!, (usuario) => {
      if (usuario) {
        cancelar();
        resolve();
      } else {
        signInAnonymously(auth!).catch((err) => {
          console.warn('No se pudo autenticar de forma anónima con Firebase:', err);
          resolve(); // no bloquear la app aunque falle
        });
      }
    });
  });

  return promesaListo;
}
