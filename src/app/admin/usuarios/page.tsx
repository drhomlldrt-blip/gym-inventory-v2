'use client';

import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db, encolarOperacion } from '@/lib/db';
import { Usuario, Rol, Sucursal } from '@/types';
import SyncIndicator from '@/components/SyncIndicator';

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  const usuarios = useLiveQuery(async () => {
    const todos = await db.usuarios.toArray();
    return todos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  });
  const sucursales = useLiveQuery(() => db.sucursales.toArray());
  const conteos = useLiveQuery(() => db.conteos.toArray());

  useEffect(() => {
    const id = sessionStorage.getItem('usuarioActivoId');
    if (!id) router.push('/');
  }, [router]);

  async function alternarActivo(u: Usuario) {
    if (u.activo) {
      const ok = confirm(
        `¿Dar de baja a "${u.nombre}"? No podrá volver a iniciar sesión hasta que la reactives. Su historial de conteos se conserva.`
      );
      if (!ok) return;
    }
    const actualizado = { ...u, activo: !u.activo };
    await db.usuarios.put(actualizado);
    await encolarOperacion({ tipo: 'USUARIO', entidadId: u.id, accion: 'ACTUALIZAR', payload: actualizado });
  }

  async function eliminar(u: Usuario) {
    const tieneHistorial = (conteos ?? []).some((c) => c.usuarioId === u.id);
    if (tieneHistorial) {
      alert(
        `"${u.nombre}" ya tiene conteos guardados en el historial. Para no perder esos datos, se recomienda darla de baja en vez de eliminarla (usa el botón de estado).`
      );
      return;
    }
    if (!confirm(`¿Eliminar a "${u.nombre}" definitivamente?`)) return;
    await db.usuarios.delete(u.id);
    await encolarOperacion({ tipo: 'USUARIO', entidadId: u.id, accion: 'ELIMINAR', payload: {} });
  }

  const sucursalesActivas = (sucursales ?? []).filter((s) => s.activo);
  const sucursalesPorId = Object.fromEntries((sucursales ?? []).map((s) => [s.id, s.nombre]));

  return (
    <main className="max-w-md mx-auto p-4 pb-10 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Usuarios</h1>
        <SyncIndicator />
      </div>

      <div className="flex gap-3 text-sm flex-wrap">
        <button onClick={() => router.push('/admin/productos')} className="text-accent-hover underline">
          ← Productos
        </button>
        <button onClick={() => router.push('/admin/sucursales')} className="text-accent-hover underline">
          Gestionar sucursales →
        </button>
      </div>

      {sucursalesActivas.length === 0 ? (
        <div className="bg-brand-soft border border-brand/30 rounded-xl p-4 text-sm text-ink flex flex-col gap-2">
          <p>Primero crea al menos una sucursal para poder asignarle usuarios.</p>
          <button onClick={() => router.push('/admin/sucursales')} className="text-accent-hover underline text-left font-semibold">
            Ir a Sucursales →
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreando(true)}
          className="py-3 rounded-2xl bg-brand text-white font-semibold"
        >
          + NUEVO USUARIO
        </button>
      )}

      <div className="flex flex-col gap-5">
        {(sucursales ?? []).map((suc) => {
          const usuariosSucursal = (usuarios ?? []).filter((u) => u.sucursalId === suc.id);
          if (usuariosSucursal.length === 0) return null;
          return (
            <div key={suc.id} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-ink/60">{suc.nombre}</h2>
              {usuariosSucursal.map((u) => (
                <div key={u.id} className="bg-surface-card rounded-xl border border-surface-border p-4 flex items-center gap-2">
                  <button className="text-left flex-1" onClick={() => setEditando(u)}>
                    <p className="font-medium">
                      {u.nombre}
                      {u.rol === 'ADMINISTRADOR' && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-brand font-semibold align-middle">
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink/40">@{u.usuario}</p>
                  </button>
                  <button
                    onClick={() => alternarActivo(u)}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap ${
                      u.activo ? 'bg-accent-soft text-accent-hover' : 'bg-surface text-ink/40'
                    }`}
                  >
                    {u.activo ? 'Activo' : 'De baja'}
                  </button>
                  <button onClick={() => eliminar(u)} className="text-red-400 text-lg leading-none px-1">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          );
        })}
        {(usuarios ?? []).length === 0 && (
          <p className="text-center text-ink/40 py-6">No hay usuarios todavía.</p>
        )}
      </div>

      {(creando || editando) && (
        <FormularioUsuario
          usuarioExistente={editando ?? undefined}
          sucursales={sucursalesActivas}
          usuariosExistentes={usuarios ?? []}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}
    </main>
  );
}

function FormularioUsuario({
  usuarioExistente,
  sucursales,
  usuariosExistentes,
  onCerrar,
}: {
  usuarioExistente?: Usuario;
  sucursales: Sucursal[];
  usuariosExistentes: Usuario[];
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(usuarioExistente?.nombre ?? '');
  const [usuario, setUsuario] = useState(usuarioExistente?.usuario ?? '');
  const [contrasena, setContrasena] = useState(usuarioExistente?.pin ?? '');
  const [rol, setRol] = useState<Rol>(usuarioExistente?.rol ?? 'RECEPCIONISTA');
  const [sucursalId, setSucursalId] = useState(usuarioExistente?.sucursalId ?? sucursales[0]?.id ?? '');
  const [error, setError] = useState('');

  async function guardar() {
    if (!nombre.trim() || !usuario.trim() || !contrasena.trim()) {
      setError('Completa nombre, usuario y contraseña.');
      return;
    }
    if (contrasena.trim().length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    const usuarioNormalizado = usuario.trim().toLowerCase().replace(/\s+/g, '');
    const duplicado = usuariosExistentes.some(
      (u) => u.usuario.toLowerCase() === usuarioNormalizado && u.id !== usuarioExistente?.id
    );
    if (duplicado) {
      setError('Ese nombre de usuario ya está en uso.');
      return;
    }

    if (usuarioExistente) {
      const actualizado: Usuario = {
        ...usuarioExistente,
        nombre: nombre.trim(),
        usuario: usuarioNormalizado,
        pin: contrasena.trim(),
        rol,
        sucursalId,
      };
      await db.usuarios.put(actualizado);
      await encolarOperacion({ tipo: 'USUARIO', entidadId: actualizado.id, accion: 'ACTUALIZAR', payload: actualizado });
    } else {
      const nuevo: Usuario = {
        id: `user_${Date.now()}`,
        nombre: nombre.trim(),
        usuario: usuarioNormalizado,
        pin: contrasena.trim(),
        rol,
        sucursalId,
        activo: true,
      };
      await db.usuarios.add(nuevo);
      await encolarOperacion({ tipo: 'USUARIO', entidadId: nuevo.id, accion: 'CREAR', payload: nuevo });
    }
    onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end z-20">
      <div className="bg-surface-card rounded-t-3xl w-full max-w-md mx-auto p-5 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold">{usuarioExistente ? 'Editar usuario' : 'Nuevo usuario'}</h2>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/60">Nombre completo</label>
          <input
            placeholder="Ej. Camila Rojas"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface-card"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/60">Usuario (para iniciar sesión)</label>
          <input
            placeholder="Ej. camila"
            autoCapitalize="none"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface-card"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/60">Contraseña</label>
          <input
            type="text"
            placeholder="Mínimo 4 caracteres"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface-card"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/60">Sucursal</label>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface-card"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-ink/60">Rol</label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value as Rol)}
            className="px-4 py-3 rounded-xl border border-surface-border bg-surface-card"
          >
            <option value="RECEPCIONISTA">Recepcionista</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-3 rounded-xl border border-surface-border font-semibold">
            Cancelar
          </button>
          <button onClick={guardar} className="flex-1 py-3 rounded-xl bg-brand text-white font-semibold">
            GUARDAR
          </button>
        </div>
      </div>
    </div>
  );
}
