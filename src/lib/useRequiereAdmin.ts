'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from './db';
import { obtenerModoDispositivo } from './deviceMode';

// Protege las páginas de /admin/*: exige sesión activa, rol ADMINISTRADOR,
// y que el dispositivo no esté configurado como "solo recepción". Antes,
// las páginas de admin solo revisaban que hubiera ALGUNA sesión iniciada
// (cualquier recepcionista podía entrar escribiendo la URL a mano).
export function useRequiereAdmin() {
  const router = useRouter();

  useEffect(() => {
    async function verificar() {
      const id = sessionStorage.getItem('usuarioActivoId');
      if (!id || obtenerModoDispositivo() === 'RECEPCION') {
        router.push('/');
        return;
      }
      const usuario = await db.usuarios.get(id);
      if (!usuario || usuario.rol !== 'ADMINISTRADOR' || !usuario.activo) {
        router.push('/');
      }
    }
    verificar();
  }, [router]);
}
