'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import SyncIndicator from '@/components/SyncIndicator';

type Filtro = 'HOY' | 'AYER' | '3DIAS';

function inicioDia(fecha: Date) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HistorialPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>('3DIAS');

  useEffect(() => {
    const id = sessionStorage.getItem('usuarioActivoId');
    if (!id) router.push('/');
  }, [router]);

  const conteos = useLiveQuery(async () => {
    const todos = await db.conteos.toArray();
    return todos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  });

  const conteosFiltrados = useMemo(() => {
    if (!conteos) return [];
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
      desde.setDate(desde.getDate() - 2); // hoy + 2 días atrás = últimos 3 días
    }

    return conteos.filter((c) => new Date(c.fecha) >= desde);
  }, [conteos, filtro]);

  const iconoSync: Record<string, string> = {
    SINCRONIZADO: '🟢',
    PENDIENTE: '🟠',
    ERROR: '🔴',
  };

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Historial</h1>
        <SyncIndicator />
      </div>

      <div className="flex gap-2">
        {(['HOY', 'AYER', '3DIAS'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-2 rounded-full text-sm ${filtro === f ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-ink'}`}
          >
            {f === 'HOY' ? 'Hoy' : f === 'AYER' ? 'Ayer' : 'Últimos 3 días'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {conteosFiltrados.length === 0 && (
          <p className="text-center text-ink/40 py-10">No hay conteos en este rango.</p>
        )}
        {conteosFiltrados.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/count/resumen/${c.id}`)}
            className="text-left bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">
                {new Date(c.fecha).toLocaleDateString('es-BO')}{' '}
                <span className="text-ink/40 font-normal">
                  {new Date(c.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
              <p className="text-xs text-ink/40">
                {c.usuarioNombre} · {c.totalProductos} productos
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold">{c.totalUnidades} u.</p>
              <p className="text-xs">{iconoSync[c.estadoSync]}</p>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
