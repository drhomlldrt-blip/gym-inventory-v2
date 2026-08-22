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
  const usuarios = useLiveQuery(() => db.usuarios.toArray());

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

  async function alternar(s: Sucursal) {
    const usuariosActivos = (usuarios ?? []).filter((u) => u.sucursalId === s.id && u.activo);
    if (s.activo && usuariosActivos.length > 0) {
      const ok = confirm(
        `"${s.nombre}" tiene ${usuariosActivos.length} usuario${usuariosActivos.length === 1 ? '' : 's'} activo${usuariosActivos.length === 1 ? '' : 's'}. Desactivar la sucursal no los desactiva a ellos, solo la ocultará al crear usuarios o ubicaciones nuevas. ¿Continuar?`
      );
      if (!ok) return;
    }
    const actualizado = { ...s, activo: !s.activo };
    await db.sucursales.put(actualizado);
    await encolarOperacion({ tipo: 'SUCURSAL', entidadId: s.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Sucursales</h1>
        <SyncIndicator />
      </div>

      <div className="flex gap-3 text-sm">
        <button onClick={() => router.push('/admin/usuarios')} className="text-accent-hover underline">
          ← Usuarios
        </button>
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Nueva sucursal (ej. Sucursal Sur)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-card"
        />
        <button onClick={crear} className="px-4 py-3 rounded-xl bg-brand text-white font-semibold">
          Agregar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {(sucursales ?? []).map((s) => {
          const totalUsuarios = (usuarios ?? []).filter((u) => u.sucursalId === s.id).length;
          return (
            <div key={s.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{s.nombre}</p>
                <p className="text-xs text-ink/40">
                  {totalUsuarios} usuario{totalUsuarios === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={() => alternar(s)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
                  s.activo ? 'bg-accent-soft text-accent-hover' : 'bg-surface text-ink/40'
                }`}
              >
                {s.activo ? 'Activa' : 'Inactiva'}
              </button>
            </div>
          );
        })}
        {(sucursales ?? []).length === 0 && (
          <p className="text-center text-ink/40 py-6">No hay sucursales todavía.</p>
        )}
      </div>
    </main>
  );
}
