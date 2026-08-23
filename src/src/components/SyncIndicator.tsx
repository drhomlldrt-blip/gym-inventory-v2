'use client';

import { useEffect, useState } from 'react';
import { contarPendientesSync } from '@/lib/db';
import { iniciarListenerSync } from '@/lib/sync';

// Indicador discreto de estado (requisito 24):
// 🟢 Sincronizado  🟠 Pendiente  🔴 Sin conexión
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

    const cancelar = iniciarListenerSync((estado) => {
      setSyncing(estado === 'sincronizando');
      refrescarPendientes();
    });

    refrescarPendientes();
    const interval = setInterval(refrescarPendientes, 5000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      cancelar();
      clearInterval(interval);
    };
  }, []);

  async function refrescarPendientes() {
    setPendientes(await contarPendientesSync());
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
    <div className="flex items-center gap-2 text-xs text-muted">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span>{texto}</span>
    </div>
  );
}
