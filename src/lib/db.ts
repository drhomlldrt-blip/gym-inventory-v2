import Dexie, { Table } from 'dexie';
import {
  Producto,
  Categoria,
  Ubicacion,
  Sucursal,
  Usuario,
  Conteo,
  OperacionSync,
  TipoPresentacionItem,
} from '@/types';

// ==========================================================
// BASE DE DATOS LOCAL (IndexedDB) — fuente de verdad offline
// ==========================================================
// Todo se lee/escribe aquí primero. Firebase es solo respaldo/sync.

export class InventarioDB extends Dexie {
  productos!: Table<Producto, string>;
  categorias!: Table<Categoria, string>;
  ubicaciones!: Table<Ubicacion, string>;
  sucursales!: Table<Sucursal, string>;
  usuarios!: Table<Usuario, string>;
  conteos!: Table<Conteo, string>;
  syncQueue!: Table<OperacionSync, string>;
  tiposPresentacion!: Table<TipoPresentacionItem, string>;

  constructor() {
    super('gym_inventario_db');
    this.version(1).stores({
      productos: 'id, categoriaId, sucursalId, estado, orden',
      categorias: 'id, orden',
      ubicaciones: 'id, sucursalId',
      sucursales: 'id',
      usuarios: 'id, usuario, sucursalId',
      conteos: 'id, fecha, usuarioId, sucursalId, estadoSync, finalizado',
      syncQueue: 'id, estado, tipo, fechaCreacion',
    });
    // v2: agrega catálogo editable de tipos de presentación (paquete/caja/otros).
    this.version(2).stores({
      productos: 'id, categoriaId, sucursalId, estado, orden',
      categorias: 'id, orden',
      ubicaciones: 'id, sucursalId',
      sucursales: 'id',
      usuarios: 'id, usuario, sucursalId',
      conteos: 'id, fecha, usuarioId, sucursalId, estadoSync, finalizado',
      syncQueue: 'id, estado, tipo, fechaCreacion',
      tiposPresentacion: 'id',
    });
  }
}

export const db = new InventarioDB();

// Encola una operación pendiente de sincronizar (requisito 30)
export async function encolarOperacion(
  op: Omit<OperacionSync, 'id' | 'estado' | 'intentos' | 'fechaCreacion'>
) {
  const registro: OperacionSync = {
    ...op,
    id: crypto.randomUUID(),
    estado: 'PENDIENTE',
    intentos: 0,
    fechaCreacion: new Date().toISOString(),
  };
  await db.syncQueue.add(registro);
  return registro;
}

export async function contarPendientesSync(): Promise<number> {
  return db.syncQueue.where('estado').equals('PENDIENTE').count();
}
