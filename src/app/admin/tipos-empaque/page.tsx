'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { TipoEmpaque } from '@/types';
import { verificarEsAdmin } from '@/lib/auth-guard';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminTiposEmpaquePage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const tipos = useLiveQuery(() => db.tiposEmpaque.toArray());
  const productos = useLiveQuery(() => db.productos.toArray());

  useEffect(() => {
    verificarEsAdmin(router);
  }, [router]);

  async function crear() {
    if (!nombre.trim()) return;
    const tipo: TipoEmpaque = {
      id: `tipo_${Date.now()}`,
      nombre: nombre.trim(),
      activo: true,
    };
    await db.tiposEmpaque.add(tipo);
    await encolarOperacion({ tipo: 'TIPO_EMPAQUE', entidadId: tipo.id, accion: 'CREAR', payload: tipo });
    setNombre('');
  }

  async function eliminar(t: TipoEmpaque) {
    const enUso = (productos ?? []).some((p) => p.tipoPresentacion === t.nombre);
    if (enUso) {
      alert(
        `"${t.nombre}" está siendo usado por al menos un producto. Cámbialo en esos productos antes de eliminarlo.`
      );
      return;
    }
    if (!confirm(`¿Eliminar el tipo "${t.nombre}"?`)) return;
    await db.tiposEmpaque.delete(t.id);
    await encolarOperacion({ tipo: 'TIPO_EMPAQUE', entidadId: t.id, accion: 'ELIMINAR', payload: {} });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Tipos de empaque</h1>
        <SyncIndicator />
      </div>

      <p className="text-sm text-muted">
        Estos son los tipos que puedes elegir al crear un producto (Paquete, Caja, etc.).
        "Solo por unidad" siempre está disponible aparte, no hace falta crearlo.
      </p>

      <div className="flex gap-2">
        <input
          placeholder="Nuevo tipo (ej. Docena, Estuche)"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border border-surface-border bg-surface-card text-paper placeholder:text-muted"
        />
        <button onClick={crear} className="px-4 py-3 rounded-xl bg-brand text-white font-semibold">
          Agregar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {(tipos ?? []).map((t) => (
          <div key={t.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center">
            <span className="text-paper">{t.nombre}</span>
            <button onClick={() => eliminar(t)} className="text-brand text-sm font-medium">
              Eliminar
            </button>
          </div>
        ))}
        {(tipos ?? []).length === 0 && (
          <p className="text-center text-muted py-6">No hay tipos todavía.</p>
        )}
      </div>
    </main>
  );
}
