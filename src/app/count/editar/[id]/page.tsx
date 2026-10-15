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
  const clave = `borradorEdicion_${params.id}`;
  const [borrador, setBorrador] = useState<EstadoBorrador>({});
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | 'TODAS'>('TODAS');

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
      // Si la pantalla se apago y la pagina se recargo, se recupera lo que
      // se estaba editando en vez de volver a lo ultimo guardado.
      let respaldo: EstadoBorrador | null = null;
      try {
        const guardado = sessionStorage.getItem(clave);
        if (guardado) respaldo = JSON.parse(guardado);
      } catch {}
      setBorrador(respaldo ?? inicial);
      setCargado(true);
    }
  }, [conteo, cargado, clave]);

  // Respalda cada cambio mientras se edita (solo despues de la precarga).
  useEffect(() => {
    if (!cargado) return;
    try {
      sessionStorage.setItem(clave, JSON.stringify(borrador));
    } catch {}
  }, [borrador, cargado, clave]);

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

  // Se muestran TODOS los productos activos (no solo los que ya estaban en
  // este conteo), para poder continuar contando lo que faltó la vez pasada
  // sin perder lo que ya se había guardado.
  const productosParaMostrar = useMemo(() => {
    if (!productos) return [];
    return productos
      .filter((p) => p.estado === 'ACTIVO')
      .filter((p) => {
        const coincideCategoria = categoriaActiva === 'TODAS' || p.categoriaId === categoriaActiva;
        const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
        return coincideCategoria && coincideBusqueda;
      })
      .sort((a, b) => a.orden - b.orden);
  }, [productos, categoriaActiva, busqueda]);

  const totalUnidadesGeneral = useMemo(() => {
    if (!productos) return 0;
    return productos.reduce((acc, p) => {
      const d = borrador[p.id];
      if (!d) return acc;
      return acc + calcularTotalItem(d.paquetes, p.unidadesPorPaquete, d.cantidadesPorUbicacion);
    }, 0);
  }, [borrador, productos]);

  const productosContados = Object.keys(borrador).filter((id) => {
    const d = borrador[id];
    return d.paquetes > 0 || Object.values(d.cantidadesPorUbicacion).some((v) => v > 0);
  }).length;

  async function guardarCambios() {
    if (!conteo || !productos) return;
    setGuardando(true);

    const items: ItemConteo[] = productos
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
    try { sessionStorage.removeItem(clave); } catch {}
    router.push(`/count/resumen/${conteo.id}`);
  }

  if (!conteo || !cargado) {
    return <div className="p-8 text-center text-muted min-h-screen bg-surface">Cargando...</div>;
  }

  return (
    <main className="max-w-md mx-auto pb-32 min-h-screen bg-surface">
      <header className="sticky top-0 bg-surface/95 backdrop-blur z-10 p-4 flex flex-col gap-3 border-b border-surface-border">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Editando conteo</h1>
            <p className="text-xs text-muted">
              {new Date(conteo.fecha).toLocaleDateString('es-BO')} ·{' '}
              {new Date(conteo.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <SyncIndicator />
        </div>
        <input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-card text-white placeholder:text-slate-500"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoriaActiva('TODAS')}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${categoriaActiva === 'TODAS' ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
          >
            Todas
          </button>
          {(categorias ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaActiva(c.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${categoriaActiva === c.id ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 flex flex-col gap-4">
        {productosParaMostrar.map((p) => (
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
        {productosParaMostrar.length === 0 && (
          <p className="text-center text-slate-500 py-10">No se encontraron productos.</p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface-card/95 backdrop-blur border-t border-surface-border px-4 py-2.5">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <div className="flex flex-col text-[11px] text-slate-500 leading-tight shrink-0 mr-1">
            <span>{productosContados} contados</span>
            <span className="text-slate-300 font-medium">{totalUnidadesGeneral} u.</span>
          </div>
          <button
            onClick={() => {
              try { sessionStorage.removeItem(clave); } catch {}
              router.push(`/count/resumen/${conteo.id}`);
            }}
            className="px-4 py-2.5 rounded-xl border border-surface-border text-paper text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCambios}
            disabled={guardando}
            className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-40"
          >
            {guardando ? 'Guardando...' : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </div>
    </main>
  );
}
