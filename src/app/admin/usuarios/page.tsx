'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Usuario, Rol } from '@/types';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const usuarios = useLiveQuery(() => db.usuarios.toArray());
  const sucursales = useLiveQuery(() => db.sucursales.toArray());

  useEffect(() => {
    const id = sessionStorage.getItem('usuarioActivoId');
    if (!id) router.push('/');
  }, [router]);

  async function alternarActivo(u: Usuario) {
    const actualizado = { ...u, activo: !u.activo };
    await db.usuarios.put(actualizado);
    await encolarOperacion({ tipo: 'USUARIO', entidadId: u.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Usuarios</h1>
        <SyncIndicator />
      </div>

      <button
        onClick={() => setCreando(true)}
        className="py-3 rounded-2xl bg-brand text-white font-semibold"
      >
        + NUEVO USUARIO
      </button>

      <div className="flex flex-col gap-2">
        {(usuarios ?? []).map((u) => (
          <div key={u.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-paper">{u.nombre}</p>
              <p className="text-xs text-muted">{u.rol} · PIN {u.pin}</p>
            </div>
            <button
              onClick={() => alternarActivo(u)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${u.activo ? 'bg-brand/15 text-brand' : 'bg-surface-cardHeader text-muted'}`}
            >
              {u.activo ? 'ACTIVO' : 'INACTIVO'}
            </button>
          </div>
        ))}
      </div>

      {creando && (
        <FormularioUsuario
          sucursales={sucursales ?? []}
          onCerrar={() => setCreando(false)}
        />
      )}
    </main>
  );
}

function FormularioUsuario({
  sucursales,
  onCerrar,
}: {
  sucursales: { id: string; nombre: string }[];
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [rol, setRol] = useState<Rol>('RECEPCIONISTA');
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? 'suc_1');

  async function guardar() {
    if (!nombre.trim() || pin.trim().length < 4) {
      alert('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    const usuario: Usuario = {
      id: `user_${Date.now()}`,
      nombre: nombre.trim(),
      usuario: nombre.trim().toLowerCase().replace(/\s+/g, '.'),
      pin: pin.trim(),
      rol,
      sucursalId,
      activo: true,
    };
    await db.usuarios.add(usuario);
    await encolarOperacion({ tipo: 'USUARIO', entidadId: usuario.id, accion: 'CREAR', payload: usuario });
    onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end z-20">
      <div className="bg-surface-card rounded-t-3xl w-full max-w-md mx-auto p-5 flex flex-col gap-4 border-t border-surface-border">
        <h2 className="text-lg font-bold text-paper">Nuevo usuario</h2>
        <input
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper placeholder:text-muted"
        />
        <input
          placeholder="PIN (mínimo 4 dígitos)"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          maxLength={6}
          className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper placeholder:text-muted"
        />
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper">
          <option value="RECEPCIONISTA">Recepcionista</option>
          <option value="ADMINISTRADOR">Administrador</option>
        </select>
        <select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)} className="px-4 py-3 rounded-xl border border-surface-border bg-surface text-paper">
          {sucursales.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-3 rounded-xl border border-surface-border text-paper font-semibold">Cancelar</button>
          <button onClick={guardar} className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold">GUARDAR</button>
        </div>
      </div>
    </div>
  );
}
