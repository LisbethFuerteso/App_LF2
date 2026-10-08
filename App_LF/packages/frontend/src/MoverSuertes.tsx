import { useId, useState } from 'react';
import type { Plan } from './lib/reportes-rutapro';
import {
  claveMovimiento, moverSuerte, type Importaciones,
} from './lib/mover-suerte';

type Props = {
  plan: Plan;
  radio: number;
  importaciones: Importaciones;
  onCambio: (plan: Plan, importaciones: Importaciones) => void;
};
const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export default function MoverSuertes({
  plan, radio, importaciones, onCambio,
}: Props) {
  const id = useId();
  const [busqueda, setBusqueda] = useState('');
  const [llave, setLlave] = useState('');
  const [destino, setDestino] = useState('');
  const [aviso, setAviso] = useState({ error: false, texto: '' });

  const seleccion = plan.find(r => claveMovimiento(r) === llave);
  const texto = busqueda.trim().toLowerCase();
  const lista = plan.filter(r => r.Grupo !== null &&
    (!texto || [r.nombre, r.hacienda, r.suerte, r.prioridad]
      .some(x => String(x ?? '').toLowerCase().includes(texto))))
    .sort((a, b) => a.Grupo! - b.Grupo! ||
      a.Orden_Cosecha! - b.Orden_Cosecha!);
  const grupos = [...new Set(plan.flatMap(r =>
    r.Grupo === null ? [] : [r.Grupo]))].sort((a, b) => a - b);

  function cancelar() {
    setLlave('');
    setDestino('');
    setAviso({ error: false, texto: '' });
  }
  function mover() {
    const resultado = moverSuerte(
      plan, llave, Number(destino), radio, importaciones,
    );
    setAviso({ error: !resultado.ok, texto: resultado.mensaje });
    if (resultado.ok) {
      onCambio(resultado.plan, resultado.importaciones);
      setLlave('');
      setDestino('');
    }
  }

  return (
    <section className="rutapro-mover" aria-labelledby={id + '-titulo'}>
      <h4 id={id + '-titulo'}>✏️ Mover suertes entre grupos</h4>
      <p>
        Selecciona una suerte de la lista y elige el grupo destino.
        <strong> Máximo 3 importaciones por grupo.</strong>
        {' '}Solo se permiten suertes dentro del radio.
      </p>
      <input aria-label="Buscar suerte para mover" type="search"
        placeholder="🔍 Buscar por nombre, hacienda, suerte..."
        value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      <div className="rutapro-mover-lista">
        {lista.map(r => {
          const key = claveMovimiento(r);
          return (
            <button type="button" key={key} aria-pressed={key === llave}
              onClick={() => {
                setLlave(old => old === key ? '' : key);
                setDestino('');
                setAviso({ error: false, texto: '' });
              }}>
              <strong>G{r.Grupo} ({r.Tipo_Grupo})</strong>
              {(importaciones[r.Grupo!] ?? 0) > 0 &&
                <span> · {importaciones[r.Grupo!]} / 3 imp.</span>}
              <span className="rutapro-mover-fila">
                #{r.Orden_Cosecha} · {r.nombre} - S{r.suerte}
                {' · '}{r.hacienda} · {formato.format(r.tonPred ?? 0)} t
              </span>
            </button>
          );
        })}
        {!lista.length && <p>No hay suertes para mostrar.</p>}
      </div>
      {seleccion ? (
        <div className="rutapro-mover-accion">
          <strong>{seleccion.nombre} — S{seleccion.suerte}</strong>
          <p>Hacienda: {seleccion.hacienda} · Grupo actual: {seleccion.Grupo}</p>
          <label htmlFor={id + '-destino'}>Grupo destino</label>
          <select id={id + '-destino'} value={destino}
            onChange={e => setDestino(e.target.value)}>
            <option value="">Seleccionar grupo</option>
            {grupos.filter(g => g !== seleccion.Grupo).map(g => {
              const row = plan.find(r => r.Grupo === g)!;
              return <option key={g} value={g}>
                G{g} ({row.Tipo_Grupo}) — {importaciones[g] ?? 0}/3 imp.
              </option>;
            })}
          </select>
          <div className="rutapro-mover-botones">
            <button type="button" disabled={!destino} onClick={mover}>
              🔀 Mover suerte
            </button>
            <button type="button" onClick={cancelar}>✖ Cancelar</button>
          </div>
        </div>
      ) : <p>Haz clic en una suerte para seleccionarla.</p>}
      {aviso.texto &&
        <p role={aviso.error ? 'alert' : 'status'}>{aviso.texto}</p>}
    </section>
  );
}
