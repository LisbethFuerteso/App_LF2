import { useId, useState } from 'react';

type Opcion = { value: string; label: string };
type Props = {
  label: string;
  opciones: Opcion[];
  seleccion: string[];
  onChange: (values: string[]) => void;
};

export default function FiltroMapa({
  label, opciones, seleccion, onChange,
}: Props) {
  const id = useId();
  const [buscar, setBuscar] = useState('');
  const visibles = opciones.filter(o =>
    o.label.toLocaleLowerCase('es').includes(buscar.toLocaleLowerCase('es')));
  const texto = seleccion.length === 0 ? 'Ninguno seleccionado'
    : seleccion.length > 3 ? seleccion.length + ' seleccionados'
    : opciones.filter(o => seleccion.includes(o.value))
      .map(o => o.label).join(', ');

  return (
    <div className="rutapro-filtro-multiple">
      <label id={id}>{label}</label>
      <details>
        <summary aria-labelledby={id}>{texto}</summary>
        <div className="rutapro-filtro-opciones">
          <input type="search" value={buscar}
            aria-label={'Buscar en ' + label}
            placeholder="Buscar…"
            onChange={e => setBuscar(e.target.value)} />
          <div className="rutapro-filtro-acciones">
            <button type="button"
              onClick={() => onChange(opciones.map(o => o.value))}>
              Seleccionar todos
            </button>
            <button type="button" onClick={() => onChange([])}>
              Deseleccionar todos
            </button>
          </div>
          {visibles.map(o => (
            <label key={o.value}>
              <input type="checkbox" checked={seleccion.includes(o.value)}
                onChange={e => onChange(e.target.checked
                  ? [...seleccion, o.value]
                  : seleccion.filter(v => v !== o.value))} />
              {' '}{o.label}
            </label>
          ))}
          {!visibles.length && <p>Sin resultados</p>}
        </div>
      </details>
    </div>
  );
}
