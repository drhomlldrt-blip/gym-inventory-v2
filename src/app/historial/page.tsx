'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { verificarSesionActiva } from '@/lib/auth-guard';
import SyncIndicator from '@/components/SyncIndicator';

type Filtro = 'HOY' | 'AYER' | '3DIAS' | 'TODOS';

function inicioDia(fecha: Date) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HistorialPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('3DIAS');

  useEffect(() => {
    verificarSesionActiva(router);
  }, [router]);

  const conteos = useLiveQuery(async () => {
    const todos = await db.conteos.toArray();
    return todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  });

  const conteosFiltrados = useMemo(() => {
    if (!conteos) return [];
    if (filtro === 'TODOS') return conteos;

    const ahora = new Date();
    const hoy = inicioDia(ahora);

    let desde: Date;
    if (filtro === 'HOY') {
      desde = hoy;
    } else if (filtro === 'AYER') {
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);
      desde = ayer;
      const finAyer = new Date(hoy);
      return conteos.filter((c) => {
        const f = new Date(c.fecha);
        return f >= desde && f < finAyer;
      });
    } else {
      desde = new Date(hoy);
      desde.setDate(desde.getDate() - 2);
    }

    return conteos.filter((c) => new Date(c.fecha) >= desde);
  }, [conteos, filtro]);

  const iconoSync: Record<string, string> = {
    SINCRONIZADO: '🟢',
    PENDIENTE: '🟠',
    ERROR: '🔴',
  };

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Historial</h1>
        <SyncIndicator />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['HOY', 'AYER', '3DIAS', 'TODOS'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${filtro === f ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
          >
            {f === 'HOY' ? 'Hoy' : f === 'AYER' ? 'Ayer' : f === '3DIAS' ? 'Últimos 3 días' : 'Todos'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {conteosFiltrados.length === 0 && (
          <p className="text-center text-muted py-10">No hay conteos en este rango.</p>
        )}
        {conteosFiltrados.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/count/resumen/${c.id}`)}
            className="text-left bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-medium text-paper">
                {new Date(c.fecha).toLocaleDateString('es-BO')}{' '}
                <span className="text-muted font-normal">
                  {new Date(c.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
              <p className="text-xs text-muted">{c.totalProductos} productos</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-brand">{c.totalUnidades} u.</p>
              <p className="text-xs">{iconoSync[c.estadoSync]}</p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
