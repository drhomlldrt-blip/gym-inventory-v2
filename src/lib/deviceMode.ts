// ==========================================================
// MODO DE DISPOSITIVO — separa "mis dispositivos" (computadora
// y celular del administrador) de los celulares de recepción.
// Es una preferencia LOCAL a cada navegador/dispositivo, no de
// la cuenta: se configura una sola vez la primera vez que se
// abre la app en ese aparato.
// ==========================================================

export type ModoDispositivo = 'ADMIN' | 'RECEPCION';

const CLAVE = 'modoDispositivo';

export function obtenerModoDispositivo(): ModoDispositivo | null {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(CLAVE);
  return v === 'ADMIN' || v === 'RECEPCION' ? v : null;
}

export function establecerModoDispositivo(modo: ModoDispositivo) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CLAVE, modo);
}

export function restablecerModoDispositivo() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CLAVE);
}
