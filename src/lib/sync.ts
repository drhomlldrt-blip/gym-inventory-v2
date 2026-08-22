import { db } from './db';
import { firestore, firebaseConfigurado } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

// ==========================================================
// SINCRONIZACIÓN — offline-first, nunca bloqueante
// ==========================================================
// Estrategia: la app funciona 100% con IndexedDB. Cuando detecta
// conexión, procesa la cola (syncQueue) en orden y actualiza el
// estado de cada operación. Nunca borra datos locales sin
// confirmación del servidor (requisito 26).

const COLECCION_POR_TIPO: Record<string, string> = {
  CONTEO: 'conteos',
  PRODUCTO: 'productos',
  CATEGORIA: 'categorias',
  UBICACION: 'ubicaciones',
  USUARIO: 'usuarios',
  SUCURSAL: 'sucursales',
};

export async function hayConexionReal(): Promise<boolean> {
  if (!firebaseConfigurado) return false; // sin Firebase configurado, no hay nada que sincronizar
  if (!navigator.onLine) return false;
  try {
    // Ping liviano; ajusta a un endpoint propio si prefieres no usar Firestore para esto
    await fetch('https://firestore.googleapis.com', { method: 'HEAD', mode: 'no-cors' });
    return true;
  } catch {
    return false;
  }
}

export async function sincronizarPendientes(
  onEstado?: (estado: 'sincronizando' | 'completado' | 'sin-cambios' | 'error') => void
) {
  const conectado = await hayConexionReal();
  if (!conectado) return;

  const pendientes = await db.syncQueue.where('estado').equals('PENDIENTE').toArray();
  if (pendientes.length === 0) {
    onEstado?.('sin-cambios');
    return;
  }

  onEstado?.('sincronizando');

  for (const op of pendientes) {
    const coleccion = COLECCION_POR_TIPO[op.tipo];
    try {
      if (op.accion === 'ELIMINAR') {
        await deleteDoc(doc(firestore!, coleccion, op.entidadId));
      } else {
        await setDoc(doc(firestore!, coleccion, op.entidadId), op.payload as object, {
          merge: true,
        });
      }
      await db.syncQueue.update(op.id, { estado: 'SINCRONIZADO' });

      // Si era un conteo, refleja el estado en el registro local también
      if (op.tipo === 'CONTEO') {
        await db.conteos.update(op.entidadId, { estadoSync: 'SINCRONIZADO' });
      }
    } catch (err) {
      await db.syncQueue.update(op.id, {
        estado: 'ERROR',
        intentos: op.intentos + 1,
        ultimoError: String(err),
      });
      onEstado?.('error');
    }
  }

  onEstado?.('completado');
}

// Escucha automáticamente cuando vuelve la conexión y sincroniza
export function iniciarListenerSync(onEstado?: Parameters<typeof sincronizarPendientes>[0]) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => sincronizarPendientes(onEstado);
  window.addEventListener('online', handler);
  // Intento inicial al cargar
  handler();
  const interval = setInterval(handler, 30000); // reintento cada 30s
  return () => {
    window.removeEventListener('online', handler);
    clearInterval(interval);
  };
}
