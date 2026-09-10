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

  // Se listan TODOS los items del conteo, en el MISMO orden libre que el
  // administrador definio en Admin > Productos (sin volver a separarlos
  // por categoria, que es justo lo que rompia ese orden).
  const itemsOrdenados = conteo.items
    .map((it) => ({
      it,
      producto: productos.find((p) => p.id === it.productoId),
    }))
    .sort((a, b) => (a.producto?.orden ?? 999999) - (b.producto?.orden ?? 999999));

  function nombreCategoria(categoriaId?: string) {
    if (!categoriaId || !categorias) return '';
    return categorias.find((c) => c.id === categoriaId)?.nombre ?? '';
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

      <div className="flex flex-col gap-2">
        {itemsOrdenados.map(({ it, producto }) => (
          <div key={it.productoId} className="flex justify-between items-center bg-surface-card rounded-xl px-4 py-3 border border-surface-border">
            <div>
              <p className="text-paper">{producto?.nombre ?? '(producto eliminado)'}</p>
              {producto && (
                <p className="text-[11px] text-muted">{nombreCategoria(producto.categoriaId)}</p>
              )}
            </div>
            <span className="font-semibold text-brand">{it.totalUnidades} unidades</span>
          </div>
        ))}
      </div>

      {itemsOrdenados.length === 0 && (
        <p className="text-center text-muted py-6">Este conteo no tiene productos registrados.</p>
      )}

      <div className="flex justify-between items-center text-sm text-muted border-t border-surface-border pt-3">
        <span>{conteo.totalProductos} productos · {conteo.totalUnidades} unidades en total</span>
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
