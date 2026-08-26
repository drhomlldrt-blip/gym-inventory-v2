'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { CantidadesPorUbicacion, ItemConteo, calcularTotalItem } from '@/types';
import { verificarSesionActiva } from '@/lib/auth-guard';
import ProductoConteoCard from '@/components/ProductoConteoCard';
import SyncIndicator from '@/components/SyncIndicator';

type EstadoBorrador = Record<
  string,
  { paquetes: number; cantidadesPorUbicacion: CantidadesPorUbicacion }
>;

export default function EditarConteoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [borrador, setBorrador] = useState<EstadoBorrador>({});
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    verificarSesionActiva(router);
  }, [router]);

  const conteo = useLiveQuery(() => db.conteos.get(params.id), [params.id]);
  const productos = useLiveQuery(() => db.productos.toArray());
  const ubicaciones = useLiveQuery(() => db.ubicaciones.toArray());
  const categorias = useLiveQuery(() => db.categorias.toArray());

  // Precarga el borrador con lo que ya estaba guardado, una sola vez.
  useEffect(() => {
    if (conteo && !cargado) {
      const inicial: EstadoBorrador = {};
      for (const item of conteo.items) {
        inicial[item.productoId] = {
          paquetes: item.paquetes,
          cantidadesPorUbicacion: item.cantidadesPorUbicacion,
        };
      }
      setBorrador(inicial);
      setCargado(true);
    }
  }, [conteo, cargado]);

  function actualizarPaquetes(productoId: string, valor: number) {
    setBorrador((prev) => ({
      ...prev,
      [productoId]: {
        paquetes: valor,
        cantidadesPorUbicacion: prev[productoId]?.cantidadesPorUbicacion ?? {},
      },
    }));
  }

  function actualizarUbicacion(productoId: string, ubicacionId: string, valor: number) {
    setBorrador((prev) => ({
      ...prev,
      [productoId]: {
        paquetes: prev[productoId]?.paquetes ?? 0,
        cantidadesPorUbicacion: {
          ...(prev[productoId]?.cantidadesPorUbicacion ?? {}),
          [ubicacionId]: valor,
        },
      },
    }));
  }

  function limpiarProducto(productoId: string) {
    setBorrador((prev) => {
      const copia = { ...prev };
      delete copia[productoId];
      return copia;
    });
  }

  // Productos que ya estaban en este conteo, en el orden actual del catalogo.
  const productosDelConteo = useMemo(() => {
    if (!productos || !conteo) return [];
    const idsDelConteo = new Set(conteo.items.map((it) => it.productoId));
    return productos
      .filter((p) => idsDelConteo.has(p.id))
      .sort((a, b) => a.orden - b.orden);
  }, [productos, conteo]);

  const totalUnidadesGeneral = useMemo(() => {
    if (!productos) return 0;
    return productosDelConteo.reduce((acc, p) => {
      const d = borrador[p.id];
      if (!d) return acc;
      return acc + calcularTotalItem(d.paquetes, p.unidadesPorPaquete, d.cantidadesPorUbicacion);
    }, 0);
  }, [borrador, productosDelConteo, productos]);

  async function guardarCambios() {
    if (!conteo || !productos) return;
    setGuardando(true);

    const items: ItemConteo[] = productosDelConteo
      .filter((p) => borrador[p.id])
      .map((p) => {
        const d = borrador[p.id];
        return {
          productoId: p.id,
          unidadesPorPaqueteUsadas: p.unidadesPorPaquete,
          paquetes: d.paquetes,
          cantidadesPorUbicacion: d.cantidadesPorUbicacion,
          totalUnidades: calcularTotalItem(d.paquetes, p.unidadesPorPaquete, d.cantidadesPorUbicacion),
        };
      })
      .filter((it) => it.totalUnidades > 0 || it.paquetes > 0);

    const actualizado = {
      ...conteo,
      items,
      totalProductos: items.length,
      totalUnidades: items.reduce((acc, it) => acc + it.totalUnidades, 0),
      estadoSync: 'PENDIENTE' as const,
      fechaModificacion: new Date().toISOString(),
    };

    await db.conteos.put(actualizado);
    await encolarOperacion({
      tipo: 'CONTEO',
      entidadId: conteo.id,
      accion: 'ACTUALIZAR',
      payload: actualizado,
    });

    setGuardando(false);
    router.push(`/count/resumen/${conteo.id}`);
  }

  if (!conteo || !cargado) {
    return <div className="p-8 text-center text-muted min-h-screen bg-surface">Cargando...</div>;
  }

  return (
    <main className="max-w-md mx-auto pb-32 min-h-screen bg-surface">
      <header className="sticky top-0 bg-surface/95 backdrop-blur z-10 p-4 flex flex-col gap-1 border-b border-surface-border">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Editando conteo</h1>
          <SyncIndicator />
        </div>
        <p className="text-xs text-muted">
          {new Date(conteo.fecha).toLocaleDateString('es-BO')} ·{' '}
          {new Date(conteo.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      <div className="p-4 flex flex-col gap-4">
        {productosDelConteo.map((p) => (
          <ProductoConteoCard
            key={p.id}
            producto={p}
            ubicaciones={ubicaciones ?? []}
            paquetes={borrador[p.id]?.paquetes ?? 0}
            cantidadesPorUbicacion={borrador[p.id]?.cantidadesPorUbicacion ?? {}}
            onCambiarPaquetes={(v) => actualizarPaquetes(p.id, v)}
            onCambiarUbicacion={(ubicId, v) => actualizarUbicacion(p.id, ubicId, v)}
            onLimpiar={() => limpiarProducto(p.id)}
          />
        ))}
        {productosDelConteo.length === 0 && (
          <p className="text-center text-slate-500 py-10">
            Los productos de este conteo ya no existen en el catálogo.
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-surface-border p-4">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Total actualizado</span>
            <span className="font-semibold text-white">{totalUnidadesGeneral} unidades</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/count/resumen/${conteo.id}`)}
              className="flex-1 py-4 rounded-2xl border border-surface-border text-paper font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={guardarCambios}
              disabled={guardando}
              className="flex-1 py-4 rounded-2xl bg-brand text-white font-semibold disabled:opacity-40"
            >
              {guardando ? 'Guardando...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
