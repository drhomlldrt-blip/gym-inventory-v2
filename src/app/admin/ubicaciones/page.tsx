'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Ubicacion } from '@/types';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminUbicacionesPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const ubicaciones = useLiveQuery(() => db.ubicaciones.toArray());
  const productos = useLiveQuery(() => db.productos.toArray());

  useEffect(() => {
    const id = sessionStorage.getItem('usuarioActivoId');
    if (!id) router.push('/');
  }, [router]);

  async function crear() {
    if (!nombre.trim()) return;
    const ubic: Ubicacion = {
      id: `ubic_${Date.now()}`,
      nombre: nombre.trim(),
      sucursalId: 'suc_1',
      activo: true,
    };
    await db.ubicaciones.add(ubic);
    await encolarOperacion({ tipo: 'UBICACION', entidadId: ubic.id, accion: 'CREAR', payload: ubic });
    setNombre('');
  }

  async function eliminar(u: Ubicacion) {
    const enUso = (productos ?? []).some((p) => p.ubicacionesHabilitadas.includes(u.id));
    if (enUso) {
      alert(
        `"${u.nombre}" está siendo usada por al menos un producto. Quítala de esos productos antes de eliminarla, o simplemente desactívala.`
      );
      return;
    }
    if (!confirm(`¿Eliminar la ubicación "${u.nombre}"?`)) return;
    await db.ubicaciones.delete(u.id);
    await encolarOperacion({ tipo: 'UBICACION', entidadId: u.id, accion: 'ELIMINAR', payload: {} });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Ubicaciones</h1>
        <SyncIndicator />
      </div>

      <div className="flex gap-2">
        <input
          placeholder="Nueva ubicación (ej. Almacén)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-card"
        />
        <button onClick={crear} className="px-4 py-3 rounded-xl bg-brand text-white font-semibold">
          Agregar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {(ubicaciones ?? []).map((u) => (
          <div key={u.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center">
            <span>{u.nombre}</span>
            <button onClick={() => eliminar(u)} className="text-red-500 text-sm font-medium">
              Eliminar
            </button>
          </div>
        ))}
        {(ubicaciones ?? []).length === 0 && (
          <p className="text-center text-ink/40 py-6">No hay ubicaciones todavía.</p>
        )}
      </div>
    </main>
  );
}
