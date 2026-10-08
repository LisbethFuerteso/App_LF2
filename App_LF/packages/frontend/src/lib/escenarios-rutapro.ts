import type { Parametros } from './plan-cosecha';
import type { Plan, ResumenR } from './reportes-rutapro';
import { construirResumenR } from './reportes-rutapro';
import { limpiarComentario } from './comentarios-rutapro';

export class EscenarioError extends Error {}
export interface Preset {
  version: 1;
  tipo: 'preset';
  nombre: string;
  fecha: string;
  parametros: Parametros;
  frentes: string[];
}
export interface Historial extends Omit<Preset, 'tipo'> {
  tipo: 'historial';
  plan: Plan;
  resumen: ResumenR[];
  pendiente: boolean;
  publicacionJson: string;
  kpis: { n_grupos: number; ton_total: number; area_total: number };
}
export type Escenario = Preset | Historial;

function fechaAhora() {
  const partes = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
  return parte('year') + '-' + parte('month') + '-' + parte('day') +
    ' ' + parte('hour') + ':' + parte('minute') + ':' + parte('second');
}
function nombreValido(nombre: string) {
  const limpio = limpiarComentario(nombre);
  if (!limpio) throw new EscenarioError('⚠️ Escribe un nombre.');
  return limpio;
}
export function capturarPreset(
  nombre: string, parametros: Parametros, frentes: string[],
): Preset {
  return {
    version: 1, tipo: 'preset', nombre: nombreValido(nombre),
    fecha: fechaAhora(), parametros: { ...parametros }, frentes: [...frentes],
  };
}
export function capturarHistorial(
  nombre: string, parametros: Parametros, frentes: string[],
  plan: Plan, pendiente: boolean, publicacionJson: string,
): Historial {
  const copia = structuredClone(plan);
  const asignadas = copia.filter(r => r.Grupo !== null);
  return {
    ...capturarPreset(nombre, parametros, frentes),
    tipo: 'historial', plan: copia, resumen: construirResumenR(copia),
    pendiente, publicacionJson,
    kpis: {
      n_grupos: new Set(asignadas.map(r => r.Grupo)).size,
      ton_total: asignadas.reduce((s, r) => s + (r.tonPred ?? 0), 0),
      area_total: asignadas.reduce((s, r) => s + (r.areaNeta ?? 0), 0),
    },
  };
}
function registro(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' &&
    !Array.isArray(v) && !(v instanceof Date);
}
const numero = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const enteroPositivo = (v: unknown) =>
  numero(v) && Number.isInteger(v) && v > 0;
const escalar = (v: unknown) =>
  v == null || typeof v === 'string' || typeof v === 'boolean' ||
  numero(v) || (v instanceof Date && Number.isFinite(v.getTime()));

function esFila(v: unknown): v is Plan[number] {
  if (!registro(v) || !Object.values(v).every(escalar)) return false;
  if (!(v.Grupo === null || enteroPositivo(v.Grupo)) ||
      (v.Tipo_Grupo !== null && v.Tipo_Grupo !== 'Fuerte' && v.Tipo_Grupo !== 'Débil') ||
      !(v.Orden_Cosecha === null || enteroPositivo(v.Orden_Cosecha))) return false;
  for (const k of ['hacienda', 'suerte', 'nombre', 'prioridad',
    'transitabilidad', 'Alce', 'Motivo_Revision']) {
    if (v[k] != null && typeof v[k] !== 'string') return false;
  }
  for (const k of ['lat', 'lng', 'edad', 'tonPred', 'areaNeta',
    'probabilidadIncendio', 'sacarosaPred', 'precipAyer',
    'precip2diasAtras', 'precip2diasAdelante']) {
    if (v[k] != null && !numero(v[k])) return false;
  }
  if (v.Grupo !== null) {
    if (!numero(v.lat) || Math.abs(v.lat) > 90 ||
        !numero(v.lng) || Math.abs(v.lng) > 180 ||
        !numero(v.tonPred) || v.tonPred <= 0 ||
        !enteroPositivo(v.Orden_Cosecha) ||
        typeof v.hacienda !== 'string' || !v.hacienda ||
        typeof v.suerte !== 'string' || !v.suerte) return false;
  }
  return true;
}
function esResumen(v: unknown): v is ResumenR {
  return registro(v) && Object.values(v).every(escalar) &&
    enteroPositivo(v.Grupo) && numero(v.n_filas) &&
    numero(v.n_haciendas) && numero(v.Ton_pred_total) &&
    numero(v.Area_Neta_total) && numero(v.Horas_estim) && numero(v.Dias_estim);
}
function esEscenario(v: unknown): v is Escenario {
  if (!registro(v) || v.version !== 1 ||
      (v.tipo !== 'preset' && v.tipo !== 'historial') ||
      typeof v.nombre !== 'string' || !v.nombre ||
      typeof v.fecha !== 'string' || !registro(v.parametros) ||
      !Array.isArray(v.frentes) || !v.frentes.every(f => typeof f === 'string'))
    return false;
  const p = v.parametros;
  if (![p.radio, p.minimo, p.objetivo, p.maximo].every(numero) ||
      typeof p.filtroTransitabilidad !== 'boolean') return false;
  if (v.tipo === 'preset') return true;
  if (!Array.isArray(v.plan) || !v.plan.every(esFila) ||
      !Array.isArray(v.resumen) || !v.resumen.every(esResumen) ||
      typeof v.pendiente !== 'boolean' || typeof v.publicacionJson !== 'string' ||
      !registro(v.kpis)) return false;
  return numero(v.kpis.n_grupos) && numero(v.kpis.ton_total) &&
    numero(v.kpis.area_total);
}
export function serializarEscenario(v: Escenario): string {
  return JSON.stringify(v, function (
    this: Record<string, unknown>, clave: string, valor: unknown,
  ) {
    const original = this[clave];
    return original instanceof Date
      ? { __rutaproFechaISO: original.toISOString() } : valor;
  });
}
export function deserializarEscenario(texto: string): Escenario {
  const valor: unknown = JSON.parse(texto, (clave: string, v: unknown) => {
    void clave;
    if (registro(v) && Object.keys(v).length === 1 &&
        typeof v.__rutaproFechaISO === 'string') {
      const fecha = new Date(v.__rutaproFechaISO);
      if (!Number.isFinite(fecha.getTime()))
        throw new EscenarioError('El escenario contiene una fecha inválida.');
      return fecha;
    }
    return v;
  });
  if (!esEscenario(valor))
    throw new EscenarioError('El escenario guardado no cumple el formato esperado.');
  const llaves = new Set<string>();
  if (valor.tipo === 'historial') {
    for (const r of valor.plan) {
      if (!r.hacienda || !r.suerte) continue;
      const llave = JSON.stringify([r.hacienda, r.suerte]);
      if (llaves.has(llave))
        throw new EscenarioError('El historial contiene Hacienda/Suerte repetidas.');
      llaves.add(llave);
    }
  }
  return valor;
}
