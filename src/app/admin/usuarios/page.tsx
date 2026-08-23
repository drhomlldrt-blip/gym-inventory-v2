'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Usuario, Rol } from '@/types';
import { verificarEsAdmin } from '@/lib/auth-guard';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [sucursalFiltro, setSucursalFiltro] = useState<string | 'TODAS'>('TODAS');
  const usuarios = useLiveQuery(() => db.usuarios.toArray());
  const sucursales = useLiveQuery(() => db.sucursales.toArray());
  const conteos = useLiveQuery(() => db.conteos.toArray());

  useEffect(() => {
    verificarEsAdmin(router);
  }, [router]);

  async function alternarActivo(u: Usuario) {
    const actualizado = { ...u, activo: !u.activo };
    await db.usuarios.put(actualizado);
    await encolarOperacion({ tipo: 'USUARIO', entidadId: u.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  async function eliminar(u: Usuario) {
    const tieneHistorial = (conteos ?? []).some((c) => c.usuarioId === u.id);
    if (tieneHistorial) {
      alert(
        `"${u.nombre}" ya tiene conteos guardados en el historial. Para no perder ese registro, se recomienda desactivarlo en vez de eliminarlo (usa el botón ACTIVO/INACTIVO).`
      );
      return;
    }
    if (!confirm(`¿Eliminar a "${u.nombre}" definitivamente?`)) return;
    await db.usuarios.delete(u.id);
    await encolarOperacion({ tipo: 'USUARIO', entidadId: u.id, accion: 'ELIMINAR', payload: {} });
  }

  const usuariosFiltrados = useMemo(() => {
    if (!usuarios) return [];
    return usuarios.filter((u) => {
      const coincideSucursal = sucursalFiltro === 'TODAS' || u.sucursalId === sucursalFiltro;
      const coincideBusqueda = u.nombre.toLowerCase().includes(busqueda.toLowerCase());
      return coincideSucursal && coincideBusqueda;
    });
  }, [usuarios, sucursalFiltro, busqueda]);

  const nombreSucursal = (id: string) => sucursales?.find((s) => s.id === id)?.nombre ?? id;

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

      <input
        placeholder="Buscar por nombre..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-card text-paper placeholder:text-muted"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSucursalFiltro('TODAS')}
          className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${sucursalFiltro === 'TODAS' ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
        >
          Todas las sucursales
        </button>
        {(sucursales ?? []).map((s) => (
          <button
            key={s.id}
            onClick={() => setSucursalFiltro(s.id)}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${sucursalFiltro === s.id ? 'bg-brand text-white' : 'bg-surface-card border border-surface-border text-slate-300'}`}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {usuariosFiltrados.map((u) => (
          <div key={u.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex justify-between items-center gap-2">
            <div>
              <p className="font-medium text-paper">{u.nombre}</p>
              <p className="text-xs text-muted">
                {u.rol} · PIN {u.pin} · {nombreSucursal(u.sucursalId)}
              </p>
            </div>
            <button
              onClick={() => alternarActivo(u)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${u.activo ? 'bg-brand/15 text-brand' : 'bg-surface-cardHeader text-muted'}`}
            >
              {u.activo ? 'ACTIVO' : 'INACTIVO'}
            </button>
            <button onClick={() => eliminar(u)} className="text-brand text-lg leading-none">
              ✕
            </button>
          </div>
        ))}
        {usuariosFiltrados.length === 0 && (
          <p className="text-center text-muted py-6">No se encontraron usuarios.</p>
        )}
      </div>

      {creando && (
        <FormularioUsuario
          sucursales={sucursales ?? []}
          sucursalPorDefecto={sucursalFiltro !== 'TODAS' ? sucursalFiltro : undefined}
          onCerrar={() => setCreando(false)}
        />
      )}
    </main>
  );
}

function FormularioUsuario({
  sucursales,
  sucursalPorDefecto,
  onCerrar,
}: {
  sucursales: { id: string; nombre: string }[];
  sucursalPorDefecto?: string;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [rol, setRol] = useState<Rol>('RECEPCIONISTA');
  const [sucursalId, setSucursalId] = useState(sucursalPorDefecto ?? sucursales[0]?.id ?? 'suc_1');

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
