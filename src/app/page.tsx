'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { sembrarDatosSiVacio } from '@/lib/seed';
import SyncIndicator from '@/components/SyncIndicator';

export default function LoginPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const usuarios = useLiveQuery(async () => {
    const todos = await db.usuarios.toArray();
    return todos.filter((u) => u.activo);
  });

  useEffect(() => {
    sembrarDatosSiVacio().then(() => setListo(true));
  }, []);

  async function ingresar() {
    if (!usuarioSeleccionado) return;
    const usuario = await db.usuarios.get(usuarioSeleccionado);
    if (!usuario || usuario.pin !== pin) {
      setError('Contraseña incorrecta');
      return;
    }
    sessionStorage.setItem('usuarioActivoId', usuario.id);
    if (usuario.rol === 'ADMINISTRADOR') {
      router.push('/admin/productos');
    } else {
      router.push('/count');
    }
  }

  if (!listo) {
    return <div className="p-8 text-center text-ink/40">Cargando...</div>;
  }

  return (
    <main className="max-w-sm mx-auto p-6 pt-16 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <SyncIndicator />
      </div>

      {!usuarioSeleccionado ? (
        <div className="flex flex-col gap-3">
          <p className="text-ink/60">¿Quién está realizando el conteo?</p>
          {(usuarios ?? []).map((u) => (
            <button
              key={u.id}
              onClick={() => setUsuarioSeleccionado(u.id)}
              className="w-full text-left px-5 py-4 rounded-2xl bg-surface-card shadow-sm border border-surface-border text-lg font-medium active:scale-[0.98] transition"
            >
              {u.nombre}
              <span className="block text-xs text-ink/40 font-normal">
                {u.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Recepcionista'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-ink/60">Ingresa tu contraseña</p>
          <input
            autoFocus
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            className="text-center text-2xl tracking-widest py-4 rounded-2xl border border-surface-border bg-surface-card"
            maxLength={32}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={ingresar}
            className="py-4 rounded-2xl bg-brand text-white text-lg font-semibold active:scale-[0.98] transition"
          >
            Ingresar
          </button>
          <button
            onClick={() => {
              setUsuarioSeleccionado(null);
              setPin('');
              setError('');
            }}
            className="text-ink/40 text-sm"
          >
            ← Cambiar usuario
          </button>
        </div>
      )}
    </main>
  );
}
