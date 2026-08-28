import { db } from './db';
import { firestore, firebaseConfigurado } from './firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { asegurarAutenticacion } from './auth';

// ==========================================================
// SINCRONIZACION — offline-first, nunca bloqueante
// ==========================================================

const COLECCION_POR_TIPO: Record<string, string> = {
  CONTEO: 'conteos',
  PRODUCTO: 'productos',
  CATEGORIA: 'categorias',
  UBICACION: 'ubicaciones',
  TIPO_EMPAQUE: 'tiposEmpaque',
  CONFIGURACION: 'configuracion',
};

const TABLAS_MAESTRAS: { tabla: 'productos' | 'categorias' | 'ubicaciones' | 'tiposEmpaque'; coleccion: string }[] = [
  { tabla: 'productos', coleccion: 'productos' },
  { tabla: 'categorias', coleccion: 'categorias' },
  { tabla: 'ubicaciones', coleccion: 'ubicaciones' },
  { tabla: 'tiposEmpaque', coleccion: 'tiposEmpaque' },
];

export async function hayConexionReal(): Promise<boolean> {
  if (!firebaseConfigurado) return false;
  return navigator.onLine;
}

// BAJAR: trae el catalogo maestro mas reciente (incluida la configuracion,
// que es la que evita volver a crear datos de ejemplo por error).
export async function descargarCatalogo(): Promise<boolean> {
  if (!firebaseConfigurado || !firestore) return false;
  const conectado = await hayConexionReal();
  if (!conectado) return false;

  try {
    await asegurarAutenticacion();

    for (const { tabla, coleccion } of TABLAS_MAESTRAS) {
      const snap = await getDocs(collection(firestore, coleccion));
      if (snap.empty) continue;
      const registros = snap.docs.map((d) => d.data());
      // @ts-expect-error acceso dinamico a la tabla de Dexie
      await db[tabla].bulkPut(registros);
    }

    // La configuracion es un solo documento, no una coleccion de varios.
    const configSnap = await getDoc(doc(firestore, 'configuracion', 'app'));
    if (configSnap.exists()) {
      await db.configuracion.put(configSnap.data() as any);
    }

    return true;
  } catch (err) {
    console.warn('No se pudo descargar el catálogo desde Firebase:', err);
    return false;
  }
}

export async function sincronizarPendientes(
  onEstado?: (estado: 'sincronizando' | 'completado' | 'sin-cambios' | 'error') => void
) {
  const conectado = await hayConexionReal();
  if (!conectado) return;

  await asegurarAutenticacion();

  // Se reintentan tanto las PENDIENTES (nunca se intentaron) como las que
  // quedaron en ERROR (fallaron una vez, ej. por un corte de señal justo
  // en ese momento). Sin esto, una operación que falla una sola vez queda
  // atascada para siempre en ese dispositivo y nunca llega a los demás.
  // Se limita a 15 intentos para no quedar en un bucle infinito si el
  // problema es real (no solo de red).
  const pendientes = (await db.syncQueue.where('estado').anyOf('PENDIENTE', 'ERROR').toArray())
    .filter((op) => op.intentos < 15);
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

export async function sincronizarTodo(
  onEstado?: Parameters<typeof sincronizarPendientes>[0]
) {
  await sincronizarPendientes(onEstado);
  await descargarCatalogo();
}

export function iniciarListenerSync(onEstado?: Parameters<typeof sincronizarPendientes>[0]) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => sincronizarTodo(onEstado);
  window.addEventListener('online', handler);
  handler();
  const interval = setInterval(handler, 30000);
  return () => {
    window.removeEventListener('online', handler);
    clearInterval(interval);
  };
}
