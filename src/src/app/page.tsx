'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { sembrarDatosSiVacio } from '@/lib/seed';
import { descargarCatalogo } from '@/lib/sync';
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
    async function iniciar() {
      // Si hay internet y Firebase configurado, primero intenta traer
      // el catalogo real (lo que el administrador creo/edito en otro
      // dispositivo). Si no hay internet o no hay datos aun en la nube,
      // sigue funcionando con lo que ya tenga guardado localmente.
      await descargarCatalogo();
      await sembrarDatosSiVacio();
      setListo(true);
    }
    iniciar();
  }, []);

  async function ingresar() {
    if (!usuarioSeleccionado) return;
    const usuario = await db.usuarios.get(usuarioSeleccionado);
    if (!usuario || usuario.pin !== pin) {
      setError('PIN incorrecto');
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
    return <div className="p-8 text-center text-muted">Cargando...</div>;
  }

  return (
    <main className="max-w-sm mx-auto p-6 pt-16 flex flex-col gap-6 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-paper">Inventario</h1>
        <SyncIndicator />
      </div>

      {!usuarioSeleccionado ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted">¿Quién está realizando el conteo?</p>
          {(usuarios ?? []).map((u) => (
            <button
              key={u.id}
              onClick={() => setUsuarioSeleccionado(u.id)}
              className="w-full text-left px-5 py-4 rounded-2xl bg-surface-card border border-surface-border text-lg font-medium text-paper active:scale-[0.98] transition"
            >
              {u.nombre}
              <span className="block text-xs text-muted font-normal">{u.rol}</span>
            </button>
          ))}
          {(usuarios ?? []).length === 0 && (
            <p className="text-center text-muted py-6">No hay usuarios cargados todavía.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-muted">Ingresa tu PIN</p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError('');
            }}
            className="text-center text-3xl tracking-[0.5em] py-4 rounded-2xl border border-surface-border bg-surface-card text-paper"
            maxLength={6}
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
              setUsuarioSeleccionado(null);
              setPin('');
              setError('');
            }}
            className="text-muted text-sm"
          >
            ← Cambiar usuario
          </button>
        </div>
      )}
    </main>
  );
}
