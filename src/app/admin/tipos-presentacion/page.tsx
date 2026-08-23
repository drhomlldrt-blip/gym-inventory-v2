'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { TipoPresentacionItem } from '@/types';
import { useRequiereAdmin } from '@/lib/useRequiereAdmin';
import SyncIndicator from '@/components/SyncIndicator';

function generarId(nombre: string) {
  const slug = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `custom_${slug || 'tipo'}_${Date.now()}`;
}

export default function AdminTiposPresentacionPage() {
  useRequiereAdmin();
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const tipos = useLiveQuery(() => db.tiposPresentacion.toArray());
  const productos = useLiveQuery(() => db.productos.toArray());

  async function crear() {
    if (!nombre.trim()) return;
    const duplicado = (tipos ?? []).some(
      (t) => t.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
    );
    if (duplicado) {
      alert('Ya existe un tipo con ese nombre.');
      return;
    }
    const item: TipoPresentacionItem = {
      id: generarId(nombre),
      nombre: nombre.trim(),
      esUnidad: false,
      activo: true,
    };
    await db.tiposPresentacion.add(item);
    await encolarOperacion({ tipo: 'TIPO_PRESENTACION', entidadId: item.id, accion: 'CREAR', payload: item });
    setNombre('');
  }

  async function eliminar(t: TipoPresentacionItem) {
    if (t.esUnidad) {
      alert('Este tipo lo usa la app para productos "sin empaque" y no se puede eliminar.');
      return;
    }
    const enUso = (productos ?? []).some((p) => p.tipoPresentacion === t.id);
    if (enUso) {
      alert(`"${t.nombre}" está en uso por al menos un producto. Cambia esos productos a otro tipo antes de eliminarlo.`);
      return;
    }
    if (!confirm(`¿Eliminar el tipo "${t.nombre}"?`)) return;
    await db.tiposPresentacion.delete(t.id);
    await encolarOperacion({ tipo: 'TIPO_PRESENTACION', entidadId: t.id, accion: 'ELIMINAR', payload: {} });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Tipos de empaque</h1>
        <SyncIndicator />
      </div>

      <div className="flex gap-3 text-sm flex-wrap">
        <button onClick={() => router.push('/admin/productos')} className="text-muted underline">
          ← Productos
        </button>
      </div>

      <p className="text-sm text-muted">
        Son las opciones que aparecen al crear un producto (paquete, caja, bolsa, etc.).
        Crea las que te falten o elimina las que no uses.
      </p>

      <div className="flex gap-2">
        <input
          placeholder="Nuevo tipo (ej. Saco, Six-pack)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-card text-paper placeholder:text-muted"
        />
        <button onClick={crear} className="px-4 py-3 rounded-xl bg-brand text-white font-semibold">
          Agregar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {(tipos ?? []).map((t) => {
          const totalProductos = (productos ?? []).filter((p) => p.tipoPresentacion === t.id).length;
          return (
            <div key={t.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-paper">
                  {t.nombre}
                  {t.esUnidad && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted align-middle">
                      Reservado
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {totalProductos} producto{totalProductos === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => eliminar(t)}
                disabled={t.esUnidad}
                className="text-brand text-lg leading-none px-1 disabled:opacity-20"
              >
                ✕
              </button>
            </div>
          );
        })}
        {(tipos ?? []).length === 0 && (
          <p className="text-center text-muted py-6">No hay tipos todavía.</p>
        )}
      </div>
    </main>
  );
}
