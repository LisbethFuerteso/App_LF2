import type { Plan } from './lib/reportes-rutapro';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { DatosRutaPRO } from './lib/rutapro';
import { RutaPRODataError } from './lib/rutapro';
import { cargarClima, type FilaClima } from './lib/clima-rutapro';
import { asignarAlces, MADURANTES_VERDE, MADURANTES_ROJO, UMBRAL_GD } from './lib/reglas-clima';
import { descargarExcel, fechaArchivo } from './lib/reportes-rutapro';

const HistogramaSDAM = lazy(() => import('./HistogramaSDAM'));
const MapaClimatico = lazy(() => import('./MapaClimatico'));
const numero = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const boton = 'rounded-lg border px-400 py-200 text-300 font-semibold disabled:opacity-50';
const columnas = [
  ['Zona', 'zona'], ['Hacienda', 'hacienda'], ['Nombre', 'nombre'],
  ['Suerte', 'suerte'], ['Tenencia', 'tenencia'], ['Edad', 'edad'],
  ['Corte', 'corte'], ['TMin_ultimos30', 'tminUltimos30'],
  ['GD_hasta_hoy', 'gdHastaHoy'], ['Prioridad', 'prioridad'],
  ['Transitabilidad', 'transitabilidad'], ['Madurante', 'madurante'],
  ['SDAM', 'sdam'], ['Mes_Cosecha', 'mesCosecha'], ['Ton_pred', 'tonPred'],
  ['Sacarosa_pred', 'sacarosaPred'], ['Sacarosa_pred_sin', 'sacarosaPredSin'],
  ['Probabilidad_incendio', 'probabilidadIncendio'],
  ['Alce_cercano', 'Alce_cercano'], ['Dist_Alce_km', 'Dist_Alce_km'],
] as const;

type Props = { datos: DatosRutaPRO; frentesActivos: string[]; plan: Plan };

export default function ClimaCosecha({ datos, frentesActivos, plan }: Props) {
  const [lectura, setLectura] = useState<{
    datos: DatosRutaPRO; filas: FilaClima[]; error: string;
  } | null>(null);
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(0);
  const [orden, setOrden] = useState<{ key: string; asc: boolean } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState('');

  useEffect(() => {
    let active = true;
    cargarClima(datos).then(filas => {
      if (active) setLectura({ datos, filas, error: '' });
    }).catch(cause => {
      if (active) setLectura({
        datos, filas: [],
        error: cause instanceof RutaPRODataError
          ? cause.message : 'No se pudieron leer los datos climáticos.',
      });
    });
    return () => { active = false; };
  }, [datos]);

  const filas = useMemo(() => asignarAlces(
    lectura?.datos === datos ? lectura.filas : [],
    datos.df_entrada_frentes.filter(f => f.alce && frentesActivos.includes(f.alce)),
  ), [lectura, datos, frentesActivos]);

  const valoresSDAM = useMemo(() => filas.flatMap(r =>
    typeof r.sdam === 'number' && Number.isFinite(r.sdam) ? [r.sdam] : []
  ), [filas]);

  const visibles = useMemo(() => {
    const coincide = (value: unknown, filtro: string) =>
      String(value ?? '').toLocaleLowerCase('es')
        .includes(filtro.toLocaleLowerCase('es'));

    const result = filas.filter(r =>
      (!buscar || columnas.some(([, key]) => coincide(r[key], buscar))) &&
      columnas.every(([, key]) => !filtros[key] || coincide(r[key], filtros[key]))
    );

    if (orden) {
      const key = columnas.find(([, k]) => k === orden.key)?.[1];
      if (key) result.sort((a, b) => {
        const x = a[key], y = b[key];
        const cmp = x == null ? (y == null ? 0 : 1) : y == null ? -1 :
          typeof x === 'number' && typeof y === 'number' ? x - y :
          String(x).localeCompare(String(y), 'es');
        return orden.asc ? cmp : -cmp;
      });
    }
    return result;
  }, [filas, buscar, filtros, orden]);

  async function descargar() {
    setOcupado(true);
    setErrorDescarga('');
    try {
      await descargarExcel('Climaticas_' + fechaArchivo() + '.xlsx', [{
        nombre: 'Sheet1',
        columnas: columnas.map(([nombre]) => nombre),
        filas: filas.map(r => Object.fromEntries(
          columnas.map(([nombre, key]) => [nombre, r[key] ?? null])
        )),
      }]);
    } catch (cause) {
      setErrorDescarga(cause instanceof Error ? cause.message : 'No se pudo descargar.');
    } finally { setOcupado(false); }
  }

  function fondo(key: string, value: unknown) {
    if (key === 'madurante' && typeof value === 'string') {
      if (MADURANTES_VERDE.includes(value)) return '#d4efdf';
      if (MADURANTES_ROJO.includes(value)) return '#fadbd8';
    }
    if (key === 'gdHastaHoy' && typeof value === 'number')
      return value > UMBRAL_GD ? '#d4efdf' : '#fadbd8';
    if (key === 'transitabilidad') {
      const colores: Record<string, string> = {
        Alta: '#BBDEFB', 'Media alta': '#C8E6C9',
        'Media baja': '#FFF9C4', 'No transitable': '#FFCDD2',
      };
      return colores[String(value)];
    }
    return undefined;
  }

  if (lectura?.datos !== datos) return <p role="status">Leyendo y comprobando clima…</p>;
  if (lectura.error) return <p role="alert" className="text-destructive">{lectura.error}</p>;

  return (
    <section className="space-y-400" aria-label="Monitoreo Climático">
      <h3 className="font-heading text-500">🌡️ Monitoreo Climático</h3>

      <Suspense fallback={<p role="status">Preparando mapa climático…</p>}>
        <MapaClimatico datos={datos} filas={filas} frentesActivos={frentesActivos} plan={plan} />
      </Suspense>
      <h4 className="font-heading text-500">📊 Distribución de SDAM</h4>
      <Suspense fallback={<p role="status">Preparando histograma…</p>}>
        <HistogramaSDAM valores={valoresSDAM} />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-300">
        <h4 className="font-heading text-500">📋 Detalle climático</h4>
        <button type="button" className={boton + ' rutapro-descarga'}
          disabled={ocupado} onClick={() => void descargar()}>
          {ocupado ? 'Generando archivo…' : 'Descargar tabla'}
        </button>
      </div>
      {errorDescarga && <p role="alert" className="text-destructive">{errorDescarga}</p>}
      <label className="block text-300">
        Buscar:
        <input type="search" value={buscar} className="ml-200 rounded border p-200"
          onChange={e => { setBuscar(e.target.value); setPagina(0); }} />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-300">
          <thead>
            <tr>{columnas.map(([nombre, key]) => (
              <th key={key} scope="col" className="px-400 py-200"
                aria-sort={orden?.key === key
                  ? (orden.asc ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => {
                  setOrden({ key, asc: orden?.key === key ? !orden.asc : true });
                  setPagina(0);
                }}>{nombre}</button>
              </th>
            ))}</tr>
            <tr>{columnas.map(([nombre, key]) => (
              <th key={key} className="px-400 py-200">
                <input type="search" aria-label={'Filtrar ' + nombre}
                  value={filtros[key] ?? ''} className="w-32 rounded border p-200"
                  onChange={e => {
                    setFiltros(old => ({ ...old, [key]: e.target.value }));
                    setPagina(0);
                  }} />
              </th>
            ))}</tr>
          </thead>
          <tbody>{visibles.slice(pagina * 10, (pagina + 1) * 10).map(r => (
            <tr key={JSON.stringify([r.hacienda, r.suerte])} className="border-b">
              {columnas.map(([, key]) => (
                <td key={key} className="px-400 py-200" style={{
                  backgroundColor: fondo(key, r[key]),
                  fontWeight: ['madurante', 'transitabilidad'].includes(key)
                    ? 'bold' : undefined,
                }}>
                  {typeof r[key] === 'number' ? numero.format(r[key] as number)
                    : String(r[key] ?? '')}
                </td>
              ))}
            </tr>
          ))}</tbody>
          <tfoot><tr>{columnas.map(([, key], i) => (
            <th key={key} className="px-400 py-200" style={{ background: '#ecf0f1' }}>
              {i === 0 ? 'TOTAL' : key === 'tonPred'
                ? new Intl.NumberFormat('es-CO', {
                    minimumFractionDigits: 1, maximumFractionDigits: 1,
                  }).format(filas.reduce((s, r) => s + (r.tonPred ?? 0), 0))
                : ''}
            </th>
          ))}</tr></tfoot>
        </table>
      </div>
      <div className="flex justify-between gap-300">
        <button className={boton} disabled={!pagina}
          onClick={() => setPagina(n => n - 1)}>Anterior</button>
        <span>{visibles.length} registros · Página {pagina + 1} de {
          Math.max(1, Math.ceil(visibles.length / 10))
        }</span>
        <button className={boton} disabled={(pagina + 1) * 10 >= visibles.length}
          onClick={() => setPagina(n => n + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
