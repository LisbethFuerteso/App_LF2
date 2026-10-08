import type { DatosRutaPRO } from './rutapro';
import type { calcularPlan } from './plan-cosecha';

export type Plan = ReturnType<typeof calcularPlan<DatosRutaPRO['df_programa'][number]>>;
export type FiltrosMapa = { grupo: string[]; alce: string[]; prioridad: string[] };
export const filtrosIniciales: FiltrosMapa = {
  grupo: [], alce: ['Todos'], prioridad: ['Todas'],
};
export type FilaExcel = Record<string, string | number | boolean | Date | null>;
export type ResumenR = FilaExcel & {
  Grupo: number; Tipo_Grupo: string | null; Alce: string | null;
  n_filas: number; n_haciendas: number;
  Ton_pred_total: number; Area_Neta_total: number;
  Horas_estim: number; Dias_estim: number;
};
const valido = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);

function redondear(n: number, decimales: number): number {
  const factor = 10 ** decimales;
  const valor = n * factor;
  const inferior = Math.floor(valor);
  const parte = valor - inferior;
  const tolerancia = Number.EPSILON * Math.max(1, Math.abs(valor)) * 2;
  const entero = Math.abs(parte - 0.5) <= tolerancia
    ? (inferior % 2 === 0 ? inferior : inferior + 1)
    : Math.round(valor);
  return entero / factor;
}
export function filtrarPlan(plan: Plan, filtros: FiltrosMapa, asignadas = true): Plan {
  return plan.filter(r =>
    (!asignadas || r.Grupo !== null) &&
    (!filtros.grupo.length || filtros.grupo.includes(String(r.Grupo))) &&
    (!filtros.alce.length || filtros.alce.includes('Todos') || filtros.alce.includes(r.Alce ?? '')) &&
    (!filtros.prioridad.length || filtros.prioridad.includes('Todas') || filtros.prioridad.includes(r.prioridad ?? '')));
}
export function construirResumenR(plan: Plan): ResumenR[] {
  const asignadas = plan.filter(r => r.Grupo !== null);
  const prioridades = [...new Set(asignadas.map(r => r.prioridad ?? 'Sin info'))].sort();
  const transitos = [...new Set(asignadas.map(r => r.transitabilidad ?? 'Sin info'))].sort();

  return [...new Set(asignadas.map(r => r.Grupo!))].sort((a, b) => a - b).map(g => {
    const rows = asignadas.filter(r => r.Grupo === g);
    const ton = rows.reduce((s, r) => s + (r.tonPred ?? 0), 0);
    const ponderada = (key: keyof Plan[number]) => {
      let numerador = 0, denominador = 0;
      for (const r of rows) {
        const valor = r[key];
        if (valido(valor) && valido(r.tonPred)) {
          numerador += valor * r.tonPred;
          denominador += r.tonPred;
        }
      }
      return denominador > 0 ? redondear(numerador / denominador, 2) : null;
    };
    const resumen: ResumenR = {
      Grupo: g, Tipo_Grupo: rows[0].Tipo_Grupo, Alce: rows[0].Alce,
      n_filas: rows.length,
      n_haciendas: new Set(rows.map(r => r.hacienda)).size,
      Ton_pred_total: redondear(ton, 2),
      Area_Neta_total: redondear(rows.reduce((s, r) => s + (r.areaNeta ?? 0), 0), 2),
      Sacarosa_pred_pond: ponderada('sacarosaPred'),
      Edad_pond: ponderada('edad'),
      Precip_Ayer_pond: ponderada('precipAyer'),
      Precip_2dias_atras_pond: ponderada('precip2diasAtras'),
      Precip_2dias_adelante_pond: ponderada('precip2diasAdelante'),
      Horas_estim: redondear(ton / 60 + 1, 1),
      Dias_estim: redondear(ton / 960, 2),
    };
    for (const p of prioridades) {
      const subtotal = rows.filter(r => (r.prioridad ?? 'Sin info') === p)
        .reduce((s, r) => s + (r.tonPred ?? 0), 0);
      resumen['Prio_% ' + p] = ton > 0 ? redondear(subtotal / ton * 100, 2) : null;
    }
    for (const t of transitos) {
      const subtotal = rows.filter(r => (r.transitabilidad ?? 'Sin info') === t)
        .reduce((s, r) => s + (r.tonPred ?? 0), 0);
      resumen['Trans_% ' + t] = ton > 0 ? redondear(subtotal / ton * 100, 2) : null;
    }
    return resumen;
  });
}
function camel(nombre: string): string {
  const partes = nombre.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const pascal = partes.map(p => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('');
  return pascal[0].toLowerCase() + pascal.slice(1);
}
function valorExcel(value: unknown): string | number | boolean | Date | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date)
    return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  throw new Error('Se encontró un valor no exportable en el programa.');
}
export function programaParaExcel(plan: Plan, datos: DatosRutaPRO): FilaExcel[] {
  const contrato = datos.contrato.find(r => r.objeto === 'df_programa');
  if (!contrato?.columnasJson) throw new Error('Falta el contrato de columnas del programa.');
  const columnas: unknown = JSON.parse(contrato.columnasJson);
  if (!columnas || typeof columnas !== 'object' || Array.isArray(columnas))
    throw new Error('El contrato de columnas es inválido.');

  return plan.map(row => {
    const values: Record<string, unknown> = { ...row };
    const salida: FilaExcel = {};
    for (const [original, sql] of Object.entries(columnas)) {
      if (typeof sql !== 'string') throw new Error('Columna de contrato inválida.');
      if (original.startsWith('_') || original === '.id_unico') continue;
      const propiedad = camel(sql);
      if (!(propiedad in values))
        throw new Error('Falta una columna del programa: ' + original);
      salida[original] = valorExcel(values[propiedad]);
    }
    salida.Grupo = row.Grupo;
    salida.Tipo_Grupo = row.Tipo_Grupo;
    salida.Orden_Cosecha = row.Orden_Cosecha;
    salida.Alce = row.Alce;
    return salida;
  });
}
export async function descargarExcel(
  nombre: string, hojas: { nombre: string; filas: FilaExcel[]; columnas?: string[] }[],
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  for (const hoja of hojas) {
    const sheet = libro.addWorksheet(hoja.nombre);
    const columnas = hoja.columnas ?? [...new Set(hoja.filas.flatMap(r => Object.keys(r)))];
    sheet.addRow(columnas);
    sheet.getRow(1).font = { bold: true };
    for (const row of hoja.filas)
      sheet.addRow(columnas.map(c => row[c] ?? null));
    sheet.columns.forEach(c => { c.width = 20; });
  }
  const buffer = await libro.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Da tiempo al navegador para iniciar la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function fechaArchivo(): string {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value;
  return [parte('year'), parte('month'), parte('day')].join('-');
}
