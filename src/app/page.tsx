'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { sembrarDatosSiEsPrimeraVez } from '@/lib/seed';
import { descargarCatalogo } from '@/lib/sync';
import SyncIndicator from '@/components/SyncIndicator';

type Rol = 'ADMINISTRADOR' | 'RECEPCION';

export default function LoginPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [rolElegido, setRolElegido] = useState<Rol | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function iniciar() {
      // Primero intenta traer la configuracion real desde la nube.
      // Solo si nunca existio en ningun lado, se crea una nueva
      // (esto es lo que evita que productos borrados vuelvan a aparecer).
      await descargarCatalogo();
      await sembrarDatosSiEsPrimeraVez();
      setListo(true);
    }
    iniciar();
  }, []);

  async function ingresar() {
    if (!rolElegido) return;
    const config = await db.configuracion.get('app');
    const pinCorrecto = rolElegido === 'ADMINISTRADOR' ? config?.adminPin : config?.recepcionPin;

    if (pin !== pinCorrecto) {
      setError('Código incorrecto');
      return;
    }

    sessionStorage.setItem('rolActivo', rolElegido);
    router.push(rolElegido === 'ADMINISTRADOR' ? '/admin/productos' : '/count');
  }

  if (!listo) {
    return <div className="p-8 text-center text-muted">Cargando...</div>;
  }

  return (
    <main className="max-w-sm mx-auto p-6 pt-16 flex flex-col gap-6 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-paper">Inventario</h1>
        <SyncIndicator />
      </div>

      {!rolElegido ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted">¿Quién eres?</p>
          <button
            onClick={() => {
              setRolElegido('ADMINISTRADOR');
              setPin('');
              setError('');
            }}
            className="w-full text-left px-5 py-4 rounded-2xl bg-surface-card border border-surface-border text-lg font-medium text-paper active:scale-[0.98] transition"
          >
            Administrador
          </button>
          <button
            onClick={() => {
              setRolElegido('RECEPCION');
              setPin('');
              setError('');
            }}
            className="w-full text-left px-5 py-4 rounded-2xl bg-surface-card border border-surface-border text-lg font-medium text-paper active:scale-[0.98] transition"
          >
            Recepción
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted">
            {rolElegido === 'ADMINISTRADOR' ? 'Código de administrador' : 'Código de recepción'}
          </p>
          <input
            autoFocus
            type="password"
            inputMode={rolElegido === 'RECEPCION' ? 'numeric' : 'text'}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && ingresar()}
            className="text-center text-3xl tracking-[0.3em] py-4 rounded-2xl border border-surface-border bg-surface-card text-paper"
            maxLength={20}
          />
          {error && <p className="text-brand text-sm text-center">{error}</p>}
          <button
            onClick={ingresar}
            className="py-4 rounded-2xl bg-brand text-white text-lg font-semibold active:scale-[0.98] transition"
          >
            Ingresar
          </button>
          <button
            onClick={() => {
              setRolElegido(null);
              setPin('');
              setError('');
            }}
            className="text-muted text-sm"
          >
            ← Volver
          </button>
        </div>
      )}
    </main>
  );
}
