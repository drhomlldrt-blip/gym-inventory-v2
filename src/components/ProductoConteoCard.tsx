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

// Jerarquia de color:
// - fondo tarjeta (surface-card) mas claro que el fondo de pantalla (surface)
// - encabezado (surface-cardHeader) mas oscuro, para separar nombre del contenido
// - etiquetas de columnas en "muted" (teal): informan, no compiten
// - valores que la recepcionista escribe en "paper" (casi blanco): maxima legibilidad
// - el TOTAL es el unico elemento en color calido (brand/naranja): el ojo va ahi
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

  const tieneDatos = total > 0 || paquetes > 0;

  return (
    <div
      className={`rounded-2xl overflow-hidden border bg-surface-card ${
        tieneDatos ? 'border-brand/40' : 'border-surface-border'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-surface-cardHeader">
        <h3 className="font-semibold text-paper tracking-wide text-sm uppercase">
          {producto.nombre}
        </h3>
        <button
          onClick={onLimpiar}
          aria-label={`Limpiar ${producto.nombre}`}
          className="text-muted text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>

      <div
        className="grid divide-x divide-surface-border"
        style={{ gridTemplateColumns: `repeat(${columnas.length + 1}, minmax(0, 1fr))` }}
      >
        {columnas.map((col) => (
          <div key={col.id} className="flex flex-col items-center py-3 px-1">
            <span className="text-[10px] uppercase tracking-wide text-muted mb-1 text-center">
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
              className="w-full bg-transparent text-center text-2xl font-bold text-paper outline-none [appearance:textfield]"
            />
          </div>
        ))}
        <div className="flex flex-col items-center py-3 px-1 bg-brand/10">
          <span className="text-[10px] uppercase tracking-wide text-brand font-semibold mb-1">
            Total
          </span>
          <span className="text-2xl font-extrabold text-brand">{total}</span>
        </div>
      </div>
    </div>
  );
}
