import { db } from './db';
import { firestore, firebaseConfigurado } from './firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { asegurarAutenticacion } from './auth';

// ==========================================================
// SINCRONIZACION — offline-first, nunca bloqueante
// ==========================================================
// Estrategia: la app funciona 100% con IndexedDB. Cuando detecta
// conexion, hace dos cosas:
//  1) SUBIR: procesa la cola local (syncQueue) y envia lo pendiente.
//  2) BAJAR: descarga el catalogo maestro (productos, categorias,
//     ubicaciones, usuarios) desde Firestore, para que TODOS los
//     dispositivos vean lo que el administrador creo/edito en
//     cualquier otro celular o computadora.
// Nunca borra datos locales sin confirmacion del servidor.

const COLECCION_POR_TIPO: Record<string, string> = {
  CONTEO: 'conteos',
  PRODUCTO: 'productos',
  CATEGORIA: 'categorias',
  UBICACION: 'ubicaciones',
  USUARIO: 'usuarios',
  SUCURSAL: 'sucursales',
};

// Tablas "maestras" que se descargan de Firestore a cada dispositivo.
// (Los conteos NO se descargan de vuelta: cada dispositivo solo sube
// los suyos; el historial completo se consulta desde Firestore/consola
// si se necesita mas adelante).
const TABLAS_MAESTRAS: { tabla: 'productos' | 'categorias' | 'ubicaciones' | 'usuarios'; coleccion: string }[] = [
  { tabla: 'productos', coleccion: 'productos' },
  { tabla: 'categorias', coleccion: 'categorias' },
  { tabla: 'ubicaciones', coleccion: 'ubicaciones' },
  { tabla: 'usuarios', coleccion: 'usuarios' },
];

export async function hayConexionReal(): Promise<boolean> {
  if (!firebaseConfigurado) return false; // sin Firebase configurado, no hay nada que sincronizar
  // navigator.onLine es suficiente: la comprobacion anterior (un fetch de
  // prueba contra firestore.googleapis.com) daba falsos negativos en
  // algunas redes y bloqueaba la sincronizacion aunque si hubiera internet.
  return navigator.onLine;
}

// BAJAR: trae el catalogo maestro mas reciente y lo guarda localmente.
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
    return true;
  } catch (err) {
    console.warn('No se pudo descargar el catálogo desde Firebase:', err);
    return false;
  }
}

// SUBIR: procesa la cola de operaciones pendientes.
export async function sincronizarPendientes(
  onEstado?: (estado: 'sincronizando' | 'completado' | 'sin-cambios' | 'error') => void
) {
  const conectado = await hayConexionReal();
  if (!conectado) return;

  await asegurarAutenticacion();

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

// Sube lo pendiente y luego baja el catalogo mas reciente.
export async function sincronizarTodo(
  onEstado?: Parameters<typeof sincronizarPendientes>[0]
) {
  await sincronizarPendientes(onEstado);
  await descargarCatalogo();
}

// Escucha automaticamente cuando vuelve la conexion y sincroniza en ambos sentidos.
export function iniciarListenerSync(onEstado?: Parameters<typeof sincronizarPendientes>[0]) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => sincronizarTodo(onEstado);
  window.addEventListener('online', handler);
  handler(); // intento inicial al cargar
  const interval = setInterval(handler, 30000); // reintento cada 30s
  return () => {
    window.removeEventListener('online', handler);
    clearInterval(interval);
  };
}
