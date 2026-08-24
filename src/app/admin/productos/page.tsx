'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Producto, TipoPresentacion, ordenEfectivo, TipoEmpaque } from '@/types';
import { descargarCatalogo } from '@/lib/sync';
import { verificarEsAdmin } from '@/lib/auth-guard';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminProductosPage() {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  // null = orden general (por defecto). Si se elige una sucursal, el
  // orden que se mueva con las flechas aplica SOLO a esa sucursal.
  const [sucursalOrdenando, setSucursalOrdenando] = useState<string | null>(null);

  const productos = useLiveQuery(async () => db.productos.toArray());
  const categorias = useLiveQuery(() => db.categorias.toArray());
  const ubicaciones = useLiveQuery(() => db.ubicaciones.toArray());
  const conteos = useLiveQuery(() => db.conteos.toArray());
  const sucursales = useLiveQuery(() => db.sucursales.toArray());
  const tiposEmpaque = useLiveQuery(async () => {
    const todos = await db.tiposEmpaque.toArray();
    return todos.filter((t) => t.activo);
  });

  useEffect(() => {
    verificarEsAdmin(router).then((esAdmin) => {
      if (esAdmin) descargarCatalogo();
    });
  }, [router]);

  async function alternarActivo(p: Producto) {
    const nuevoEstado = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const actualizado = { ...p, estado: nuevoEstado as Producto['estado'], fechaModificacion: new Date().toISOString() };
    await db.productos.put(actualizado);
    await encolarOperacion({ tipo: 'PRODUCTO', entidadId: p.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  async function eliminar(p: Producto) {
    const tieneHistorial = (conteos ?? []).some((c) => c.items.some((it) => it.productoId === p.id));
    if (tieneHistorial) {
      alert(
        `"${p.nombre}" ya tiene conteos guardados en el historial. Para no perder esos datos, se recomienda desactivarlo en vez de eliminarlo (usa el botón de estado).`
      );
      return;
    }
    if (!confirm(`¿Eliminar "${p.nombre}" definitivamente?`)) return;
    await db.productos.delete(p.id);
    await encolarOperacion({ tipo: 'PRODUCTO', entidadId: p.id, accion: 'ELIMINAR', payload: {} });
  }

  async function moverProducto(p: Producto, direccion: 'subir' | 'bajar') {
    if (!productos) return;
    const listaCategoria = productos
      .filter((x) => x.categoriaId === p.categoriaId)
      .sort((a, b) => ordenEfectivo(a, sucursalOrdenando) - ordenEfectivo(b, sucursalOrdenando));
    const idx = listaCategoria.findIndex((x) => x.id === p.id);
    const idxVecino = direccion === 'subir' ? idx - 1 : idx + 1;
    if (idxVecino < 0 || idxVecino >= listaCategoria.length) return;

    const vecino = listaCategoria[idxVecino];
    const ahora = new Date().toISOString();
    const ordenP = ordenEfectivo(p, sucursalOrdenando);
    const ordenVecino = ordenEfectivo(vecino, sucursalOrdenando);

    let pActualizado: Producto;
    let vecinoActualizado: Producto;

    if (sucursalOrdenando) {
      // Solo afecta el orden de esta sucursal, sin tocar el orden general
      // ni el de las demas sucursales.
      pActualizado = {
        ...p,
        ordenPorSucursal: { ...(p.ordenPorSucursal ?? {}), [sucursalOrdenando]: ordenVecino },
        fechaModificacion: ahora,
      };
      vecinoActualizado = {
        ...vecino,
        ordenPorSucursal: { ...(vecino.ordenPorSucursal ?? {}), [sucursalOrdenando]: ordenP },
        fechaModificacion: ahora,
      };
    } else {
      pActualizado = { ...p, orden: ordenVecino, fechaModificacion: ahora };
      vecinoActualizado = { ...vecino, orden: ordenP, fechaModificacion: ahora };
    }

    await db.productos.put(pActualizado);
    await db.productos.put(vecinoActualizado);
    await encolarOperacion({ tipo: 'PRODUCTO', entidadId: p.id, accion: 'ACTUALIZAR', payload: pActualizado });
    await encolarOperacion({ tipo: 'PRODUCTO', entidadId: vecino.id, accion: 'ACTUALIZAR', payload: vecinoActualizado });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Productos</h1>
        <SyncIndicator />
      </div>

      <div className="flex gap-3 text-sm flex-wrap">
        <button onClick={() => router.push('/historial')} className="text-muted underline">
          Historial de conteos →
        </button>
        <button onClick={() => router.push('/admin/ubicaciones')} className="text-muted underline">
          Gestionar ubicaciones →
        </button>
        <button onClick={() => router.push('/admin/usuarios')} className="text-muted underline">
          Gestionar usuarios →
        </button>
        <button onClick={() => router.push('/admin/tipos-empaque')} className="text-muted underline">
          Gestionar tipos de empaque →
        </button>
      </div>

      <button
        onClick={() => setCreando(true)}
        className="py-3 rounded-2xl bg-brand text-white font-semibold"
      >
        + NUEVO PRODUCTO
      </button>

      {(sucursales ?? []).length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">Ordenando para:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSucursalOrdenando(null)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${sucursalOrdenando === null ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
            >
              General (por defecto)
            </button>
            {(sucursales ?? []).map((s) => (
              <button
                key={s.id}
                onClick={() => setSucursalOrdenando(s.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${sucursalOrdenando === s.id ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
              >
                {s.nombre}
              </button>
            ))}
          </div>
          {sucursalOrdenando && (
            <p className="text-xs text-muted">
              Las flechas ahora mueven el orden solo para esta sucursal. Las demás no se ven afectadas.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-5">
        {(categorias ?? []).map((cat) => {
          const productosCategoria = (productos ?? [])
            .filter((p) => p.categoriaId === cat.id)
            .sort((a, b) => ordenEfectivo(a, sucursalOrdenando) - ordenEfectivo(b, sucursalOrdenando));
          if (productosCategoria.length === 0) return null;
          return (
            <div key={cat.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-slate-300">{cat.nombre}</h2>
              {productosCategoria.map((p, idx) => (
                <div key={p.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex items-center gap-2">
                  <div className="flex flex-col">
                    <button
                      onClick={() => moverProducto(p, 'subir')}
                      disabled={idx === 0}
                      className="text-muted disabled:opacity-20 leading-none px-1"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moverProducto(p, 'bajar')}
                      disabled={idx === productosCategoria.length - 1}
                      className="text-muted disabled:opacity-20 leading-none px-1"
                    >
                      ▼
                    </button>
                  </div>
                  <button className="text-left flex-1" onClick={() => setEditando(p)}>
                    <p className="font-medium text-paper">{p.nombre}</p>
                    <p className="text-xs text-muted">
                      {p.tipoPresentacion === 'UNIDAD' ? 'Solo por unidad' : `${p.unidadesPorPaquete} u/${p.tipoPresentacion.toLowerCase()}`}
                    </p>
                  </button>
                  <button
                    onClick={() => alternarActivo(p)}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${p.estado === 'ACTIVO' ? 'bg-brand/15 text-brand' : 'bg-surface-cardHeader text-muted'}`}
                  >
                    {p.estado}
                  </button>
                  <button onClick={() => eliminar(p)} className="text-brand text-lg leading-none">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {creando && (
        <FormularioProducto
          categorias={categorias ?? []}
          tiposEmpaque={tiposEmpaque ?? []}
          onCerrar={() => setCreando(false)}
        />
      )}

      {editando && (
        <FormularioProducto
          productoExistente={editando}
          categorias={categorias ?? []}
          tiposEmpaque={tiposEmpaque ?? []}
          onCerrar={() => setEditando(null)}
        />
      )}
    </main>
  );
}

function FormularioProducto({
  productoExistente,
  categorias,
  tiposEmpaque,
  onCerrar,
}: {
  productoExistente?: Producto;
  categorias: { id: string; nombre: string }[];
  tiposEmpaque: TipoEmpaque[];
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(productoExistente?.nombre ?? '');
  const [categoriaId, setCategoriaId] = useState(productoExistente?.categoriaId ?? categorias[0]?.id ?? '');
  const [presentacion, setPresentacion] = useState<TipoPresentacion>(
    productoExistente?.tipoPresentacion ?? tiposEmpaque[0]?.nombre ?? 'Paquete'
  );
  const [unidadesPorPaquete, setUnidadesPorPaquete] = useState(productoExistente?.unidadesPorPaquete ?? 1);

  async function guardar() {
    if (!nombre.trim()) return;
    const ahora = new Date().toISOString();

    if (productoExistente) {
      const actualizado: Producto = {
        ...productoExistente,
        nombre: nombre.trim(),
        categoriaId,
        tipoPresentacion: presentacion,
        unidadesPorPaquete: presentacion === 'UNIDAD' ? 1 : unidadesPorPaquete,
        fechaModificacion: ahora,
      };
      await db.productos.put(actualizado);
      await encolarOperacion({ tipo: 'PRODUCTO', entidadId: actualizado.id, accion: 'ACTUALIZAR', payload: actualizado });
    } else {
      const producto: Producto = {
        id: `prod_${Date.now()}`,
        nombre: nombre.trim(),
        categoriaId,
        unidadIndividual: 'unidad',
        tipoPresentacion: presentacion,
        unidadesPorPaquete: presentacion === 'UNIDAD' ? 1 : unidadesPorPaquete,
        estado: 'ACTIVO',
        orden: 999,
        sucursalId: 'suc_1',
        fechaCreacion: ahora,
        fechaModificacion: ahora,
      };
      await db.productos.add(producto);
      await encolarOperacion({ tipo: 'PRODUCTO', entidadId: producto.id, accion: 'CREAR', payload: producto });
    }
    onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-20">
      <div className="bg-surface-card rounded-t-3xl w-full max-w-md mx-auto p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto border-t border-surface-border">
        <h2 className="text-lg font-bold text-paper">{productoExistente ? 'Editar producto' : 'Nuevo producto'}</h2>
        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper placeholder:text-muted"
        />
        <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper">
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select value={presentacion} onChange={(e) => setPresentacion(e.target.value as TipoPresentacion)} className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper">
          {tiposEmpaque.map((t) => (
            <option key={t.id} value={t.nombre}>{t.nombre}</option>
          ))}
          <option value="UNIDAD">Solo por unidad (sin paquete)</option>
        </select>
        {tiposEmpaque.length === 0 && (
          <p className="text-xs text-muted -mt-2">
            No hay tipos de empaque creados todavía.{' '}
            <a href="/admin/tipos-empaque" className="underline text-brand">Crear uno aquí</a>.
          </p>
        )}
        {presentacion !== 'UNIDAD' && (
          <input
            type="number"
            placeholder="Unidades por paquete"
            value={unidadesPorPaquete}
            onChange={(e) => setUnidadesPorPaquete(parseInt(e.target.value || '1', 10))}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper"
          />
        )}
        <p className="text-xs text-muted">
          Las ubicaciones se muestran automáticamente según las que existan en cada sucursal
          (Admin → Ubicaciones). No hace falta elegirlas aquí.
        </p>
        <div className="flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-3 rounded-xl border border-surface-border text-paper font-semibold">Cancelar</button>
          <button onClick={guardar} className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold">GUARDAR</button>
        </div>
      </div>
    </div>
  );
}
