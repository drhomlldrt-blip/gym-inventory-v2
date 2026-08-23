'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { sembrarDatosSiVacio } from '@/lib/seed';
import { descargarCatalogo } from '@/lib/sync';
import {
  ModoDispositivo,
  obtenerModoDispositivo,
  establecerModoDispositivo,
  restablecerModoDispositivo,
} from '@/lib/deviceMode';
import SyncIndicator from '@/components/SyncIndicator';

type Paso = 'sucursal' | 'usuario' | 'pin';

export default function LoginPage() {
  const router = useRouter();
  const [listo, setListo] = useState(false);
  const [modo, setModo] = useState<ModoDispositivo | null>(null);
  const [paso, setPaso] = useState<Paso>('sucursal');
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const tapsRef = useRef(0);
  const tapsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sucursales = useLiveQuery(async () => {
    const todas = await db.sucursales.toArray();
    return todas.filter((s) => s.activo);
  });

  const usuarios = useLiveQuery(async () => {
    const todos = await db.usuarios.toArray();
    return todos.filter((u) => u.activo);
  });

  useEffect(() => {
    async function iniciar() {
      await descargarCatalogo();
      await sembrarDatosSiVacio();
      setModo(obtenerModoDispositivo());
      setListo(true);
    }
    iniciar();
  }, []);

  // Si solo hay una sucursal activa, nos saltamos ese paso.
  useEffect(() => {
    if (sucursales && sucursales.length === 1 && paso === 'sucursal') {
      setSucursalId(sucursales[0].id);
      setPaso('usuario');
    }
  }, [sucursales, paso]);

  // En dispositivos de recepción, nunca se muestran cuentas de administrador:
  // ni siquiera aparecen en la lista para intentar entrar con ellas.
  const usuariosVisibles = useMemo(() => {
    if (!usuarios) return [];
    if (modo === 'RECEPCION') return usuarios.filter((u) => u.rol === 'RECEPCIONISTA');
    return usuarios;
  }, [usuarios, modo]);

  const usuariosDeSucursal = useMemo(() => {
    return usuariosVisibles
      .filter((u) => !sucursalId || u.sucursalId === sucursalId)
      .filter((u) => u.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }, [usuariosVisibles, sucursalId, busqueda]);

  async function ingresar() {
    if (!usuarioSeleccionado) return;
    const usuario = await db.usuarios.get(usuarioSeleccionado);
    if (!usuario || usuario.pin !== pin) {
      setError('PIN incorrecto');
      return;
    }
    if (modo === 'RECEPCION' && usuario.rol === 'ADMINISTRADOR') {
      // Defensa extra por si el dato quedó en la lista por alguna sincronización a medias.
      setError('Este dispositivo es solo para recepción.');
      return;
    }
    sessionStorage.setItem('usuarioActivoId', usuario.id);
    if (usuario.rol === 'ADMINISTRADOR') {
      router.push('/admin/productos');
    } else {
      router.push('/count');
    }
  }

  // Gesto oculto: tocar el título 5 veces pide el PIN de un administrador
  // para reconfigurar el modo de este dispositivo (por si te equivocaste).
  function tocarTitulo() {
    tapsRef.current += 1;
    if (tapsTimeoutRef.current) clearTimeout(tapsTimeoutRef.current);
    tapsTimeoutRef.current = setTimeout(() => {
      tapsRef.current = 0;
    }, 1500);

    if (tapsRef.current >= 5) {
      tapsRef.current = 0;
      const intento = window.prompt('PIN de administrador para reconfigurar este dispositivo:');
      if (!intento) return;
      db.usuarios
        .where('rol')
        .equals('ADMINISTRADOR')
        .toArray()
        .then((admins) => {
          if (admins.some((a) => a.pin === intento && a.activo)) {
            restablecerModoDispositivo();
            setModo(null);
          } else {
            window.alert('PIN incorrecto.');
          }
        });
    }
  }

  if (!listo) {
    return <div className="p-8 text-center text-muted">Cargando...</div>;
  }

  if (modo === null) {
    return (
      <ConfiguracionDispositivo
        onElegir={(m) => {
          establecerModoDispositivo(m);
          setModo(m);
        }}
      />
    );
  }

  return (
    <main className="max-w-sm mx-auto p-6 pt-16 flex flex-col gap-6 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-paper select-none" onClick={tocarTitulo}>
          Inventario
        </h1>
        <SyncIndicator />
      </div>

      {paso === 'sucursal' && (
        <div className="flex flex-col gap-3">
          <p className="text-muted">¿En qué sucursal estás?</p>
          {(sucursales ?? []).map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSucursalId(s.id);
                setPaso('usuario');
              }}
              className="w-full text-left px-5 py-4 rounded-2xl bg-surface-card border border-surface-border text-lg font-medium text-paper active:scale-[0.98] transition"
            >
              {s.nombre}
            </button>
          ))}
          {(sucursales ?? []).length === 0 && (
            <p className="text-center text-muted py-6">No hay sucursales cargadas todavía.</p>
          )}
        </div>
      )}

      {paso === 'usuario' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-muted">¿Quién está realizando el conteo?</p>
            {(sucursales ?? []).length > 1 && (
              <button
                onClick={() => {
                  setSucursalId(null);
                  setBusqueda('');
                  setPaso('sucursal');
                }}
                className="text-xs text-muted underline"
              >
                Cambiar sucursal
              </button>
            )}
          </div>
          {(sucursales ?? []).length > 1 && (
            <input
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-card text-paper placeholder:text-muted"
            />
          )}
          {usuariosDeSucursal.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setUsuarioSeleccionado(u.id);
                setPaso('pin');
              }}
              className="w-full text-left px-5 py-4 rounded-2xl bg-surface-card border border-surface-border text-lg font-medium text-paper active:scale-[0.98] transition"
            >
              {u.nombre}
              {modo === 'ADMIN' && (
                <span className="block text-xs text-muted font-normal">
                  {u.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Recepcionista'}
                </span>
              )}
            </button>
          ))}
          {usuariosDeSucursal.length === 0 && (
            <p className="text-center text-muted py-6">No se encontraron usuarios.</p>
          )}
        </div>
      )}

      {paso === 'pin' && (
        <div className="flex flex-col gap-4">
          <p className="text-muted">Ingresa tu PIN</p>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/[^0-9]/g, ''));
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
              setPaso('usuario');
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

// Se muestra una sola vez por dispositivo (queda guardado en este navegador).
function ConfiguracionDispositivo({ onElegir }: { onElegir: (modo: ModoDispositivo) => void }) {
  return (
    <main className="max-w-sm mx-auto p-6 pt-20 flex flex-col gap-6 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-paper">¿Qué es este dispositivo?</h1>
        <p className="text-muted mt-2">
          Se configura una sola vez. Puedes cambiarlo después tocando el título 5 veces y
          escribiendo un PIN de administrador.
        </p>
      </div>

      <button
        onClick={() => onElegir('RECEPCION')}
        className="w-full text-left px-5 py-4 rounded-2xl bg-surface-card border border-surface-border active:scale-[0.98] transition"
      >
        <p className="text-lg font-medium text-paper">Celular de recepción</p>
        <p className="text-xs text-muted mt-1">
          Para las recepcionistas. Solo verán su propia cuenta, nunca la de administración.
        </p>
      </button>

      <button
        onClick={() => onElegir('ADMIN')}
        className="w-full text-left px-5 py-4 rounded-2xl bg-brand/15 border border-brand/40 active:scale-[0.98] transition"
      >
        <p className="text-lg font-medium text-brand">Mi dispositivo (administración)</p>
        <p className="text-xs text-muted mt-1">
          Tu computadora o tu celular personal. Acceso completo para crear y administrar.
        </p>
      </button>
    </main>
  );
}
