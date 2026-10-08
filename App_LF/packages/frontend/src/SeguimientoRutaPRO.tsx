import { useState } from 'react';
import type { DatosRutaPRO } from './lib/rutapro';
import { redondearR } from './lib/reportes-rutapro';
import {
  calcularAlertas, indicadoresPlan, sugerenciasCalibracion,
  type DiferenciaPlan, type FilaSeguimiento,
} from './lib/seguimiento-rutapro';

const mostrar = (n: number, decimales = 0) =>
  new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: decimales,
  }).format(redondearR(n, decimales));

function Variacion({ valor, unidad, decimales = 0 }: {
  valor?: number; unidad: string; decimales?: number;
}) {
  if (valor == null || valor === 0) return null;
  return <small className="block text-300"
    style={{ color: valor > 0 ? '#117a65' : '#c0392b' }}>
    {valor > 0 ? '▲' : '▼'} {mostrar(Math.abs(valor), decimales)} {unidad}
  </small>;
}

export function KPIsRutaPRO({ filas, diferencia }: {
  filas: FilaSeguimiento[]; diferencia: DiferenciaPlan | null;
}) {
  const k = indicadoresPlan(filas);
  return <dl className="rutapro-kpis-superiores">
    <div>
      <dt className="text-300">Bloques</dt>
      <dd className="text-600 font-semibold">{mostrar(k.bloques)}</dd>
      <Variacion valor={diferencia?.bloques} unidad="bloques" />
    </div>
    <div>
      <dt className="text-300">Toneladas predichas</dt>
      <dd className="text-600 font-semibold">{mostrar(k.toneladas)}</dd>
      <Variacion valor={diferencia?.toneladas} unidad="ton" />
    </div>
    <div>
      <dt className="text-300">Área Neta conocida (ha)</dt>
      <dd className="text-600 font-semibold">{mostrar(k.area, 1)}</dd>
      <Variacion valor={diferencia?.area} unidad="ha" decimales={1} />
    </div>
    <div>
      <dt className="text-300">Tiempo total estimado</dt>
      <dd className="text-600 font-semibold">
        {mostrar(k.horas, 1)} h
      </dd>
      <small>~{mostrar(k.dias, 1)} días/frente</small>
    </div>
  </dl>;
}

export function PanelAlertasRutaPRO({ filas, columnas }: {
  filas: FilaSeguimiento[]; columnas: string[];
}) {
  if (!filas.length) return null;
  const alertas = calcularAlertas(filas, {
    vejez: columnas.includes('Vejez'),
    edadHoy: columnas.includes('Edad_hoy'),
  });
  const critico = alertas.find(a => a.clave === 'total')!.valor > 0;
  return <section aria-label="Panel de alertas" className="rounded-lg border p-400"
    style={{
      backgroundColor: critico ? '#fff5f0' : '#f0f9ff',
      borderColor: critico ? '#c0392b' : '#3498db',
    }}>
    <h3 className="font-semibold">🚨 PANEL DE ALERTAS</h3>
    <div className="flex flex-wrap gap-300">
      {alertas.map(a => <div key={a.clave} className="rounded p-300"
        style={{ backgroundColor: 'white', borderLeft: '3px solid ' + a.color }}>
        <p className="text-300">{a.etiqueta}</p>
        <p className="font-semibold" style={{ color: a.color }}>
          {mostrar(a.valor)} {a.unidad}
          <small className="ml-200">({a.suertes} suertes)</small>
        </p>
      </div>)}
    </div>
  </section>;
}

export function SugerenciasRutaPRO({ resumen, parametros }: {
  resumen: { Tipo_Grupo: string | null }[];
  parametros: { minimo: number; radio: number };
}) {
  const mensajes = sugerenciasCalibracion(resumen, parametros);
  if (!mensajes.length) return null;
  return <section aria-label="Sugerencias de calibración"
    className="rounded p-300"
    style={{ backgroundColor: '#fff8e1', borderLeft: '3px solid #f39c12' }}>
    {mensajes.map(m => <p key={m}>{m}</p>)}
  </section>;
}

export function DiagnosticoRutaPRO({ datos }: { datos: DatosRutaPRO }) {
  const [abierto, setAbierto] = useState(false);
  return <details className="rounded-lg border p-400"
    onToggle={event => setAbierto(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">
      Controles de calidad de la publicación
    </summary>
    <p>
      Perfil: {datos.publicacion.perfil ?? 'Sin dato'}.
      Backend completo: {datos.publicacion.backendCompleto === true ? 'Sí' : 'No'}.
      Apto operativo: {datos.publicacion.aptoOperativo === true ? 'Sí' : 'No'}.
    </p>
    <p>Fecha de corte: {
      datos.publicacion.fechaCorte instanceof Date
        ? datos.publicacion.fechaCorte.toISOString().slice(0, 10)
        : String(datos.publicacion.fechaCorte ?? 'Sin dato').slice(0, 10)
    }</p>
    {abierto && <div className="overflow-x-auto">
      <table aria-label="Controles de calidad"
        className="w-full text-left text-300">
        <thead><tr>
          <th scope="col">Módulo</th>
          <th scope="col">Estado</th>
          <th scope="col">Filas</th>
          <th scope="col">Detalle</th>
        </tr></thead>
        <tbody>{(datos.df_control_calidad ?? []).map((r, i) => <tr key={i}>
          <td className="p-200">{r.modulo ?? ''}</td>
          <td className="p-200">{r.estado ?? ''}</td>
          <td className="p-200">{r.filas ?? ''}</td>
          <td className="p-200">{r.detalle ?? ''}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </details>;
}
