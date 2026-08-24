import { db } from './db';
import { Categoria, Ubicacion, TipoEmpaque, Configuracion } from '@/types';

// ==========================================================
// SIEMBRA INICIAL — solo la PRIMERA vez que el sistema se usa.
// ==========================================================
// Antes, esta funcion revisaba si la tabla local de productos estaba
// vacia para decidir si volver a crear datos de ejemplo. Eso causaba
// un bug real: si el administrador borraba productos y luego se
// limpiaba el cache del navegador, la tabla local volvia a estar
// vacia y la app pensaba "es la primera vez" y volvia a crear los
// productos de ejemplo, sin importar que ya se hubieran borrado.
//
// Ahora usamos un marcador explicito y permanente en la nube
// (Configuracion.catalogoInicializado). Una vez que se crea, la
// siembra NUNCA vuelve a ejecutarse en ningun dispositivo, sin
// importar que tan vacias esten las tablas locales.
export async function sembrarDatosSiEsPrimeraVez() {
  const config = await db.configuracion.get('app');
  if (config?.catalogoInicializado) {
    return; // el sistema ya fue inicializado antes (en este u otro dispositivo): no tocar nada
  }

  const ubicaciones: Ubicacion[] = [
    { id: 'ubic_mostrador', nombre: 'Mostrador', activo: true },
    { id: 'ubic_refri', nombre: 'Refrigeradora', activo: true },
  ];
  await db.ubicaciones.bulkAdd(ubicaciones);

  const categorias: Categoria[] = [
    { id: 'cat_bebidas', nombre: 'Bebidas', orden: 1, activo: true },
    { id: 'cat_snacks', nombre: 'Snacks', orden: 2, activo: true },
    { id: 'cat_otros', nombre: 'Otros', orden: 3, activo: true },
  ];
  await db.categorias.bulkAdd(categorias);

  const tiposEmpaque: TipoEmpaque[] = [
    { id: 'temp_paquete', nombre: 'Paquete', activo: true },
    { id: 'temp_caja', nombre: 'Caja', activo: true },
  ];
  await db.tiposEmpaque.bulkAdd(tiposEmpaque);

  // No se crean productos de ejemplo: el administrador arma su propio
  // catalogo desde cero, para evitar cualquier confusion con datos falsos.

  const nuevaConfig: Configuracion = {
    id: 'app',
    adminPin: '284915', // codigo dificil por defecto; cambialo en Admin > Configuracion
    recepcionPin: '0000',
    catalogoInicializado: true,
  };
  await db.configuracion.put(nuevaConfig);

  return nuevaConfig;
}
