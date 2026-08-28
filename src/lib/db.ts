import Dexie, { Table } from 'dexie';
import {
  Producto,
  Categoria,
  Ubicacion,
  TipoEmpaque,
  Conteo,
  OperacionSync,
  Configuracion,
} from '@/types';

// ==========================================================
// BASE DE DATOS LOCAL (IndexedDB) — fuente de verdad offline
// ==========================================================

export class InventarioDB extends Dexie {
  productos!: Table<Producto, string>;
  categorias!: Table<Categoria, string>;
  ubicaciones!: Table<Ubicacion, string>;
  tiposEmpaque!: Table<TipoEmpaque, string>;
  conteos!: Table<Conteo, string>;
  configuracion!: Table<Configuracion, string>;
  syncQueue!: Table<OperacionSync, string>;

  constructor() {
    super('gym_inventario_db_v2');
    this.version(1).stores({
      productos: 'id, categoriaId, estado, orden',
      categorias: 'id, orden',
      ubicaciones: 'id',
      tiposEmpaque: 'id, nombre',
      conteos: 'id, fecha, estadoSync, finalizado',
      configuracion: 'id',
      syncQueue: 'id, estado, tipo, fechaCreacion',
    });
  }
}

export const db = new InventarioDB();

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
  return db.syncQueue.where('estado').anyOf('PENDIENTE', 'ERROR').count();
}
