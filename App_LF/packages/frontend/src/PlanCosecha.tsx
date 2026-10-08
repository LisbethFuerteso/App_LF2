import {
  KPIsRutaPRO, PanelAlertasRutaPRO, SugerenciasRutaPRO, DiagnosticoRutaPRO,
} from './SeguimientoRutaPRO';
import {
  calcularDiferencia, type DiferenciaPlan,
} from './lib/seguimiento-rutapro';
import TablaRutaPRO from './TablaRutaPRO';
import DescargaPDF from './DescargaPDF';
import { capturarSlot, estadoSlot, type SlotAB } from './lib/comparador-rutapro';
import { ControlesEscenarios, HistorialEscenarios } from './GestionEscenarios';
import { useEscenarios } from './hooks/use-escenarios';
import type { Historial } from './lib/escenarios-rutapro';
import type { ResumenR } from './lib/reportes-rutapro';
import ManualRutaPRO from './ManualRutaPRO';
import MoverSuertes from './MoverSuertes';
import type { Importaciones } from './lib/mover-suerte';
import DescargaPlan from './DescargaPlan';
import {
  construirResumenR, filtrarPlan, filtrosIniciales, programaParaExcel,
} from './lib/reportes-rutapro';
import { lazy, Suspense, useId, useState } from 'react';
import type { DatosRutaPRO } from './lib/rutapro';
import { calcularPlan, parametrosIniciales, type Parametros } from './lib/plan-cosecha';

const ToneladasPorBloque = lazy(() => import('./ToneladasPorBloque'));
const ComparadorAB = lazy(() => import('./ComparadorAB'));
const ArbolDecision = lazy(() => import('./ArbolDecision'));
const MapaCosecha = lazy(() => import('./MapaCosecha'));
const ClimaCosecha = lazy(() => import('./ClimaCosecha'));

type Props = { datos: DatosRutaPRO };
type Plan = ReturnType<typeof calcularPlan<DatosRutaPRO['df_programa'][number]>>;
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const boton = 'rounded-lg border px-400 py-200 text-300 font-semibold disabled:opacity-50';

export default function PlanCosecha({ datos }: Props) {
  const frentes = datos.df_entrada_frentes;
  const [parametros, setParametros] = useState({ ...parametrosIniciales });
  const [activos, setActivos] = useState<string[]>(frentes.flatMap(f => f.alce ? [f.alce] : []));
  const [plan, setPlan] = useState<Plan>();
  const [diferencia, setDiferencia] = useState<DiferenciaPlan | null>(null);
  const [importaciones, setImportaciones] = useState<Importaciones>({});
  const [revisionPlan, setRevisionPlan] = useState(0);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState(0);
  const [filtros, setFiltros] = useState({ ...filtrosIniciales });
  const id = useId();
  const escenarios = useEscenarios();
  const [resumenHistorial, setResumenHistorial] = useState<ResumenR[]>();
  const [origenHistorial, setOrigenHistorial] = useState('');

  function cargarHistorial(h: Historial) {
    setDiferencia(calcularDiferencia(h.plan, plan));
    setPlan(h.plan);
    setResumenHistorial(h.resumen);
    setParametros(h.parametros);
    setActivos(h.frentes);
    setPendiente(h.pendiente);
    setImportaciones({});
    setRevisionPlan(n => n + 1);
    setError('');
    setOrigenHistorial('Plan basado en historial: ' + h.nombre + ' · ' + h.fecha);
    setFiltros({
      grupo: [...new Set(h.plan.flatMap(r => r.Grupo === null ? [] : [r.Grupo]))]
        .sort((a, b) => a - b).slice(0, 10).map(String),
      alce: ['Todos'], prioridad: ['Todas'],
    });
  }

  const [slotA, setSlotA] = useState<SlotAB>();
  const [slotB, setSlotB] = useState<SlotAB>();
  const [avisoSlot, setAvisoSlot] = useState('');

  function guardarSlot(nombre: 'A' | 'B') {
    if (!plan) return;
    const slot = capturarSlot(plan, parametros, activos);
    if (nombre === 'A') setSlotA(slot);
    else setSlotB(slot);
    setAvisoSlot('✓ Slot ' + nombre + ' guardado.');
  }
  const [arbolAbierto, setArbolAbierto] = useState(false);
  const pestanas = ['🗺️ Mapa', '📊 Resumen por Bloque', '📋 Detalle programa', '🆚 Comparador A/B', '🕓 Historial', '📖 Acerca y Manual', '🌡️ Monitoreo Climático'];

  function cambiar(key: keyof Parametros, value: number | boolean) {
    setParametros(p => ({ ...p, [key]: value }));
    setPendiente(true);
  }
  function calcular() {
    try {
      const resultado = calcularPlan(datos.df_programa,
        frentes.filter(f => f.alce && activos.includes(f.alce)), parametros);
      setDiferencia(calcularDiferencia(resultado, plan));
      setPlan(resultado);
      setResumenHistorial(undefined);
      setOrigenHistorial('');
      setImportaciones({});
      setRevisionPlan(n => n + 1);
      setError('');
      setPendiente(false);
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

  const resumenR = resumenHistorial ?? construirResumenR(plan ?? []);
  const resumenVisibleR = resumenR.filter(r =>
    (!filtros.grupo.length || filtros.grupo.includes(String(r.Grupo))) &&
    (!filtros.alce.length || filtros.alce.includes('Todos') || filtros.alce.includes(r.Alce ?? '')));
  const columnasResumen = Object.keys(resumenR[0] ?? {});
  const programaCompletoExcel = plan ? programaParaExcel(plan, datos) : [];
  const columnasPrograma = Object.keys(programaCompletoExcel[0] ?? {});
  const detalleExcel = plan
    ? programaParaExcel(filtrarPlan(plan, filtros, false), datos) : [];
  const campos = [
    ['radio', 'Radio máximo (km)', 1, 20, 0.5],
    ['minimo', 'Mínimo toneladas predichas', 500, 5000, 100],
    ['objetivo', 'Objetivo toneladas predichas', 2000, 10000, 500],
    ['maximo', 'Máximo toneladas predichas', 5000, 15000, 500],
  ] as const;
  return (
    
<section className="rutapro-plan-layout">
      {plan && <KPIsRutaPRO filas={asignadas} diferencia={diferencia} />}
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
      {plan && <SugerenciasRutaPRO resumen={resumenR} parametros={parametros} />}

      <ControlesEscenarios estado={escenarios}
        parametros={parametros} frentes={activos} plan={plan}
        pendiente={pendiente} publicacionJson={JSON.stringify(datos.publicacion)}
        onPreset={preset => {
          setParametros(preset.parametros);
          setActivos(preset.frentes);
          setPendiente(true);
          setError('');
        }}
        onHistorial={cargarHistorial} />

      <section className="rutapro-controles-ab">
        <h4 className="font-heading text-500">🆚 Comparador A/B</h4>
        <div className="rutapro-frentes-actions">
          <button type="button" className={boton} disabled={!plan}
            onClick={() => guardarSlot('A')}>📥 Guardar como A</button>
          <button type="button" className={boton} disabled={!plan}
            onClick={() => guardarSlot('B')}>📥 Guardar como B</button>
        </div>
        <p><b>A:</b> {estadoSlot(slotA)}<br /><b>B:</b> {estadoSlot(slotB)}</p>
        {avisoSlot && <p role="status">{avisoSlot}</p>}
      </section>
  </aside>
  <section className="rutapro-resultados rounded-xl border bg-card p-600 space-y-400">
    <button type="button" className={boton}
      onClick={() => setArbolAbierto(true)}>
      🌳 Ver árbol de decisión
    </button>
    {arbolAbierto && (
      <Suspense fallback={<p role="status">Preparando árbol de decisión…</p>}>
        <ArbolDecision onCerrar={() => setArbolAbierto(false)} />
      </Suspense>
    )}
    <DiagnosticoRutaPRO datos={datos} />
    {plan && <PanelAlertasRutaPRO filas={plan} columnas={columnasPrograma} />}
    {origenHistorial && <p role="status">{origenHistorial}</p>}
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


<DescargaPDF plan={plan} filtros={filtros} pendiente={pendiente} />
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
                onFiltros={setFiltros} />
            </Suspense>
              <MoverSuertes key={revisionPlan} plan={plan}
                radio={parametros.radio} importaciones={importaciones}
                onCambio={(nuevoPlan, nuevasImportaciones) => {
                  setPlan(nuevoPlan);
                  setResumenHistorial(undefined);
                  setImportaciones(nuevasImportaciones);
                }} />
            </div>

          </div>
          <div role="tabpanel" id={id + '-panel-1'}
            aria-labelledby={id + '-tab-1'} hidden={pestana !== 1}>
          <h3 className="font-heading text-500">📊 Resumen por Bloque</h3>
          <DescargaPlan tipo="resumen" datos={datos} plan={plan} filtros={filtros}
            frentesActivos={activos.length} transitabilidad={parametros.filtroTransitabilidad}
            pendiente={pendiente} />

          <Suspense fallback={<p role="status">Preparando gráfico de bloques…</p>}>
            {pestana === 1 && <ToneladasPorBloque filas={resumenVisibleR} />}
          </Suspense>
          <TablaRutaPRO key={'resumen-' + JSON.stringify(filtros)}
            nombre="Resumen" filas={resumenVisibleR}
            columnas={columnasResumen} fijas={3}
            enteras={['Grupo', 'n_filas', 'n_haciendas']}
            totales={{
              Ton_pred_total: 1, Area_Neta_total: 2, Horas_estim: 1,
            }}
            fondo={(col, value) => col === 'Tipo_Grupo'
              ? value === 'Fuerte' ? '#d4efdf'
                : value === 'Débil' ? '#fadbd8' : undefined
              : undefined} />

          </div>
          <div role="tabpanel" id={id + '-panel-2'}
            aria-labelledby={id + '-tab-2'} hidden={pestana !== 2}>
          <h3 className="font-heading text-500">📋 Detalle programa</h3>
          <DescargaPlan tipo="programa" datos={datos} plan={plan} filtros={filtros}
            frentesActivos={activos.length} transitabilidad={parametros.filtroTransitabilidad}
            pendiente={pendiente} />
          {!asignadas.length && <p>No hay candidatos elegibles para formar bloques.</p>}
          <TablaRutaPRO key={'programa-' + JSON.stringify(filtros)}
            nombre="Programa" filas={detalleExcel}
            columnas={columnasPrograma} fijas={2}
            enteras={[
              'Ano', 'Mes', 'Grupo', 'Orden_Cosecha', 'cultivo', 'Estado',
            ]} />
          </div>

          <div role="tabpanel" id={id + '-panel-3'}
            aria-labelledby={id + '-tab-3'} hidden={pestana !== 3}>
            {pestana === 3 && (
              <Suspense fallback={<p role="status">Preparando comparación A/B…</p>}>
                <ComparadorAB a={slotA} b={slotB} />
              </Suspense>
            )}
          </div>
          <div role="tabpanel" id={id + '-panel-4'}
            aria-labelledby={id + '-tab-4'} hidden={pestana !== 4}>
            <HistorialEscenarios estado={escenarios} onCargar={cargarHistorial} />
          </div>
          <div role="tabpanel" id={id + '-panel-5'}
            aria-labelledby={id + '-tab-5'} hidden={pestana !== 5}>
            <ManualRutaPRO />
          </div>
          <div role="tabpanel" id={id + '-panel-6'}
            aria-labelledby={id + '-tab-6'} hidden={pestana !== 6}>
            {pestana === 6 && (
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
