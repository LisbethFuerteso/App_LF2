import TablaRutaPRO from './TablaRutaPRO';
import type { Plan } from './lib/reportes-rutapro';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { DatosRutaPRO } from './lib/rutapro';
import { RutaPRODataError } from './lib/rutapro';
import { cargarClima, type FilaClima } from './lib/clima-rutapro';
import { asignarAlces, MADURANTES_VERDE, MADURANTES_ROJO, UMBRAL_GD } from './lib/reglas-clima';
import { descargarExcel, fechaArchivo } from './lib/reportes-rutapro';

const HistogramaSDAM = lazy(() => import('./HistogramaSDAM'));
const MapaClimatico = lazy(() => import('./MapaClimatico'));
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
      <TablaRutaPRO nombre="Climaticas" fijas={4} filtrosColumnas
        columnas={columnas.map(([nombre]) => nombre)}
        filas={filas.map(r => Object.fromEntries(
          columnas.map(([nombre, key]) => [nombre, r[key] ?? null])
        ))}
        totales={{ Ton_pred: 1 }}
        fondo={(col, value) => fondo(
          columnas.find(([nombre]) => nombre === col)?.[1] ?? '',
          value,
        )} />
    </section>
  );
}
