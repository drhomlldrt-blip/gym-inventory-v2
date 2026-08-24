'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Ubicacion } from '@/types';
import { verificarEsAdmin } from '@/lib/auth-guard';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminUbicacionesPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [sucursalSel, setSucursalSel] = useState<string | null>(null);
  const ubicaciones = useLiveQuery(() => db.ubicaciones.toArray());
  const sucursales = useLiveQuery(() => db.sucursales.toArray());

  useEffect(() => {
    verificarEsAdmin(router);
  }, [router]);

  // Selecciona la primera sucursal automaticamente cuando cargan.
  useEffect(() => {
    if (sucursales && sucursales.length > 0 && !sucursalSel) {
      setSucursalSel(sucursales[0].id);
    }
  }, [sucursales, sucursalSel]);

  async function crear() {
    if (!nombre.trim() || !sucursalSel) return;
    const ubic: Ubicacion = {
      id: `ubic_${Date.now()}`,
      nombre: nombre.trim(),
      sucursalId: sucursalSel,
      activo: true,
    };
    await db.ubicaciones.add(ubic);
    await encolarOperacion({ tipo: 'UBICACION', entidadId: ubic.id, accion: 'CREAR', payload: ubic });
    setNombre('');
  }

  async function eliminar(u: Ubicacion) {
    if (!confirm(`¿Eliminar la ubicación "${u.nombre}"?`)) return;
    await db.ubicaciones.delete(u.id);
    await encolarOperacion({ tipo: 'UBICACION', entidadId: u.id, accion: 'ELIMINAR', payload: {} });
  }

  const ubicacionesDeSucursal = (ubicaciones ?? []).filter((u) => u.sucursalId === sucursalSel);

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Ubicaciones</h1>
        <SyncIndicator />
      </div>

      <p className="text-sm text-muted">
        Cada sucursal tiene sus propias ubicaciones. Si una sucursal no tiene
        "Refrigeradora", simplemente no la crees ahí — no aparecerá al contar.
      </p>

      {(sucursales ?? []).length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(sucursales ?? []).map((s) => (
            <button
              key={s.id}
              onClick={() => setSucursalSel(s.id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${sucursalSel === s.id ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}

      {(sucursales ?? []).length === 0 && (
        <p className="text-center text-muted py-6">
          Primero crea una sucursal en "Admin → Sucursales".
        </p>
      )}

      {sucursalSel && (
        <>
          <div className="flex gap-2">
            <input
              placeholder="Nueva ubicación (ej. Refrigeradora)"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-card text-paper placeholder:text-muted"
            />
            <button onClick={crear} className="px-4 py-3 rounded-xl bg-brand text-white font-semibold">
              Agregar
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {ubicacionesDeSucursal.map((u) => (
              <div key={u.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center">
                <span className="text-paper">{u.nombre}</span>
                <button onClick={() => eliminar(u)} className="text-brand text-sm font-medium">
                  Eliminar
                </button>
              </div>
            ))}
            {ubicacionesDeSucursal.length === 0 && (
              <p className="text-center text-muted py-6">Esta sucursal no tiene ubicaciones todavía.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
