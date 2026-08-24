// ==========================================================
// MODELO DE DATOS — Inventario (offline-first)
// Version simplificada: un solo gimnasio, dos roles compartidos
// (Administrador / Recepcion), sin sucursales ni usuarios individuales.
// ==========================================================

export interface Configuracion {
  id: 'app';
  adminPin: string;
  recepcionPin: string;
  catalogoInicializado: boolean; // evita re-sembrar datos de ejemplo una vez que el sistema ya esta en uso real
}

export interface Ubicacion {
  id: string;
  nombre: string; // "Recepción", "Refrigeradora", "Depósito"...
  activo: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export type TipoPresentacion = string; // referencia al nombre de un TipoEmpaque, o 'UNIDAD' (sin empaque)

export interface TipoEmpaque {
  id: string;
  nombre: string; // "Paquete", "Caja", "Balde", lo que el admin quiera
  activo: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  categoriaId: string;
  imagenUrl?: string;
  unidadIndividual: string; // "botella", "barra", "unidad"
  tipoPresentacion: TipoPresentacion;
  unidadesPorPaquete: number; // 1 si es tipo UNIDAD (sin empaque)
  ubicacionesHabilitadas: string[]; // ids de Ubicacion donde este producto se cuenta
  estado: 'ACTIVO' | 'INACTIVO';
  orden: number; // orden de aparicion en el conteo; ajustable por admin o recepcion
  fechaCreacion: string; // ISO
  fechaModificacion: string; // ISO
}

// Cantidades sueltas por ubicación, ej: { "ubic_recepcion": 2, "ubic_refri": 3 }
export type CantidadesPorUbicacion = Record<string, number>;

export interface ItemConteo {
  productoId: string;
  // snapshot histórico: NUNCA recalcular con config nueva del producto
  unidadesPorPaqueteUsadas: number;
  paquetes: number;
  cantidadesPorUbicacion: CantidadesPorUbicacion;
  totalUnidades: number;
}

export type EstadoSync = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

export interface Conteo {
  id: string; // uuid local, ej "INV-000123"
  fecha: string; // ISO
  items: ItemConteo[];
  totalProductos: number;
  totalUnidades: number;
  estadoSync: EstadoSync;
  finalizado: boolean;
  fechaCreacion: string;
  fechaModificacion: string;
}

// Cola de sincronización: cada mutación local genera una operación pendiente
export interface OperacionSync {
  id: string;
  tipo: 'CONTEO' | 'PRODUCTO' | 'CATEGORIA' | 'UBICACION' | 'TIPO_EMPAQUE' | 'CONFIGURACION';
  entidadId: string;
  payload: unknown;
  accion: 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR';
  estado: EstadoSync;
  intentos: number;
  fechaCreacion: string;
  ultimoError?: string;
}

// ---- Utilidad de cálculo ----
export function calcularTotalItem(
  paquetes: number,
  unidadesPorPaquete: number,
  cantidadesPorUbicacion: CantidadesPorUbicacion
): number {
  const sueltas = Object.values(cantidadesPorUbicacion).reduce(
    (acc, v) => acc + (Number.isFinite(v) ? v : 0),
    0
  );
  return paquetes * unidadesPorPaquete + sueltas;
}
