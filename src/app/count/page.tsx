'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { CantidadesPorUbicacion, Conteo, ItemConteo, calcularTotalItem, ordenEfectivo } from '@/types';
import { descargarCatalogo } from '@/lib/sync';
import ProductoConteoCard from '@/components/ProductoConteoCard';
import SyncIndicator from '@/components/SyncIndicator';

type EstadoBorrador = Record<
  string,
  { paquetes: number; cantidadesPorUbicacion: CantidadesPorUbicacion }
>;

export default function CountPage() {
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string | 'TODAS'>('TODAS');
  const [borrador, setBorrador] = useState<EstadoBorrador>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const id = sessionStorage.getItem('usuarioActivoId');
    if (!id) {
      router.push('/');
      return;
    }
    setUsuarioId(id);
    descargarCatalogo();
  }, [router]);

  const productos = useLiveQuery(async () => {
    const todos = await db.productos.where('estado').equals('ACTIVO').toArray();
    return todos;
  });
  const categorias = useLiveQuery(() => db.categorias.toArray());
  const usuario = useLiveQuery(() => (usuarioId ? db.usuarios.get(usuarioId) : undefined), [usuarioId]);
  const ubicaciones = useLiveQuery(async () => {
    const todas = await db.ubicaciones.toArray();
    return usuario ? todas.filter((u) => u.sucursalId === usuario.sucursalId && u.activo) : [];
  }, [usuario]);

  const productosOrdenados = useMemo(() => {
    if (!productos) return [];
    const sucId = usuario?.sucursalId ?? '';
    return [...productos].sort((a, b) => ordenEfectivo(a, sucId) - ordenEfectivo(b, sucId));
  }, [productos, usuario]);

  const productosFiltrados = useMemo(() => {
    return productosOrdenados.filter((p) => {
      const coincideCategoria = categoriaActiva === 'TODAS' || p.categoriaId === categoriaActiva;
      const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return coincideCategoria && coincideBusqueda;
    });
  }, [productosOrdenados, categoriaActiva, busqueda]);

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

  async function guardarConteo() {
    if (!usuario || !productos) return;
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

    const ahora = new Date().toISOString();
    const conteo: Conteo = {
      id: `INV-${Date.now()}`,
      fecha: ahora,
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      sucursalId: usuario.sucursalId,
      items,
      totalProductos: items.length,
      totalUnidades: items.reduce((acc, it) => acc + it.totalUnidades, 0),
      estadoSync: 'PENDIENTE',
      finalizado: true,
      fechaCreacion: ahora,
      fechaModificacion: ahora,
    };

    await db.conteos.add(conteo);
    await encolarOperacion({
      tipo: 'CONTEO',
      entidadId: conteo.id,
      accion: 'CREAR',
      payload: conteo,
    });

    setGuardando(false);
    setBorrador({});
    router.push(`/count/resumen/${conteo.id}`);
  }

  if (!usuario) return <div className="p-8 text-center text-slate-400">Cargando...</div>;

  return (
    <main className="max-w-md mx-auto pb-32 min-h-screen bg-surface">
      <header className="sticky top-0 bg-surface/95 backdrop-blur z-10 p-4 flex flex-col gap-3 border-b border-surface-border">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white">Inventario</h1>
            <p className="text-xs text-slate-400">{usuario.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/historial')}
              className="text-xs text-slate-400 underline"
            >
              Historial
            </button>
            <SyncIndicator />
          </div>
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
        {productosFiltrados.map((p) => (
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
        {productosFiltrados.length === 0 && (
          <p className="text-center text-slate-500 py-10">No se encontraron productos.</p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-surface-card border-t border-surface-border p-4">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex justify-between text-sm text-slate-400">
            <span>{productosContados} productos contados</span>
            <span className="font-semibold text-white">{totalUnidadesGeneral} unidades</span>
          </div>
          <button
            onClick={guardarConteo}
            disabled={guardando || productosContados === 0}
            className="py-4 rounded-2xl bg-brand text-white text-lg font-semibold disabled:opacity-40 active:scale-[0.98] transition"
          >
            {guardando ? 'Guardando...' : 'GUARDAR CONTEO'}
          </button>
        </div>
      </div>
    </main>
  );
}
