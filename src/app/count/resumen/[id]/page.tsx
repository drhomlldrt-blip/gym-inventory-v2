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

  // Se listan TODOS los items del conteo directamente, sin depender de que
  // la categoria del producto calce perfecto. Así nunca desaparece un
  // producto de la vista solo porque su categoría cambió o se eliminó.
  const itemsConProducto = conteo.items.map((it) => ({
    it,
    producto: productos.find((p) => p.id === it.productoId),
  }));

  function nombreCategoria(categoriaId?: string) {
    if (!categoriaId || !categorias) return 'Otros';
    return categorias.find((c) => c.id === categoriaId)?.nombre ?? 'Otros';
  }

  const grupos = new Map<string, typeof itemsConProducto>();
  for (const item of itemsConProducto) {
    const nombreCat = nombreCategoria(item.producto?.categoriaId);
    if (!grupos.has(nombreCat)) grupos.set(nombreCat, []);
    grupos.get(nombreCat)!.push(item);
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-6 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Conteo final</h1>
        <SyncIndicator />
      </div>

      <p className="text-sm text-muted">
        Fecha: {new Date(conteo.fecha).toLocaleDateString('es-BO')}{' '}
        {new Date(conteo.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
      </p>

      {Array.from(grupos.entries()).map(([nombreCat, items]) => (
        <div key={nombreCat} className="flex flex-col gap-2">
          <h2 className="font-semibold text-slate-300">{nombreCat}</h2>
          {items.map(({ it, producto }) => (
            <div key={it.productoId} className="flex justify-between bg-surface-card rounded-xl px-4 py-3 border border-surface-border">
              <span className="text-paper">{producto?.nombre ?? '(producto eliminado)'}</span>
              <span className="font-semibold text-brand">{it.totalUnidades} unidades</span>
            </div>
          ))}
        </div>
      ))}

      {itemsConProducto.length === 0 && (
        <p className="text-center text-muted py-6">Este conteo no tiene productos registrados.</p>
      )}

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
        onClick={() => router.push(`/count/editar/${conteo.id}`)}
        className="py-4 rounded-2xl bg-surface-card border border-brand text-brand text-lg font-semibold"
      >
        ✎ Editar este conteo
      </button>

      <button
        onClick={() => router.push('/count')}
        className="py-4 rounded-2xl bg-surface-card border border-surface-border text-lg font-semibold text-paper"
      >
        Volver a contar
      </button>
    </main>
  );
}
