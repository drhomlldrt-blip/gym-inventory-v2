'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Sucursal } from '@/types';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminSucursalesPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const sucursales = useLiveQuery(() => db.sucursales.toArray());

  useEffect(() => {
    const id = sessionStorage.getItem('usuarioActivoId');
    if (!id) router.push('/');
  }, [router]);

  async function crear() {
    if (!nombre.trim()) return;
    const suc: Sucursal = {
      id: `suc_${Date.now()}`,
      nombre: nombre.trim(),
      activo: true,
    };
    await db.sucursales.add(suc);
    await encolarOperacion({ tipo: 'SUCURSAL', entidadId: suc.id, accion: 'CREAR', payload: suc });
    setNombre('');
  }

  async function alternarActivo(s: Sucursal) {
    const actualizado = { ...s, activo: !s.activo };
    await db.sucursales.put(actualizado);
    await encolarOperacion({ tipo: 'SUCURSAL', entidadId: s.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Sucursales</h1>
        <SyncIndicator />
      </div>

      <p className="text-sm text-muted">
        Cada sucursal tiene su propio inventario, separado del resto. (Esta primera versión
        registra las sucursales; la separación completa de datos por sucursal es un siguiente paso.)
      </p>

      <div className="flex gap-2">
        <input
          placeholder="Nueva sucursal (ej. Sucursal Norte)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-card text-paper placeholder:text-muted"
        />
        <button onClick={crear} className="px-4 py-3 rounded-xl bg-brand text-white font-semibold">
          Agregar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {(sucursales ?? []).map((s) => (
          <div key={s.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center">
            <span className="text-paper">{s.nombre}</span>
            <button
              onClick={() => alternarActivo(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${s.activo ? 'bg-brand/15 text-brand' : 'bg-surface-cardHeader text-muted'}`}
            >
              {s.activo ? 'ACTIVA' : 'INACTIVA'}
            </button>
          </div>
        ))}
        {(sucursales ?? []).length === 0 && (
          <p className="text-center text-muted py-6">No hay sucursales todavía.</p>
        )}
      </div>
    </main>
  );
}
