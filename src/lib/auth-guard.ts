// Verifica que la sesion activa sea de Administrador.
// Se usa en TODAS las pantallas dentro de /admin, para que la cuenta
// de Recepcion jamas pueda entrar ahi, ni siquiera escribiendo la
// direccion directamente en el navegador.
export function verificarEsAdmin(router: { push: (ruta: string) => void }): boolean {
  const rol = sessionStorage.getItem('rolActivo');
  if (rol !== 'ADMINISTRADOR') {
    router.push(rol === 'RECEPCION' ? '/count' : '/');
    return false;
  }
  return true;
}

// Verifica que haya alguna sesion activa (Admin o Recepcion).
export function verificarSesionActiva(router: { push: (ruta: string) => void }): boolean {
  const rol = sessionStorage.getItem('rolActivo');
  if (!rol) {
    router.push('/');
    return false;
  }
  return true;
}
