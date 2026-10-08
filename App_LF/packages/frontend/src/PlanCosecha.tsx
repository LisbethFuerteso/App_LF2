import MoverSuertes from './MoverSuertes';
import type { Importaciones } from './lib/mover-suerte';
import DescargaPlan from './DescargaPlan';
import {
  construirResumenR, filtrarPlan, filtrosIniciales,
} from './lib/reportes-rutapro';
import { lazy, Suspense, useId, useState } from 'react';
import type { DatosRutaPRO } from './lib/rutapro';
import { calcularPlan, parametrosIniciales, type Parametros } from './lib/plan-cosecha';

const MapaCosecha = lazy(() => import('./MapaCosecha'));
const ClimaCosecha = lazy(() => import('./ClimaCosecha'));

type Props = { datos: DatosRutaPRO };
type Plan = ReturnType<typeof calcularPlan<DatosRutaPRO['df_programa'][number]>>;
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const boton = 'rounded-lg border px-400 py-200 text-300 font-semibold disabled:opacity-50';
const celda = 'px-400 py-300';

export default function PlanCosecha({ datos }: Props) {
  const frentes = datos.df_entrada_frentes;
  const [parametros, setParametros] = useState({ ...parametrosIniciales });
  const [activos, setActivos] = useState<string[]>(frentes.flatMap(f => f.alce ? [f.alce] : []));
  const [plan, setPlan] = useState<Plan>();
  const [importaciones, setImportaciones] = useState<Importaciones>({});
  const [revisionPlan, setRevisionPlan] = useState(0);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  const [pagina, setPagina] = useState(0);
  const [pestana, setPestana] = useState(0);
  const [filtros, setFiltros] = useState({ ...filtrosIniciales });
  const id = useId();
  const pestanas = ['🗺️ Mapa', '📊 Resumen por Bloque', '📋 Detalle programa', '🌡️ Monitoreo Climático'];

  function cambiar(key: keyof Parametros, value: number | boolean) {
    setParametros(p => ({ ...p, [key]: value }));
    setPendiente(true);
  }
  function calcular() {
    try {
      const resultado = calcularPlan(datos.df_programa,
        frentes.filter(f => f.alce && activos.includes(f.alce)), parametros);
      setPlan(resultado);
      setImportaciones({});
      setRevisionPlan(n => n + 1);
      setError('');
      setPendiente(false);
      setPagina(0);
      setFiltros({
        grupo: [...new Set(resultado.flatMap(r =>
          r.Grupo === null ? [] : [r.Grupo]))]
          .sort((a, b) => a - b).slice(0, 10).map(String),
        alce: ['Todos'],
        prioridad: ['Todas'],
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo calcular el plan.');
    }
  }
  const asignadas = filtrarPlan(plan ?? [], filtros);

  const resumenR = construirResumenR(plan ?? []);
  const resumenVisibleR = resumenR.filter(r =>
    (!filtros.grupo.length || filtros.grupo.includes(String(r.Grupo))) &&
    (!filtros.alce.length || filtros.alce.includes('Todos') || filtros.alce.includes(r.Alce ?? '')));
  const columnasResumen = Object.keys(resumenR[0] ?? {});
  const detalle = [...filtrarPlan(plan ?? [], filtros, false)].sort((a, b) =>
    a.Grupo! - b.Grupo! || a.Orden_Cosecha! - b.Orden_Cosecha!);
  const campos = [
    ['radio', 'Radio máximo (km)', 1, 20, 0.5],
    ['minimo', 'Mínimo toneladas predichas', 500, 5000, 100],
    ['objetivo', 'Objetivo toneladas predichas', 2000, 10000, 500],
    ['maximo', 'Máximo toneladas predichas', 5000, 15000, 500],
  ] as const;
  return (
    
<section className="rutapro-plan-layout">
      {plan && (
          <dl className="rutapro-kpis-superiores">
            {[
              ['Bloques', new Set(asignadas.map(r => r.Grupo)).size],
              ['Toneladas predichas', asignadas.reduce((s, r) => s + (r.tonPred ?? 0), 0)],
              ['Área Neta conocida (ha)', asignadas.reduce((s, r) => s + (r.areaNeta ?? 0), 0)],
              ['Tiempo total estimado (h)', asignadas.reduce((s, r) => s + (r.tonPred ?? 0), 0) / 60 + new Set(asignadas.map(r => r.Grupo)).size],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-300">{label}</dt>
                <dd className="text-600 font-semibold">{numero.format(Number(value))}</dd>
              </div>
            ))}
          </dl>
      )}
  <aside className="rutapro-parametros rounded-xl border bg-card p-600 space-y-400">
      <h2 className="font-heading text-600">⚙️ Parámetros de bloqueo</h2>
      <p className="text-300">
        {datos.modo === 'validacion'
          ? 'Simulación para revisión. No habilita decisiones operativas.'
          : 'Cálculo sobre la publicación operativa vigente.'}
      </p>
      <div className="grid grid-cols-1 gap-400 md:grid-cols-4">
        {campos.map(([key, label, min, max, step]) => (
          <label key={key} className="text-300">
            {label}: <output>{numero.format(parametros[key])}</output>
            <input type="range" min={min} max={max} step={step}
              value={parametros[key]} onChange={e => cambiar(key, e.target.valueAsNumber)}
              className="mt-200 block w-full rounded-lg border p-300" />
          </label>
        ))}
      </div>

      <div>
        <p className="text-300">🚧 Filtro por Transitabilidad (Alta / Media alta)</p>
        <button type="button" className={boton + ' rutapro-transit'}
          aria-pressed={parametros.filtroTransitabilidad}
          onClick={() => cambiar('filtroTransitabilidad', !parametros.filtroTransitabilidad)}>
          {parametros.filtroTransitabilidad
            ? '🟢 Transitabilidad ACTIVA'
            : '⚫ Transitabilidad INACTIVA'}
        </button>
      </div>
      <fieldset className="rounded-lg border p-400">
        <legend className="text-300">🚛 Frentes (Alces) activos</legend>
        <div className="rutapro-frentes-actions">
          <button type="button" className={boton} onClick={() => {
            setActivos(frentes.flatMap(f => f.alce ? [f.alce] : []));
            setPendiente(true);
          }}>Seleccionar todos</button>
          <button type="button" className={boton} onClick={() => {
            setActivos([]);
            setPendiente(true);
          }}>Deseleccionar</button>
        </div>
        <div className="flex flex-wrap gap-400">
          {frentes.map((f, i) => f.alce && (
            <label key={i} className="text-300">
              <input type="checkbox" checked={activos.includes(f.alce)}
                onChange={e => {
                  setActivos(old => e.target.checked ? [...old, f.alce!] : old.filter(x => x !== f.alce));
                  setPendiente(true);
                }} />{' '}{f.alce}
            </label>
          ))}
        </div>
      </fieldset>
      <button className={boton} onClick={calcular}>🔄 Calcular plan</button>
      {pendiente && <p role="status" className="text-300">⚠️ Cambios sin aplicar</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}

  </aside>
  <section className="rutapro-resultados rounded-xl border bg-card p-600 space-y-400">
    {!plan && (
      <p className="text-300">
        Configure los parámetros y pulse 🔄 Calcular plan.
      </p>
    )}
      {plan && (
        <>

          <p className="text-300">
            {plan.filter(r => r.Motivo_Revision).length} registros requieren revisión por
            llave, coordenadas o toneladas inválidas.
            {' '}El máximo admite la excepción de misma hacienda definida en el R.
            {' '}Un frente puede atender varios bloques.
            {' '}Suertes sin asignar: {plan.filter(r => r.Grupo === null).length}.
          </p>


<DescargaPlan tipo="ejecutivo" datos={datos} plan={plan} filtros={filtros}
            frentesActivos={activos.length} transitabilidad={parametros.filtroTransitabilidad}
            pendiente={pendiente} />
          <div className="rutapro-tabs" role="tablist" aria-label="Vistas del plan">
            {pestanas.map((nombre, index) => (
              <button type="button" key={nombre} role="tab"
                id={id + '-tab-' + index}
                aria-controls={id + '-panel-' + index}
                aria-selected={pestana === index}
                tabIndex={pestana === index ? 0 : -1}
                onClick={() => setPestana(index)}
                onKeyDown={event => {
                  let siguiente = index;
                  if (event.key === 'ArrowRight') siguiente = (index + 1) % pestanas.length;
                  else if (event.key === 'ArrowLeft') siguiente = (index + pestanas.length - 1) % pestanas.length;
                  else if (event.key === 'Home') siguiente = 0;
                  else if (event.key === 'End') siguiente = pestanas.length - 1;
                  else return;
                  event.preventDefault();
                  setPestana(siguiente);
                  document.getElementById(id + '-tab-' + siguiente)?.focus();
                }}>
                {nombre}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={id + '-panel-0'}
            aria-labelledby={id + '-tab-0'} hidden={pestana !== 0}>
            <div className="rutapro-map-gestion">
            <Suspense fallback={<p role="status">Preparando mapa…</p>}>
              <MapaCosecha datos={datos} plan={plan} filtros={filtros} frentesActivos={activos}
                onFiltros={f => { setFiltros(f); setPagina(0); }} />
            </Suspense>
              <MoverSuertes key={revisionPlan} plan={plan}
                radio={parametros.radio} importaciones={importaciones}
                onCambio={(nuevoPlan, nuevasImportaciones) => {
                  setPlan(nuevoPlan);
                  setImportaciones(nuevasImportaciones);
                  setPagina(0);
                }} />
            </div>

          </div>
          <div role="tabpanel" id={id + '-panel-1'}
            aria-labelledby={id + '-tab-1'} hidden={pestana !== 1}>
          <h3 className="font-heading text-500">📊 Resumen por Bloque</h3>
          <DescargaPlan tipo="resumen" datos={datos} plan={plan} filtros={filtros}
            frentesActivos={activos.length} transitabilidad={parametros.filtroTransitabilidad}
            pendiente={pendiente} />

          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-300">
              <thead><tr>{columnasResumen.map(col =>
                <th key={col} scope="col" className={celda}>{col}</th>)}</tr></thead>
              <tbody>{resumenVisibleR.map(row => (
                <tr key={row.Grupo} className="border-b">
                  {columnasResumen.map(col => (
                    <td key={col} className={celda}
                      style={col === 'Tipo_Grupo' ? {
                        backgroundColor: row.Tipo_Grupo === 'Fuerte' ? '#d4efdf' : '#fadbd8',
                        fontWeight: 'bold',
                      } : undefined}>
                      {typeof row[col] === 'number'
                        ? numero.format(row[col] as number)
                        : String(row[col] ?? 'Sin dato')}
                    </td>
                  ))}
                </tr>
              ))}</tbody>
            </table>
          </div>

          </div>
          <div role="tabpanel" id={id + '-panel-2'}
            aria-labelledby={id + '-tab-2'} hidden={pestana !== 2}>
          <h3 className="font-heading text-500">📋 Detalle programa</h3>
          <DescargaPlan tipo="programa" datos={datos} plan={plan} filtros={filtros}
            frentesActivos={activos.length} transitabilidad={parametros.filtroTransitabilidad}
            pendiente={pendiente} />
          {!asignadas.length && <p>No hay candidatos elegibles para formar bloques.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-300">
              <thead><tr>
                {['Grupo', 'Tipo', 'Orden de cosecha', 'Alce', 'Hacienda', 'Nombre', 'Suerte', 'Toneladas predichas', 'Prioridad'].map(x =>
                  <th key={x} scope="col" className={celda}>{x}</th>)}
              </tr></thead>
              <tbody>{detalle.slice(pagina * 20, (pagina + 1) * 20).map(r => (
                <tr key={JSON.stringify([r.hacienda, r.suerte])} className="border-b">
                  {[r.Grupo, r.Tipo_Grupo, r.Orden_Cosecha, r.Alce, r.hacienda,
                    r.nombre, r.suerte, r.tonPred, r.prioridad].map((x, i) =>
                    <td key={i} className={celda}>{typeof x === 'number' ? numero.format(x) : x ?? 'Sin dato'}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex justify-between gap-300">
            <button className={boton} disabled={!pagina} onClick={() => setPagina(n => n - 1)}>Anterior</button>
            <span>Página {pagina + 1} de {Math.max(1, Math.ceil(detalle.length / 20))}</span>
            <button className={boton} disabled={(pagina + 1) * 20 >= detalle.length}
              onClick={() => setPagina(n => n + 1)}>Siguiente</button>
          </div>
          </div>
          <div role="tabpanel" id={id + '-panel-3'}
            aria-labelledby={id + '-tab-3'} hidden={pestana !== 3}>
            {pestana === 3 && (
              <Suspense fallback={<p role="status">Preparando monitoreo climático…</p>}>
                <ClimaCosecha datos={datos} frentesActivos={activos} plan={plan} />
              </Suspense>
            )}
          </div>
        </>
      )}
  </section>
    </section>
  );
}
