import { useState } from 'react';
import type { DatosRutaPRO } from './lib/rutapro';
import {
  construirResumenR, descargarExcel, fechaArchivo, filtrarPlan, programaParaExcel,
  type FiltrosMapa, type Plan, type FilaExcel,
} from './lib/reportes-rutapro';

type Props = {
  tipo: 'resumen' | 'programa' | 'ejecutivo';
  datos: DatosRutaPRO; plan: Plan; filtros: FiltrosMapa;
  frentesActivos: number; transitabilidad: boolean; pendiente: boolean;
};
export default function DescargaPlan(props: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const labels = {
    resumen: 'Descargar resumen', programa: 'Descargar programa',
    ejecutivo: '📄 Resumen ejecutivo',
  };
  async function descargar() {
    setOcupado(true);
    setError('');
    try {
      const fecha = fechaArchivo();
      const resumen = construirResumenR(props.plan);
      if (props.tipo === 'resumen') {
        await descargarExcel('Resumen_' + fecha + '.xlsx', [
          { nombre: 'Sheet1', filas: resumen },
        ]);
      } else if (props.tipo === 'programa') {
        await descargarExcel('Programa_' + fecha + '.xlsx', [
          { nombre: 'Sheet1', filas: programaParaExcel(props.plan, props.datos) },
        ]);
      } else {
        const filtrado = filtrarPlan(props.plan, props.filtros);
        const grupos = new Set(filtrado.map(r => r.Grupo));
        const ton = filtrado.reduce((s, r) => s + (r.tonPred ?? 0), 0);
        const area = filtrado.reduce((s, r) => s + (r.areaNeta ?? 0), 0);
        const resumenFiltrado = resumen.filter(r =>
          (!props.filtros.grupo.length || props.filtros.grupo.includes(String(r.Grupo))) &&
          (!props.filtros.alce.length || props.filtros.alce.includes('Todos') || props.filtros.alce.includes(r.Alce ?? '')));
        const kpis: FilaExcel[] = [
          { Indicador: 'Bloques', Valor: grupos.size },
          { Indicador: 'Toneladas', Valor: Math.round(ton) },
          { Indicador: 'Área (ha)', Valor: Number(area.toFixed(1)) },
          { Indicador: 'Tiempo total (h)', Valor: Number((ton / 60 + grupos.size).toFixed(1)) },
          { Indicador: 'Frentes activos', Valor: props.frentesActivos },
          { Indicador: 'Filtro Transitabilidad', Valor: props.transitabilidad ? 'Activo' : 'Inactivo' },
          { Indicador: 'Fecha', Valor: new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'medium',
          }).format(new Date()) },
        ];
        await descargarExcel('Reporte_Ejecutivo_' + fecha + '.xlsx', [
          { nombre: 'KPIs', filas: kpis },
          { nombre: 'Resumen', filas: resumenFiltrado },
          { nombre: 'Programa', filas: programaParaExcel(filtrado, props.datos) },
        ]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo generar el archivo.');
    } finally { setOcupado(false); }
  }
  return (
    <div>
      <button type="button" disabled={ocupado || props.pendiente}
        onClick={() => void descargar()}
        className="rutapro-descarga rounded-lg border px-400 py-200 text-300 font-semibold disabled:opacity-50">
        {ocupado ? 'Generando archivo…' : labels[props.tipo]}
      </button>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}
