import { db } from './db';

// Verifica que haya un usuario activo con rol ADMINISTRADOR.
// Si no lo es (o no hay sesion), redirige y devuelve false.
// Se usa en TODAS las pantallas dentro de /admin, para que una
// recepcionista jamas pueda entrar ahi, ni siquiera escribiendo
// la direccion directamente en el navegador.
export async function verificarEsAdmin(
  router: { push: (ruta: string) => void }
): Promise<boolean> {
  const id = sessionStorage.getItem('usuarioActivoId');
  if (!id) {
    router.push('/');
    return false;
  }
  const usuario = await db.usuarios.get(id);
  if (!usuario || usuario.rol !== 'ADMINISTRADOR') {
    // No es admin: lo mandamos a la pantalla de conteo, que si le corresponde.
    router.push('/count');
    return false;
  }
  return true;
}
