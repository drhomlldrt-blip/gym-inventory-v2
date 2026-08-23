import { db } from './db';
import { Producto, Categoria, Ubicacion, Sucursal, Usuario, TipoPresentacionItem } from '@/types';

// Carga datos de ejemplo la primera vez que se abre la app (todo local).
// IMPORTANTE: cada bloque revisa SU PROPIA tabla antes de sembrar, en vez
// de depender de si ya hay productos. Antes, si el dispositivo ya tenía
// productos guardados (de una versión anterior) pero por algún motivo se
// quedó sin sucursales, la app nunca las volvía a crear y la pantalla de
// login se quedaba en "No hay sucursales cargadas todavía".
export async function sembrarDatosSiVacio() {
  const sucursalBaseId = await asegurarSucursalYUbicaciones();
  await asegurarTiposPresentacion();
  await asegurarCategoriasYProductos(sucursalBaseId);
  await asegurarUsuarios(sucursalBaseId);
}

async function asegurarSucursalYUbicaciones(): Promise<string> {
  const existentes = await db.sucursales.toArray();
  if (existentes.length > 0) return existentes[0].id;

  const sucursal: Sucursal = { id: 'suc_1', nombre: 'Sucursal Principal', activo: true };
  await db.sucursales.add(sucursal);

  const hayUbicaciones = await db.ubicaciones.count();
  if (hayUbicaciones === 0) {
    const ubicaciones: Ubicacion[] = [
      { id: 'ubic_mostrador', nombre: 'Mostrador', sucursalId: sucursal.id, activo: true },
      { id: 'ubic_refri', nombre: 'Refrigeradora', sucursalId: sucursal.id, activo: true },
    ];
    await db.ubicaciones.bulkAdd(ubicaciones);
  }

  return sucursal.id;
}

async function asegurarTiposPresentacion() {
  const hay = await db.tiposPresentacion.count();
  if (hay > 0) return;
  const tipos: TipoPresentacionItem[] = [
    { id: 'PAQUETE', nombre: 'Paquete', esUnidad: false, activo: true },
    { id: 'CAJA', nombre: 'Caja', esUnidad: false, activo: true },
    { id: 'BOLSA', nombre: 'Bolsa', esUnidad: false, activo: true },
    { id: 'FARDO', nombre: 'Fardo', esUnidad: false, activo: true },
    { id: 'UNIDAD', nombre: 'Unidad (sin empaque)', esUnidad: true, activo: true },
  ];
  await db.tiposPresentacion.bulkAdd(tipos);
}

async function asegurarCategoriasYProductos(sucursalBaseId: string) {
  const hayProductos = await db.productos.count();
  if (hayProductos > 0) return;

  const hayCategorias = await db.categorias.count();
  if (hayCategorias === 0) {
    const categorias: Categoria[] = [
      { id: 'cat_bebidas', nombre: 'Bebidas', orden: 1, activo: true },
      { id: 'cat_snacks', nombre: 'Snacks', orden: 2, activo: true },
      { id: 'cat_otros', nombre: 'Otros', orden: 3, activo: true },
    ];
    await db.categorias.bulkAdd(categorias);
  }

  const ahora = new Date().toISOString();
  const ubicacionesExistentes = await db.ubicaciones.toArray();
  const todasLasUbicaciones = ubicacionesExistentes.map((u) => u.id);

  // Catalogo tomado de tu hoja de conteo actual.
  // Quedan como "solo por unidad" (sin paquete) por defecto: entra a
  // Admin > Productos > Editar en cada uno y define cuantas unidades
  // trae su paquete/caja si corresponde.
  const nombresBebidas = [
    'Aquarius', 'Jugo Jumbo', 'Power 1 Litro', 'Power 600ml', 'Pre Workout',
    'V Santa 1 Litro', 'V. Santa 2 Litros', 'V Santa 600ml',
    'Vital 1 Litro', 'Vital 2 Litros', 'Vital 3 Litros', 'Vital 600ml',
    'Volt 350ml', 'Volt Lata 473ml', 'Yogurt', 'Zanna',
  ];
  const nombresSnacks = [
    'Alfajor Nene Rice', 'Barra Chocomani', 'Barra Foodness', 'Barra Crispy',
    'C4 Grande', 'C4 Mediana', 'Chicles', 'Dark Bar', 'Gogos', 'Irupana',
    'Protein Joy Biscuit',
  ];
  const nombresOtros = ['Clinex', 'Peines'];

  function crearProducto(nombre: string, categoriaId: string, orden: number): Producto {
    return {
      id: `prod_${nombre.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      nombre,
      categoriaId,
      unidadIndividual: 'unidad',
      tipoPresentacion: 'UNIDAD',
      unidadesPorPaquete: 1,
      ubicacionesHabilitadas: todasLasUbicaciones,
      estado: 'ACTIVO',
      orden,
      sucursalId: sucursalBaseId,
      fechaCreacion: ahora,
      fechaModificacion: ahora,
    };
  }

  const productos: Producto[] = [
    ...nombresBebidas.map((n, i) => crearProducto(n, 'cat_bebidas', i + 1)),
    ...nombresSnacks.map((n, i) => crearProducto(n, 'cat_snacks', 100 + i + 1)),
    ...nombresOtros.map((n, i) => crearProducto(n, 'cat_otros', 200 + i + 1)),
  ];
  await db.productos.bulkAdd(productos);
}

async function asegurarUsuarios(sucursalBaseId: string) {
  const hayUsuarios = await db.usuarios.count();
  if (hayUsuarios > 0) return;

  const usuarios: Usuario[] = [
    { id: 'user_admin', nombre: 'Administrador', usuario: 'admin', pin: '0000', rol: 'ADMINISTRADOR', sucursalId: sucursalBaseId, activo: true },
    { id: 'user_maria', nombre: 'Maria', usuario: 'maria', pin: '1234', rol: 'RECEPCIONISTA', sucursalId: sucursalBaseId, activo: true },
  ];
  await db.usuarios.bulkAdd(usuarios);
}
