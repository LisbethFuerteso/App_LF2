import { useId, useState } from 'react';
import type { Parametros } from './lib/plan-cosecha';
import type { Plan } from './lib/reportes-rutapro';
import { redondearR } from './lib/reportes-rutapro';
import type { EstadoEscenarios } from './hooks/use-escenarios';
import {
  capturarPreset, capturarHistorial, EscenarioError,
  type Preset, type Historial,
} from './lib/escenarios-rutapro';

const formato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
type Props = {
  estado: EstadoEscenarios; parametros: Parametros; frentes: string[];
  plan?: Plan; pendiente: boolean; publicacionJson: string;
  onPreset: (preset: Preset) => void;
  onHistorial: (historial: Historial) => void;
};

export function ControlesEscenarios(props: Props) {
  const { estado } = props;
  const id = useId();
  const [nombrePreset, setNombrePreset] = useState('');
  const [nombrePlan, setNombrePlan] = useState('');
  const [presetElegido, setPresetElegido] = useState('');
  const [planElegido, setPlanElegido] = useState('');
  const presets = estado.registros.filter((r): r is Preset => r.tipo === 'preset');
  const planes = estado.registros.filter((r): r is Historial => r.tipo === 'historial');
  const preset = presets.find(r => r.nombre === presetElegido) ?? presets[0];
  const historial = planes.find(r => r.nombre === planElegido) ?? planes[0];
  const ocupado = estado.pendiente || estado.cargando;

  async function guardar(tipo: 'preset' | 'historial') {
    try {
      const escenario = tipo === 'preset'
        ? capturarPreset(nombrePreset, props.parametros, props.frentes)
        : props.plan && capturarHistorial(nombrePlan, props.parametros,
            props.frentes, props.plan, props.pendiente, props.publicacionJson);
      if (!escenario) return;
      if (await estado.guardar(escenario)) {
        if (tipo === 'preset') { setNombrePreset(''); setPresetElegido(''); }
        else setNombrePlan('');
      }
    } catch (cause) {
      estado.mostrarError(cause instanceof EscenarioError
        ? cause.message : 'No se pudo preparar el escenario.');
    }
  }

  return (
    <div className="rutapro-escenarios">
      <section>
        <h3>💾 Presets</h3>
        <label htmlFor={id + '-preset-nombre'}>Nombre del preset</label>
        <input id={id + '-preset-nombre'} value={nombrePreset}
          onChange={e => setNombrePreset(e.target.value)} disabled={ocupado} />
        <div className="rutapro-escenarios-botones">
          <button type="button" disabled={ocupado} onClick={() => void guardar('preset')}>💾 Guardar</button>
          <button type="button" disabled={ocupado || !preset}
            onClick={() => { if (preset) props.onPreset(structuredClone(preset)); }}>📂 Cargar</button>
          <button type="button" disabled={ocupado || !preset}
            onClick={() => { if (preset) void estado.eliminar(preset); }}>🗑️ Eliminar</button>
        </div>
        {presets.length ? (
          <>
            <label htmlFor={id + '-preset'}>Preset guardado:</label>
            <select id={id + '-preset'} value={preset?.nombre ?? ''}
              disabled={ocupado} onChange={e => setPresetElegido(e.target.value)}>
              {presets.map(r => <option key={r.nombre}>{r.nombre}</option>)}
            </select>
          </>
        ) : !estado.cargando && <p>No hay presets guardados.</p>}
      </section>

      <section>
        <h3>🕓 Historial</h3>
        <label htmlFor={id + '-plan-nombre'}>Nombre del plan</label>
        <input id={id + '-plan-nombre'} value={nombrePlan}
          onChange={e => setNombrePlan(e.target.value)} disabled={ocupado} />
        <button type="button" disabled={ocupado || !props.plan}
          onClick={() => void guardar('historial')}>💾 Guardar en historial</button>
        {planes.length > 0 && (
          <>
            <label htmlFor={id + '-plan'}>Plan guardado:</label>
            <select id={id + '-plan'} value={historial?.nombre ?? ''}
              disabled={ocupado} onChange={e => setPlanElegido(e.target.value)}>
              {planes.map(r => <option key={r.nombre}>{r.nombre}</option>)}
            </select>
            <button type="button" disabled={ocupado || !historial}
              onClick={() => {
                if (historial) props.onHistorial(structuredClone(historial));
              }}>📂 Cargar seleccionado</button>
          </>
        )}
      </section>

      {estado.cargando && <p role="status">Leyendo presets e historial…</p>}
      {estado.pendiente && <p role="status">Guardando cambios…</p>}
      {estado.mensaje && <p role="status">{estado.mensaje}</p>}
      {estado.error && (
        <div>
          <p role="alert">{estado.error}</p>
          <button type="button" disabled={ocupado}
            onClick={estado.reintentar}>Reintentar lectura</button>
        </div>
      )}
    </div>
  );
}

export function HistorialEscenarios({ estado, onCargar }: {
  estado: EstadoEscenarios; onCargar: (historial: Historial) => void;
}) {
  const id = useId();
  const [seleccion, setSeleccion] = useState('');
  const [pagina, setPagina] = useState(0);
  const planes = estado.registros.filter((r): r is Historial => r.tipo === 'historial');
  const elegido = planes.find(r => r.nombre === seleccion) ?? planes[0];
  const ultima = Math.max(0, Math.ceil(planes.length / 10) - 1);
  const visible = Math.min(pagina, ultima);
  const ocupado = estado.cargando || estado.pendiente;

  return (
    <section className="rutapro-historial">
      <h3>Historial de planes guardados</h3>
      <div className="rutapro-escenarios-botones">
        <button type="button" disabled={ocupado || !elegido}
          onClick={() => { if (elegido) onCargar(structuredClone(elegido)); }}>📂 Cargar seleccionado</button>
        <button type="button" disabled={ocupado || !elegido}
          onClick={() => { if (elegido) void estado.eliminar(elegido); }}>🗑️ Eliminar seleccionado</button>
      </div>
      {!planes.length && !estado.cargando && <p>No hay planes guardados.</p>}
      <div className="overflow-x-auto">
        <table>
          <thead><tr>
            {['Nombre', 'Fecha', 'Bloques', 'Ton', 'Area_ha', 'Radio_km',
              'Min_ton', 'Target', 'Max_ton'].map(c => <th key={c}>{c}</th>)}
          </tr></thead>
          <tbody>{planes.slice(visible * 10, visible * 10 + 10).map(r => (
            <tr key={r.nombre}>
              <td><label>
                <input type="radio" name={id + '-fila'} checked={elegido?.nombre === r.nombre}
                  onChange={() => setSeleccion(r.nombre)} />{' '}{r.nombre}
              </label></td>
              <td>{r.fecha}</td>
              <td>{r.kpis.n_grupos}</td>
              <td>{formato.format(redondearR(r.kpis.ton_total, 0))}</td>
              <td>{formato.format(redondearR(r.kpis.area_total, 1))}</td>
              <td>{r.parametros.radio}</td><td>{r.parametros.minimo}</td>
              <td>{r.parametros.objetivo}</td><td>{r.parametros.maximo}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="rutapro-escenarios-botones">
        <button type="button" disabled={!visible} onClick={() => setPagina(visible - 1)}>Anterior</button>
        <span>Página {visible + 1} de {ultima + 1}</span>
        <button type="button" disabled={visible >= ultima} onClick={() => setPagina(visible + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
