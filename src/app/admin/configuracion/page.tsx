'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { verificarEsAdmin } from '@/lib/auth-guard';
import SyncIndicator from '@/components/SyncIndicator';

export default function ConfiguracionPage() {
  const router = useRouter();
  const config = useLiveQuery(() => db.configuracion.get('app'));
  const [adminPin, setAdminPin] = useState('');
  const [recepcionPin, setRecepcionPin] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    verificarEsAdmin(router);
  }, [router]);

  useEffect(() => {
    if (config) {
      setAdminPin(config.adminPin);
      setRecepcionPin(config.recepcionPin);
    }
  }, [config]);

  async function guardar() {
    if (!adminPin.trim() || !recepcionPin.trim()) {
      alert('Ambos códigos son obligatorios.');
      return;
    }
    const actualizado = {
      id: 'app' as const,
      adminPin: adminPin.trim(),
      recepcionPin: recepcionPin.trim(),
      catalogoInicializado: true,
    };
    await db.configuracion.put(actualizado);
    await encolarOperacion({ tipo: 'CONFIGURACION', entidadId: 'app', accion: 'ACTUALIZAR', payload: actualizado });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Configuración</h1>
        <SyncIndicator />
      </div>

      <div className="bg-surface-card rounded-xl border border-surface-border p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted">Código de Administrador</label>
          <input
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value)}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper"
          />
          <p className="text-xs text-muted">
            Usa algo difícil de adivinar: mientras más largo y con letras/números mezclados, mejor.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted">Código de Recepción</label>
          <input
            value={recepcionPin}
            onChange={(e) => setRecepcionPin(e.target.value)}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper"
          />
          <p className="text-xs text-muted">
            Este lo comparten todas las recepcionistas. Cámbialo cuando alguien deje de trabajar contigo.
          </p>
        </div>

        <button onClick={guardar} className="py-3 rounded-xl bg-brand text-white font-semibold">
          {guardado ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>
    </main>
  );
}
