import { db } from './db';
import { Producto, Categoria, Ubicacion, Sucursal, Usuario } from '@/types';

// Carga datos de ejemplo la primera vez que se abre la app (todo local).
export async function sembrarDatosSiVacio() {
  const hayProductos = await db.productos.count();
  if (hayProductos > 0) return;

  const sucursal: Sucursal = { id: 'suc_1', nombre: 'Sucursal Principal', activo: true };
  await db.sucursales.add(sucursal);

  const ubicaciones: Ubicacion[] = [
    { id: 'ubic_mostrador', nombre: 'Mostrador', sucursalId: 'suc_1', activo: true },
    { id: 'ubic_refri', nombre: 'Refrigeradora', sucursalId: 'suc_1', activo: true },
  ];
  await db.ubicaciones.bulkAdd(ubicaciones);

  const categorias: Categoria[] = [
    { id: 'cat_bebidas', nombre: 'Bebidas', orden: 1, activo: true },
    { id: 'cat_snacks', nombre: 'Snacks', orden: 2, activo: true },
    { id: 'cat_otros', nombre: 'Otros', orden: 3, activo: true },
  ];
  await db.categorias.bulkAdd(categorias);

  const ahora = new Date().toISOString();
  const todasLasUbicaciones = ['ubic_mostrador', 'ubic_refri'];

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
      sucursalId: 'suc_1',
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

  const usuarios: Usuario[] = [
    { id: 'user_admin', nombre: 'Administrador', usuario: 'admin', pin: '0000', rol: 'ADMINISTRADOR', sucursalId: 'suc_1', activo: true },
    { id: 'user_maria', nombre: 'Maria', usuario: 'maria', pin: '1234', rol: 'RECEPCIONISTA', sucursalId: 'suc_1', activo: true },
  ];
  await db.usuarios.bulkAdd(usuarios);
}
