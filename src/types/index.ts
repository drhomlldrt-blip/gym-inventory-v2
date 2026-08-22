// ==========================================================
// MODELO DE DATOS — Inventario de Gimnasio (offline-first)
// ==========================================================

export type Rol = 'ADMINISTRADOR' | 'RECEPCIONISTA';

export interface Usuario {
  id: string;
  nombre: string;
  usuario: string;
  pin: string; // hash simple en cliente; en servidor se recomienda hash real
  rol: Rol;
  sucursalId: string;
  activo: boolean;
}

export interface Sucursal {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Ubicacion {
  id: string;
  nombre: string; // "Recepción", "Refrigeradora", "Almacén"...
  sucursalId: string;
  activo: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export type TipoPresentacion =
  | 'PAQUETE'
  | 'CAJA'
  | 'BOLSA'
  | 'FARDO'
  | 'UNIDAD' // producto vendido solo por unidad, sin empaque
  | 'PERSONALIZADO';

export interface Producto {
  id: string;
  nombre: string;
  categoriaId: string;
  imagenUrl?: string;
  unidadIndividual: string; // "botella", "barra", "unidad"
  tipoPresentacion: TipoPresentacion;
  nombrePresentacionPersonalizada?: string;
  unidadesPorPaquete: number; // 1 si es tipo UNIDAD (sin empaque)
  ubicacionesHabilitadas: string[]; // ids de Ubicacion
  estado: 'ACTIVO' | 'INACTIVO';
  orden: number;
  sucursalId: string;
  fechaCreacion: string; // ISO
  fechaModificacion: string; // ISO
}

// Cantidades sueltas por ubicación, ej: { "ubic_recepcion": 2, "ubic_refri": 3 }
export type CantidadesPorUbicacion = Record<string, number>;

export interface ItemConteo {
  productoId: string;
  // snapshot histórico: NUNCA recalcular con config nueva del producto (requisito 31)
  unidadesPorPaqueteUsadas: number;
  paquetes: number;
  cantidadesPorUbicacion: CantidadesPorUbicacion;
  totalUnidades: number; // (paquetes * unidadesPorPaqueteUsadas) + suma ubicaciones
}

export type EstadoSync = 'PENDIENTE' | 'SINCRONIZADO' | 'ERROR';

export interface Conteo {
  id: string; // uuid local, ej "INV-000123"
  fecha: string; // ISO
  usuarioId: string;
  usuarioNombre: string;
  sucursalId: string;
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
  tipo: 'CONTEO' | 'PRODUCTO' | 'CATEGORIA' | 'UBICACION' | 'USUARIO' | 'SUCURSAL';
  entidadId: string;
  payload: unknown;
  accion: 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR';
  estado: EstadoSync;
  intentos: number;
  fechaCreacion: string;
  ultimoError?: string;
}

// ---- Utilidad de cálculo (requisito 13) ----
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
