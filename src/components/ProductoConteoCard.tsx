'use client';

import { Producto, Ubicacion, CantidadesPorUbicacion, calcularTotalItem } from '@/types';

interface Props {
  producto: Producto;
  ubicaciones: Ubicacion[];
  paquetes: number;
  cantidadesPorUbicacion: CantidadesPorUbicacion;
  onCambiarPaquetes: (valor: number) => void;
  onCambiarUbicacion: (ubicacionId: string, valor: number) => void;
  onLimpiar: () => void;
}

// Pantalla de conteo, estilo oscuro con cuadricula (sin boton "calcular").
export default function ProductoConteoCard({
  producto,
  ubicaciones,
  paquetes,
  cantidadesPorUbicacion,
  onCambiarPaquetes,
  onCambiarUbicacion,
  onLimpiar,
}: Props) {
  const sinPaquete = producto.tipoPresentacion === 'UNIDAD';
  const total = calcularTotalItem(
    sinPaquete ? 0 : paquetes,
    producto.unidadesPorPaquete,
    cantidadesPorUbicacion
  );

  const ubicacionesDelProducto = ubicaciones.filter((u) =>
    producto.ubicacionesHabilitadas.includes(u.id)
  );

  const columnas = [
    ...(sinPaquete ? [] : [{ id: '__paquetes__', label: 'Paquete' }]),
    ...ubicacionesDelProducto.map((u) => ({ id: u.id, label: u.nombre })),
  ];

  function valorColumna(colId: string) {
    if (colId === '__paquetes__') return paquetes;
    return cantidadesPorUbicacion[colId] ?? 0;
  }

  function cambiarColumna(colId: string, valor: number) {
    if (colId === '__paquetes__') {
      onCambiarPaquetes(valor);
    } else {
      onCambiarUbicacion(colId, valor);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-surface-darkBorder bg-surface-darkCard">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-dark/50">
        <h3 className="font-semibold text-white tracking-wide text-sm uppercase">
          {producto.nombre}
        </h3>
        <button
          onClick={onLimpiar}
          aria-label={`Limpiar ${producto.nombre}`}
          className="text-white/40 text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>

      <div
        className="grid divide-x divide-surface-darkBorder"
        style={{ gridTemplateColumns: `repeat(${columnas.length + 1}, minmax(0, 1fr))` }}
      >
        {columnas.map((col) => (
          <div key={col.id} className="flex flex-col items-center py-3 px-1">
            <span className="text-[10px] uppercase tracking-wide text-white/40 mb-1 text-center">
              {col.label}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={valorColumna(col.id) || ''}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const raw = parseInt(e.target.value || '0', 10);
                cambiarColumna(col.id, Number.isNaN(raw) ? 0 : Math.max(0, raw));
              }}
              className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none [appearance:textfield]"
            />
          </div>
        ))}
        <div className="flex flex-col items-center py-3 px-1 bg-accent/15">
          <span className="text-[10px] uppercase tracking-wide text-accent mb-1">Total</span>
          <span className="text-2xl font-extrabold text-accent">{total}</span>
        </div>
      </div>
    </div>
  );
}
