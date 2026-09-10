'use client';

import { useEffect, useState } from 'react';
import { contarPendientesSync } from '@/lib/db';
import { iniciarListenerSync, sincronizarTodo } from '@/lib/sync';

// Indicador discreto de estado (requisito 24):
// 🟢 Sincronizado  🟠 Pendiente  🔴 Sin conexión
// Se puede tocar para forzar una sincronización inmediata (subir lo
// pendiente y bajar el catálogo más reciente), en vez de esperar el
// intervalo automático. También revisa cada vez que la app vuelve a
// primer plano (ej. se desbloquea el celular con la app ya abierta),
// que es justo el caso donde antes se quedaba con datos viejos.
export default function SyncIndicator() {
  const [online, setOnline] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sincronizarTodo((estado) => {
          setSyncing(estado === 'sincronizando');
          refrescarPendientes();
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    const cancelar = iniciarListenerSync((estado) => {
      setSyncing(estado === 'sincronizando');
      refrescarPendientes();
    });

    refrescarPendientes();
    const interval = setInterval(refrescarPendientes, 5000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      cancelar();
      clearInterval(interval);
    };
  }, []);

  async function refrescarPendientes() {
    setPendientes(await contarPendientesSync());
  }

  async function forzarSincronizacion() {
    setSyncing(true);
    await sincronizarTodo((estado) => {
      setSyncing(estado === 'sincronizando');
    });
    await refrescarPendientes();
  }

  let color = 'bg-green-500';
  let texto = 'Sincronizado';
  if (!online) {
    color = 'bg-red-500';
    texto = 'Sin conexión';
  } else if (syncing) {
    color = 'bg-orange-500 animate-pulse';
    texto = 'Sincronizando...';
  } else if (pendientes > 0) {
    color = 'bg-orange-500';
    texto = `${pendientes} pendiente${pendientes === 1 ? '' : 's'}`;
  }

  return (
    <button
      onClick={forzarSincronizacion}
      className="flex items-center gap-2 text-xs text-muted active:opacity-60"
      title="Tocar para sincronizar ahora"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span>{texto}</span>
    </button>
  );
}
