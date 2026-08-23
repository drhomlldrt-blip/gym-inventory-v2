'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Sucursal, Usuario, Rol } from '@/types';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminSucursalesPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [expandida, setExpandida] = useState<string | null>(null);
  const [agregandoUsuarioEn, setAgregandoUsuarioEn] = useState<string | null>(null);
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
    setExpandida(suc.id);
  }

  async function alternarActivo(s: Sucursal) {
    const actualizado = { ...s, activo: !s.activo };
    await db.sucursales.put(actualizado);
    await encolarOperacion({ tipo: 'SUCURSAL', entidadId: s.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  async function alternarActivoUsuario(u: Usuario) {
    const actualizado = { ...u, activo: !u.activo };
    await db.usuarios.put(actualizado);
    await encolarOperacion({ tipo: 'USUARIO', entidadId: u.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4 min-h-screen bg-surface">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-paper">Sucursales</h1>
        <SyncIndicator />
      </div>

      <p className="text-sm text-muted">
        Cada sucursal comparte el mismo catálogo de productos, pero tiene sus propias
        recepcionistas y su propio historial de conteos.
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

      <div className="flex flex-col gap-3">
        {(sucursales ?? []).map((s) => {
          const usuariosSucursal = (usuarios ?? []).filter((u) => u.sucursalId === s.id);
          const abierta = expandida === s.id;
          return (
            <div key={s.id} className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
              <button
                onClick={() => setExpandida(abierta ? null : s.id)}
                className="w-full p-4 flex justify-between items-center"
              >
                <div className="text-left">
                  <p className="font-medium text-paper">{s.nombre}</p>
                  <p className="text-xs text-muted">
                    {usuariosSucursal.length} usuario{usuariosSucursal.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      alternarActivo(s);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold ${s.activo ? 'bg-brand/15 text-brand' : 'bg-surface-cardHeader text-muted'}`}
                  >
                    {s.activo ? 'ACTIVA' : 'INACTIVA'}
                  </span>
                  <span className="text-muted">{abierta ? '▲' : '▼'}</span>
                </div>
              </button>

              {abierta && (
                <div className="px-4 pb-4 flex flex-col gap-2 border-t border-surface-border pt-3">
                  {usuariosSucursal.map((u) => (
                    <div key={u.id} className="flex justify-between items-center bg-surface rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm text-paper">{u.nombre}</p>
                        <p className="text-xs text-muted">{u.rol} · PIN {u.pin}</p>
                      </div>
                      <button
                        onClick={() => alternarActivoUsuario(u)}
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${u.activo ? 'bg-brand/15 text-brand' : 'bg-surface-cardHeader text-muted'}`}
                      >
                        {u.activo ? 'ACTIVO' : 'INACTIVO'}
                      </button>
                    </div>
                  ))}
                  {usuariosSucursal.length === 0 && (
                    <p className="text-xs text-muted text-center py-2">Sin usuarios todavía.</p>
                  )}
                  <button
                    onClick={() => setAgregandoUsuarioEn(s.id)}
                    className="mt-1 py-2 rounded-lg bg-brand/15 text-brand text-sm font-semibold"
                  >
                    + Agregar recepcionista aquí
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {(sucursales ?? []).length === 0 && (
          <p className="text-center text-muted py-6">No hay sucursales todavía.</p>
        )}
      </div>

      {agregandoUsuarioEn && (
        <FormularioUsuarioRapido
          sucursalId={agregandoUsuarioEn}
          onCerrar={() => setAgregandoUsuarioEn(null)}
        />
      )}
    </main>
  );
}

function FormularioUsuarioRapido({
  sucursalId,
  onCerrar,
}: {
  sucursalId: string;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [rol, setRol] = useState<Rol>('RECEPCIONISTA');

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
        <h2 className="text-lg font-bold text-paper">Nueva recepcionista</h2>
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
        <div className="flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-3 rounded-xl border border-surface-border text-paper font-semibold">Cancelar</button>
          <button onClick={guardar} className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold">GUARDAR</button>
        </div>
      </div>
    </div>
  );
}
