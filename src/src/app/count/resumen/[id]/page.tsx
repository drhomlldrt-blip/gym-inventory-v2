'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import SyncIndicator from '@/components/SyncIndicator';

export default function ResumenConteoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const conteo = useLiveQuery(() => db.conteos.get(params.id), [params.id]);
  const productos = useLiveQuery(() => db.productos.toArray());
  const categorias = useLiveQuery(() => db.categorias.toArray());

  if (!conteo || !productos || !categorias) {
    return <div className="p-8 text-center text-muted min-h-screen bg-surface">Cargando...</div>;
  }

  const porCategoria = categorias
    .map((cat) => {
      const items = conteo.items
        .map((it) => ({ it, producto: productos.find((p) => p.id === it.productoId) }))
        .filter(({ producto }) => producto?.categoriaId === cat.id);
      return { categoria: cat, items };
    })
    .filter((g) => g.items.length > 0);

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-6 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Conteo final</h1>
        <SyncIndicator />
      </div>

      <div className="text-sm text-muted">
        <p>Fecha: {new Date(conteo.fecha).toLocaleDateString('es-BO')}</p>
        <p>Realizado por: {conteo.usuarioNombre}</p>
      </div>

      {porCategoria.map(({ categoria, items }) => (
        <div key={categoria.id} className="flex flex-col gap-2">
          <h2 className="font-semibold text-slate-300">{categoria.nombre}</h2>
          {items.map(({ it, producto }) => (
            <div key={it.productoId} className="flex justify-between bg-surface-card rounded-xl px-4 py-3 border border-surface-border">
              <span className="text-paper">{producto?.nombre}</span>
              <span className="font-semibold text-brand">{it.totalUnidades} unidades</span>
            </div>
          ))}
        </div>
      ))}

      <div className="bg-brand text-white rounded-2xl p-5 flex flex-col gap-1">
        <div className="flex justify-between text-sm opacity-90">
          <span>Total de productos contados</span>
          <span>{conteo.totalProductos}</span>
        </div>
        <div className="flex justify-between text-xl font-bold">
          <span>Total de unidades</span>
          <span>{conteo.totalUnidades}</span>
        </div>
      </div>

      <button
        onClick={() => router.push('/count')}
        className="py-4 rounded-2xl bg-surface-card border border-surface-border text-lg font-semibold text-paper"
      >
        Volver a contar
      </button>
    </main>
  );
}
