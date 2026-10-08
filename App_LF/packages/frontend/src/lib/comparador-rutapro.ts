import type { Plan } from './reportes-rutapro';
import { redondearR } from './reportes-rutapro';
import type { Parametros } from './plan-cosecha';

export interface SlotAB {
  plan: Plan;
  parametros: Pick<Parametros, 'radio' | 'minimo' | 'objetivo' | 'maximo'>;
  frentes: string[];
  fecha: string;
}

export const indicadoresAB = [
  'Bloques', 'Toneladas', 'Área (ha)', '% Fuertes',
  'Radio (km)', 'Min ton', 'Target ton', 'Max ton',
];

export function capturarSlot(
  plan: Plan, parametros: Parametros, frentes: string[],
): SlotAB {
  return {
    plan: structuredClone(plan),
    parametros: {
      radio: parametros.radio, minimo: parametros.minimo,
      objetivo: parametros.objetivo, maximo: parametros.maximo,
    },
    frentes: [...frentes],
    fecha: new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    }).format(new Date()),
  };
}

export function estadoSlot(slot?: SlotAB): string {
  if (!slot) return 'Vacío';
  const grupos = new Set(
    slot.plan.flatMap(r => r.Grupo === null ? [] : [r.Grupo]),
  );
  return 'Plan ' + slot.fecha + ' · ' + grupos.size + ' grupos';
}

export function extraerIndicadores(slot?: SlotAB): (number | null)[] {
  if (!slot) return Array.from({ length: 8 }, () => null);
  const filas = slot.plan.filter(r => r.Grupo !== null);
  const grupos = new Map<string, Plan[number]['Tipo_Grupo']>();
  for (const r of filas) {
    grupos.set(JSON.stringify([r.Grupo, r.Tipo_Grupo]), r.Tipo_Grupo);
  }
  const fuertes = [...grupos.values()].filter(v => v === 'Fuerte').length;
  return [
    grupos.size,
    redondearR(filas.reduce((s, r) => s + (r.tonPred ?? 0), 0), 0),
    redondearR(filas.reduce((s, r) => s + (r.areaNeta ?? 0), 0), 1),
    redondearR(fuertes / Math.max(1, grupos.size) * 100, 1),
    slot.parametros.radio, slot.parametros.minimo,
    slot.parametros.objetivo, slot.parametros.maximo,
  ];
}

const formatoDelta = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});
export function deltaAB(a: number | null, b: number | null): string {
  if (a === null || b === null) return '—';
  const diferencia = b - a;
  const signo = diferencia > 0 ? '▲' : diferencia < 0 ? '▼' : '=';
  return signo + ' ' + formatoDelta.format(redondearR(Math.abs(diferencia), 1));
}
